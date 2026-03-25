# 文件中心 + 调度中心 — 设计方案

> 创建日期：2026-03-25
> 影响范围：后端（数据库新增表、Service/Controller 重构、定时任务）、前端（文件管理页重构、新增调度中心页）

## 一、现状分析

### 文件管理

| 组件 | 当前状态 | 问题 |
|------|----------|------|
| MinIO 存储 | ✅ 已集成 | 正常 |
| FileService | ✅ 上传/删除/列表 | 无数据库记录，无法追踪文件状态 |
| 文件元数据 | ❌ 无数据库表 | 删除文件后无法恢复，无法追踪孤儿文件 |
| 回收站 | ❌ 不存在 | 误删无法恢复 |
| 按桶管理 | ❌ 无 | 所有文件混在一个列表 |

### 定时任务

| 组件 | 当前状态 | 问题 |
|------|----------|------|
| SchedulingConfig | ✅ @EnableScheduling | 正常 |
| LogCleanupTask | ✅ API 日志 30 天清理 | 仅一个任务，无执行日志 |
| 任务执行日志 | ❌ 不存在 | 不知道任务是否成功执行 |
| 孤儿文件清理 | ❌ 不存在 | 被替换的文件（如旧头像）永远留在 MinIO |

## 二、数据库设计

### 2.1 文件记录表 `admin_file`

```sql
CREATE TABLE admin_file (
    id BIGSERIAL PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,        -- 原始文件名
    object_name VARCHAR(500) NOT NULL,      -- MinIO 对象路径
    bucket_name VARCHAR(100) NOT NULL,      -- 桶名
    url VARCHAR(1000),                      -- 访问 URL
    size BIGINT DEFAULT 0,                  -- 文件大小（字节）
    content_type VARCHAR(100),              -- MIME 类型
    category VARCHAR(50) DEFAULT 'general', -- 分类：avatar/general/document/image
    uploader_id BIGINT,                     -- 上传者 ID
    uploader_name VARCHAR(100),             -- 上传者用户名
    status VARCHAR(20) DEFAULT 'active',    -- 状态：active/deleted/recycled
    deleted_at TIMESTAMP,                   -- 移入回收站时间
    is_deleted INTEGER DEFAULT 0,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admin_file_status ON admin_file(status);
CREATE INDEX idx_admin_file_category ON admin_file(category);
CREATE INDEX idx_admin_file_bucket ON admin_file(bucket_name);
CREATE INDEX idx_admin_file_object ON admin_file(object_name);
CREATE INDEX idx_admin_file_uploader ON admin_file(uploader_id);
```

**文件状态流转**：
- `active` → 正常使用中
- `active` → `recycled` → 移入回收站（软删除，MinIO 文件保留）
- `recycled` → `active` → 从回收站恢复
- `recycled` → `deleted` → 彻底删除（同时删除 MinIO 文件）

### 2.2 定时任务执行日志表 `admin_task_log`

```sql
CREATE TABLE admin_task_log (
    id BIGSERIAL PRIMARY KEY,
    task_name VARCHAR(100) NOT NULL,        -- 任务名称
    task_group VARCHAR(50) DEFAULT 'system', -- 任务分组
    status VARCHAR(20) NOT NULL,            -- 状态：success/failed/running
    message TEXT,                           -- 执行结果/错误信息
    duration_ms BIGINT,                     -- 执行耗时（毫秒）
    detail TEXT,                            -- 详细信息（如清理了多少条记录）
    is_deleted INTEGER DEFAULT 0,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admin_task_log_name ON admin_task_log(task_name);
CREATE INDEX idx_admin_task_log_status ON admin_task_log(status);
CREATE INDEX idx_admin_task_log_create_time ON admin_task_log(create_time);
```

### 2.3 定时任务配置表 `admin_task_config`

```sql
CREATE TABLE admin_task_config (
    id BIGSERIAL PRIMARY KEY,
    task_name VARCHAR(100) NOT NULL UNIQUE,  -- 任务标识（英文，如 api-log-cleanup）
    task_label VARCHAR(100) NOT NULL,        -- 任务显示名（中文，如 API日志清理）
    task_group VARCHAR(50) DEFAULT 'system', -- 分组：system/file/log
    cron_expression VARCHAR(50) NOT NULL,    -- Cron 表达式
    enabled INTEGER DEFAULT 1,              -- 是否启用：1-启用 0-停用
    description VARCHAR(255),               -- 任务描述
    last_run_time TIMESTAMP,                -- 上次执行时间
    last_run_status VARCHAR(20),            -- 上次执行状态
    is_deleted INTEGER DEFAULT 0,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_admin_task_config_name ON admin_task_config(task_name);
```

