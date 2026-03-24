# 第五阶段：通知公告 + 系统监控 — 增量开发文档

> 日期：2026-03-23

## 现状盘点

### 通知公告

| 组件 | 状态 | 说明 |
|------|------|------|
| 数据库表 `admin_notice` | ✅ 已建 | V1 迁移脚本，含 title/content/type/status/is_top/publish_time |
| 实体 `AdminNotice` | ✅ 已建 | 继承 BaseEntity，字段与表对应 |
| Mapper `AdminNoticeMapper` | ✅ 已建 | 空接口，继承 BaseMapper |
| Service | ❌ 待开发 | |
| Controller | ❌ 待开发 | |
| DTO/VO | ❌ 待开发 | |
| 前端页面 | ❌ 待开发 | routes.tsx 无占位 |

### 系统监控

| 组件 | 状态 | 说明 |
|------|------|------|
| OSHI 依赖 | ✅ 已有 | pom.xml 中 `oshi-core:6.4.0` |
| HealthController | ✅ 已有 | 仅返回 OK + 时间 |
| 监控接口 | ❌ 待开发 | |
| 前端页面 | ❌ 待开发 | |

---

## 功能一：通知公告

### 1.1 后端接口

**路由前缀**：`/api/admin/notices`
**Tag**：`notices`

| 方法 | 路径 | operationId | 说明 |
|------|------|-------------|------|
| GET | `/` | `listNotices` | 分页列表（支持 keyword/type/status 筛选） |
| GET | `/{id}` | `getNoticeDetail` | 详情 |
| POST | `/` | `createNotice` | 新增（默认 draft 状态） |
| PUT | `/{id}` | `updateNotice` | 编辑（仅 draft 状态可编辑） |
| DELETE | `/{id}` | `deleteNotice` | 删除 |
| PUT | `/{id}/publish` | `publishNotice` | 发布（draft → published，记录 publishTime） |
| PUT | `/{id}/withdraw` | `withdrawNotice` | 撤回（published → withdrawn） |
| PUT | `/{id}/top` | `toggleNoticeTop` | 切换置顶 |

### 1.2 DTO 设计

**CreateNoticeDTO**：
- `title`（必填）、`content`（必填）、`type`（notice/announcement，默认 notice）

**UpdateNoticeDTO**：
- `title`、`content`、`type`（均可选）

### 1.3 Service 逻辑

- **创建**：默认 status=draft，isTop=0
- **发布**：校验 status=draft，改为 published，设置 publishTime=now
- **撤回**：校验 status=published，改为 withdrawn
- **编辑**：校验 status=draft（已发布/已撤回的不允许编辑内容）
- **列表排序**：is_top DESC, publish_time DESC, create_time DESC

### 1.4 前端页面

**页面路径**：`/system/notice`
**组件**：`pages/system/NoticeManagement.tsx`

功能：
- 表格列表：标题、类型（Badge）、状态（Badge 带颜色）、置顶标记、发布时间、操作按钮
- 筛选栏：keyword + type 下拉 + status 下拉
- 操作：新增对话框（标题+富文本内容+类型选择）、编辑、删除确认、发布、撤回、置顶切换
- 状态 Badge 颜色：draft=secondary、published=green、withdrawn=amber

### 1.5 新建文件清单

**后端**：
| 文件 | 说明 |
|------|------|
| `model/dto/CreateNoticeDTO.java` | 创建 DTO |
| `model/dto/UpdateNoticeDTO.java` | 更新 DTO |
| `service/NoticeService.java` | Service 接口 |
| `service/impl/NoticeServiceImpl.java` | Service 实现 |
| `controller/NoticeController.java` | Controller |

**前端**：
| 文件 | 说明 |
|------|------|
| `pages/system/NoticeManagement.tsx` | 通知公告管理页面 |

**修改**：`routes.tsx` 添加路由

---

## 功能���：系统监控

### 2.1 设计思路

系统监控为**实时查询**，不存数据库。每次打开监控页面调用接口，后端用 OSHI 实时采集返回。

### 2.2 后端接口

**路由前缀**：`/api/admin/system`
**Tag**：`system-monitor`

| 方法 | 路径 | operationId | 说明 |
|------|------|-------------|------|
| GET | `/monitor` | `getSystemInfo` | 获取系统监控信息（一次性返回所有指标） |

### 2.3 VO 设计

**SystemInfoVO**（一个大 VO，包含所有监控指标）：

```java
public class SystemInfoVO {
    // CPU
    private CpuInfo cpu;
    // 内存
    private MemoryInfo memory;
    // JVM
    private JvmInfo jvm;
    // 磁盘
    private List<DiskInfo> disks;
    // Redis
    private RedisInfo redis;
    // 数据库连接池
    private DbPoolInfo dbPool;
    // 服务器基本信息
    private ServerInfo server;
}
```

**CpuInfo**：核心数、系统使用率、用户使用率、空闲率
**MemoryInfo**：总内存、已用内存、可用内存、使用率
**JvmInfo**：最大内存、已分配内存、已用内存、GC 次数、启动时间、运行时长
**DiskInfo**：盘符、类型、总空间、已用空间、可用空间、使用率
**RedisInfo**：版本、已用内存、连接数、运行天数、key 数量
**DbPoolInfo**：活跃连接数、空闲连接数、总连接数、等待线程数（从 HikariCP 获取）
**ServerInfo**：操作系统、主机名、IP 地址、系统架构

### 2.4 Service 实现

**SystemMonitorService**：
- 使用 OSHI `SystemInfo` 获取 CPU、内存、磁盘
- 使用 `Runtime.getRuntime()` 获取 JVM 信息
- 使用 `RedisTemplate` 执行 `INFO` 命令获取 Redis 信息
- 使用 `HikariDataSource.getHikariPoolMXBean()` 获取连接池信息

### 2.5 前端页面

**页面路径**：`/system/monitor`
**组件**：`pages/system/SystemMonitor.tsx`

功能：
- Card 卡片网格布局（2-3 列）
- 每个卡片展示一类指标（CPU、内存、JVM、磁盘、Redis、数据库）
- 进度条展示使用率（CPU、内存、磁盘）
- 右上角刷新按钮，可手动刷新
- 可选：自动刷新间隔（5s/10s/30s/关闭）

### 2.6 新建文件清单

**后端**：
| 文件 | 说明 |
|------|------|
| `model/vo/SystemInfoVO.java` | 监控数据 VO（含内部类） |
| `service/SystemMonitorService.java` | 监控数据采集 Service |
| `controller/SystemController.java` | 监控接口 Controller |

**前端**：
| 文件 | 说明 |
|------|------|
| `pages/system/SystemMonitor.tsx` | 系统监控页面 |

**修改**：`routes.tsx` 添加路由

---

## 实施顺序

| 步骤 | 内容 | 估计复杂度 |
|------|------|-----------|
| 1 | 通知公告后端（DTO + Service + Controller） | 中 |
| 2 | 用户运行 `npm run generate:api` | — |
| 3 | 通知公告前端页面 | 中 |
| 4 | 系统监控后端（VO + Service + Controller） | 中 |
| 5 | 用户运行 `npm run generate:api` | — |
| 6 | 系统监控前端页面 | 中 |

---

## 注意事项

- 通知公告的 `content` 字段当前为 TEXT，如果后续需要富文本编辑器，前端可以集成 Markdown 编辑器或 TipTap
- 系统监控不存库，纯实时查询，OSHI 采集有一定 CPU 开销，前端不要设置过于频繁的自动刷新
- VO 内部类命名需遵循 CLAUDE.md 的 `{父类前缀}{内部类名}` 规范，避免 orval 合并