**初始数据**（通过 Flyway 插入）：

```sql
INSERT INTO admin_task_config (task_name, task_label, task_group, cron_expression, description) VALUES
('api-log-cleanup', 'API日志清理', 'log', '0 0 3 * * ?', '清理超过保留天数的API请求日志'),
('operation-log-cleanup', '操作日志清理', 'log', '0 30 3 * * ?', '清理超过保留天数的操作审计日志'),
('login-log-cleanup', '登录日志清理', 'log', '0 0 4 * * ?', '清理超过保留天数的登录日志'),
('error-log-cleanup', '异常日志清理', 'log', '0 30 4 * * ?', '清理超过保留天数的异常日志'),
('orphan-file-scan', '孤儿文件扫描', 'file', '0 0 2 * * ?', '扫描无引用文件移入回收站'),
('recycle-bin-cleanup', '回收站清空', 'file', '0 0 5 * * SUN', '彻底删除回收站中超过保留天数的文件');
```

## 三、文件中心

### 3.1 后端 — FileService 重构

**核心变化**：所有文件操作同时写入 `admin_file` 表，实现可追踪、可恢复。

**Service 方法**：

| 方法 | 说明 |
|------|------|
| `uploadFile(file, category)` | 上传文件到 MinIO + 记录到 DB |
| `uploadAvatar(file)` | 上传头像（category=avatar） |
| `listFiles(bucket, category, status, keyword)` | 分页查询文件记录 |
| `recycleFile(id)` | 移入回收站（status→recycled） |
| `restoreFile(id)` | 从回收站恢复（status→active） |
| `deleteFile(id)` | 彻底删除（从 MinIO 删除 + DB 标记 deleted） |
| `listRecycledFiles()` | 查询回收站文件 |
| `emptyRecycleBin()` | 清空回收站（批量彻底删除） |
| `findOrphanFiles()` | 扫描 MinIO 与 DB 不一致的孤儿文件 |

### 3.2 后端 — FileController 重构

**路由前缀**：`/api/admin/files`

| 方法 | 路径 | operationId | 说明 |
|------|------|-------------|------|
| POST | `/upload` | `uploadFile` | 通用上传 |
| POST | `/upload/avatar` | `uploadAvatar` | 头像上传 |
| GET | `/` | `listFiles` | 分页查询（支持 bucket/category/status/keyword 筛选） |
| GET | `/{id}` | `getFileDetail` | 文件详情 |
| PUT | `/{id}/recycle` | `recycleFile` | 移入回收站 |
| PUT | `/{id}/restore` | `restoreFile` | 从回收站恢复 |
| DELETE | `/{id}` | `deleteFilePermanently` | 彻底删除 |
| GET | `/recycle-bin` | `listRecycleBin` | 回收站列表 |
| DELETE | `/recycle-bin` | `emptyRecycleBin` | 清空回收站 |
| GET | `/buckets` | `listBuckets` | 桶列表 |

### 3.3 前端 — 文件管理页重构

**页面结构**：
- **Tab 切换**：按桶 / 按分类（avatar/general/document/image）
- **文件列表**：表格展示，支持搜索、分类筛选
- **回收站 Tab**：展示已删除文件，支持恢复和彻底删除
- **文件详情弹窗**：预览 + 元信息 + 复制链接
- **批量操作**：批量删除到回收站、批量彻底删除

## 四、架构原则 — Service 层承载可复用业务逻辑

**核心问题**：孤儿文件扫描、回收站清理、日志清理等操作会被多处调用（定时任务自动触发 + 调度中心手动触发 + 文件中心页面按钮触发）。

**原则**：业务逻辑写在 **Service 层**，Task 和 Controller 只做调用方。

```
Service 层（业务逻辑唯一归属）
├── FileService.scanOrphanFiles()     — 孤儿文件扫描
├── FileService.emptyRecycleBin()     — 回收站清空
├── LogCleanService.cleanApiLogs()    — API 日志清理
├── LogCleanService.cleanLoginLogs()  — 登录日志清理
└── ...

调用方（不含业务逻辑，只做调度/触发）
├── DynamicTaskScheduler  → 从 DB 读 Cron，动态注册调度
├── TaskController        → POST /{taskName}/run 手动触发 Service 方法
└── FileController        → 文件中心页面按钮触发 Service 方法
```

**前端联动**：
| 页面 | 联动方式 |
|------|----------|
| API 日志页 | "查看清理记录" → 跳转调度中心，筛选 taskName=api-log-cleanup |
| 文件中心 | "扫描孤儿文件" 按钮 → 调用 `POST /tasks/orphan-file-scan/run` |
| 文件中心 | "清空回收站" 按钮 → 调用 `POST /tasks/recycle-bin-cleanup/run` |
| 文件中心 | "查看清理记录" → 跳转调度中心 |
| 调度中心 | 每个任务 "立即执行" 按钮 → 调用 `POST /tasks/{taskName}/run` |

**TaskController 手动触发实现**：

```java
@PostMapping("/{taskName}/run")
public R<Void> runTaskManually(@PathVariable String taskName) {
    // 通过 taskName 映射到对应 Service 方法
    switch (taskName) {
        case "api-log-cleanup" -> logCleanService.cleanApiLogs();
        case "orphan-file-scan" -> fileService.scanOrphanFiles();
        case "recycle-bin-cleanup" -> fileService.emptyRecycleBin();
        // ...
    }
    return R.ok();
}
```

所有执行（无论定时还是手动）都通过 `TaskLogService` 记录执行日志。

---

## 五、调度中心 — 动态调度方案

### 5.1 技术方案：`SchedulingConfigurer` + 数据库

**不使用 `@Scheduled` 注解**，改为 Spring 的 `SchedulingConfigurer` 接口，从 `admin_task_config` 表动态读取 Cron。

**核心优势**：
- Cron 存在数据库，前端直接修改，**实时生效无需重启**
- 任务在线启用/停用
- 每次触发前重新读 DB，所以修改后下一次执行就用新 Cron

### 5.2 DynamicTaskScheduler

```java
@Component
public class DynamicTaskScheduler implements SchedulingConfigurer {
    @Override
    public void configureTasks(ScheduledTaskRegistrar registrar) {
        // 从 DB 加载所有 enabled 任务
        for (AdminTaskConfig task : tasks) {
            registrar.addTriggerTask(
                () -> taskExecutorService.execute(task.getTaskName()),
                triggerContext -> {
                    // 每次触发前从 DB 读最新 Cron（动态更新）
                    AdminTaskConfig latest = reload(task.getTaskName());
                    if (latest == null || latest.getEnabled() != 1) return null;
                    return new CronTrigger(latest.getCronExpression())
                        .nextExecution(triggerContext);
                }
            );
        }
    }
}
```

### 5.3 TaskExecutorService — 统一执行入口

所有任务执行（定时+手动）经过此 Service，统一记录日志：

```java
@Service
public class TaskExecutorService {
    public void execute(String taskName) {
        Long logId = taskLogService.startTask(taskName);
        try {
            String detail = switch (taskName) {
                case "api-log-cleanup" -> logCleanService.cleanApiLogs();
                case "orphan-file-scan" -> fileService.scanOrphanFiles();
                case "recycle-bin-cleanup" -> fileService.emptyRecycleBin();
                // ...
            };
            taskLogService.finishTask(logId, detail);
        } catch (Exception e) {
            taskLogService.failTask(logId, e.getMessage());
        }
    }
}
```

### 5.4 定时任务清单

| 任务名 | Cron | 说明 | 配置项 |
|--------|------|------|--------|
| API 日志清理 | `0 0 3 * * ?` | 删除 N 天前的 API 日志 | `app.log.api-log-retention-days: 30` |
| 操作日志压缩 | `0 30 3 * * ?` | 删除 N 天前的操作日志 | `app.log.operation-log-retention-days: 90` |
| 登录日志清理 | `0 0 4 * * ?` | 删除 N 天前的登录日志 | `app.log.login-log-retention-days: 90` |
| 异常日志清理 | `0 30 4 * * ?` | 删除 N 天前的异常日志 | `app.log.error-log-retention-days: 60` |
| 孤儿文件扫描 | `0 0 2 * * ?` | 扫描无引用文件移入回收站 | — |
| 回收站清空 | `0 0 5 * * SUN` | 每周日清空回收站 7 天以上的文件 | `app.file.recycle-bin-retention-days: 7` |

### 5.5 孤儿文件检测逻辑

1. 查询 `admin_file` 表中 `status=active` 的所有文件 URL
2. 扫描以下表的 URL 字段，收集"正在使用"的 URL 集合：
   - `admin_user.avatar`
   - `admin_notice.content`（Markdown 中的图片链接）
   - `admin_system_config.config_value`（logo/favicon/bg_image）
3. 差集 = 孤儿文件（在 `admin_file` 中但不被任何表引用）
4. 将孤儿文件 `status` 改为 `recycled`，记录 `deleted_at`
5. 返回 `"扫描孤儿文件 5 个，已移入回收站"`

### 5.6 后端 — TaskController

**路由前缀**：`/api/admin/tasks`

| 方法 | 路径 | operationId | 说明 |
|------|------|-------------|------|
| GET | `/configs` | `listTaskConfigs` | 任务配置列表 |
| PUT | `/configs/{id}` | `updateTaskConfig` | 修改 Cron / 启用状态（实时生效） |
| POST | `/{taskName}/run` | `runTaskManually` | 手动触发执行 |
| GET | `/logs` | `listTaskLogs` | 执行日志（分页+按任务筛选） |
| GET | `/logs/{id}` | `getTaskLogDetail` | 执行日志详情 |

### 5.7 前端 — 调度中心页

**Tab 1 — 任务配置**：
- 表格：任务名、分组、Cron 表达式、启用/停用 Switch、上次执行时间/状态
- 操作：编辑 Cron（弹窗修改，保存即生效）、启用/停用 Switch、立即执行按钮
- Cron 表达式旁显示可读描述（如"每天凌晨 3:00"）

**Tab 2 — 执行日志**：
- 表格：任务名、执行时间、状态 Badge（success/failed/running）、耗时、结果摘要
- 筛选：按任务名、按状态
- 点击查看详情

## 六、文件清单

### 新建

| 文件 | 说明 |
|------|------|
| `db/migration/V12__file_center_and_task_log.sql` | 新建 admin_file 和 admin_task_log 表 |
| `model/entity/AdminFile.java` | 文件记录实体 |
| `model/entity/AdminTaskLog.java` | 任务执行日志实体 |
| `model/entity/AdminTaskConfig.java` | 任务配置实体 |
| `mapper/AdminTaskConfigMapper.java` | 任务配置 Mapper |
| `mapper/AdminFileMapper.java` | 文件 Mapper |
| `mapper/AdminTaskLogMapper.java` | 任务日志 Mapper |
| `service/TaskLogService.java` | 任务日志写入服务 |
| `service/TaskExecutorService.java` | 任务执行统一入口（taskName→Service 映射+日志记录） |
| `service/LogCleanService.java` | 日志清理服务（各类日志清理业务逻辑） |
| `config/DynamicTaskScheduler.java` | 动态任务调度器（SchedulingConfigurer + DB Cron） |
| `controller/TaskController.java` | 调度中心接口 |
| `pages/system/FileCenter.tsx` | 文件中心前端页面（重构） |
| `pages/system/TaskCenter.tsx` | 调度中心前端页面（新建） |

### 修改

| 文件 | 改动 |
|------|------|
| `service/impl/FileServiceImpl.java` | 重构：上传/删除同步写 DB，新增回收站逻辑 |
| `controller/FileController.java` | 重构：新增回收站接口 |
| `application.yml` | 新增各日志保留天数和回收站配置 |
| `routes.tsx` | 新增调度中心路由 |

### 删除/替换

| 文件 | 说明 |
|------|------|
| `pages/system/StorageManagement.tsx` | 被 `FileCenter.tsx` 替代 |
| `task/LogCleanupTask.java` | 被 `DynamicTaskScheduler` + `LogCleanService` 替代 |
| `config/SchedulingConfig.java` | 被 `DynamicTaskScheduler` 替代（它本身实现了 SchedulingConfigurer） |

## 七、实施顺序

| 阶段 | 内容 | 依赖 |
|------|------|------|
| 1 | Flyway V12 建表 | — |
| 2 | Entity + Mapper | 阶段 1 |
| 3 | TaskLogService | 阶段 2 |
| 4 | FileService 重构（DB 记录 + 回收站） | 阶段 2 |
| 5 | FileController 重构 | 阶段 4 |
| 6 | LogCleanupTask 重构 + 新增定时任务 | 阶段 3 |
| 7 | TaskController | 阶段 3 |
| 8 | 编译验证 + 生成前端 API | 阶段 5+7 |
| 9 | FileCenter 前端页面 | 阶段 8 |
| 10 | TaskCenter 前端页面 | 阶段 8 |

## 八、注意事项

- 孤儿文件扫描是耗时操作，需要异步执行，避免阻塞其他定时任务
- 回收站文件保留 7 天（可配置），超过后自动彻底删除
- 文件上传时必须同时写入 `admin_file` 表，保证数据一致性
- 已有的头像上传接口也需要适配新的 FileService（记录到 DB）
- MinIO 中已有的历史文件需要一次性导入到 `admin_file` 表（可通过手动脚本或启动时扫描）
