# 日志体系实现方案

> 日期：2026-03-23
> 基于：项目设计文档中的日志体系章节

## 现状盘点

### 已完成（可直接使用）

| 组件 | 状态 | 说明 |
|------|------|------|
| 数据库表 `admin_api_log` | ✅ 已建 | V1 迁移脚本创建，字段齐全 |
| 数据库表 `admin_login_log` | ✅ 已建 | V1 + V2 补了 update_time |
| 数据库表 `admin_operation_log` | ✅ 已建 | V1 迁移脚本创建 |
| 数据库表 `admin_error_log` | ✅ 已建 | V1 迁移脚本创建 |
| 实体类 `AdminApiLog` / `AdminLoginLog` / `AdminOperationLog` / `AdminErrorLog` | ✅ 已建 | 均继承 BaseEntity，字段与表对应 |
| Mapper `AdminApiLogMapper` / `AdminLoginLogMapper` / `AdminOperationLogMapper` / `AdminErrorLogMapper` | ✅ 已建 | 均为空接��继承 BaseMapper |
| 登录日志记录 | ✅ 已实现 | `AuthServiceImpl.recordLoginLog()` 在登录/注册流程中调用，写入 admin_login_log |

### 待开发

| 组件 | 当前状态 | 需要做什么 |
|------|----------|-----------|
| API 请求日志 | `ApiLogInterceptor` 仅输出控制台日志 | 改为 AOP 切面 + 异步写入 DB |
| 操作审计日志 | 完全空白 | ��建注解 + AOP 切面 + 异步写入 |
| 系统异常日志 | `GlobalExceptionHandler` 仅输出控制台日志 | 增加异步写入 DB |
| 异步基础设施 | 不存在 | 新建 `AsyncConfig` + 线程池 |

---

## 实现计划

### Phase 1：异步基础设施

**新建文件**：`config/AsyncConfig.java`

```java
@Configuration
@EnableAsync
public class AsyncConfig {
    @Bean("logExecutor")
    public Executor logExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(5);
        executor.setQueueCapacity(500);
        executor.setThreadNamePrefix("log-async-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }
}
```

所有日志写入操作使用 `@Async("logExecutor")`，不阻塞业务请求。

---

### Phase 2：API 请求日志

**方案**：删除现有 `ApiLogInterceptor`，改为 AOP 切面 `ApiLogAspect`

**原因**：
- Interceptor 无法方便获取请求体（InputStream 只能读一次）
- AOP 切面可以直接拿到 Controller 方法参数和返回值
- 与操作审计日志保持统一的 AOP 模式

**新建文件**：
- `aspect/ApiLogAspect.java` — AOP 切面，`@Around` 拦截所有 `@RestController` 方法

**修改文件**：
- `config/WebMvcConfig.java` — 移除 `ApiLogInterceptor` 注册
- 可选删除 `interceptor/ApiLogInterceptor.java`

**记录内容**：

| 字段 | 来源 |
|------|------|
| userId / username | `SecurityUtils.getCurrentUser()` |
| method | `HttpServletRequest.getMethod()` |
| path | `HttpServletRequest.getRequestURI()` |
| queryParams | `HttpServletRequest.getQueryString()` |
| requestBody | Controller 方法中 `@RequestBody` 参数序列化（截断至 2000 字符） |
| responseCode | `R<T>` 返回值的 code 字段 |
| responseBody | 返回值序列化（截断至 2000 字符） |
| durationMs | `System.currentTimeMillis()` 差值 |
| ip | 从请求头 `X-Forwarded-For` / `X-Real-IP` / `getRemoteAddr()` |
| userAgent | `HttpServletRequest.getHeader("User-Agent")` |

**排除路径**：登录、注册、验证码等 auth 接口（已有登录日志）、Swagger 文档接口、健康检查。

**性能保护**：
- 请求体/响应体截断至 2000 字符，避免大 JSON 撑爆日志表
- 异步写入，不阻塞请求

---

### Phase 3：操作审计日志

**新建文件**：
- `annotation/OperationLog.java` — 自定义注解
- `model/enums/OperationType.java` — 操作类型枚举
- `aspect/OperationLogAspect.java` — AOP 切面

**注解定义**：

```java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface OperationLog {
    String module();                    // 模块名："用户管理"、"角色管理"
    OperationType type();               // CREATE / UPDATE / DELETE
    String description() default "";    // 可选补充描述
}
```

**操作类型枚举**：

```java
public enum OperationType {
    CREATE("新增"),
    UPDATE("修改"),
    DELETE("删除");
}
```

**切面逻辑**：
1. 方法执行前：如果是 UPDATE/DELETE，可选获取旧数据（通过 ID 参数查库）
2. 方法执行后：获取新数据（返回值）
3. 异步写入 `admin_operation_log`

**使用方式**（标注在 Service 方法上）：

```java
@OperationLog(module = "用户管理", type = OperationType.CREATE)
public AdminUser createUser(CreateAdminUserDTO dto) { ... }

@OperationLog(module = "角色管理", type = OperationType.UPDATE)
public AdminRole updateRole(Long id, UpdateRoleDTO dto) { ... }

@OperationLog(module = "角色管理", type = OperationType.DELETE)
public void deleteRole(Long id) { ... }
```

**记录内容**：

| 字段 | 来源 |
|------|------|
| userId / username | `SecurityUtils.getCurrentUser()` |
| module | `@OperationLog.module()` |
| operation | `@OperationLog.type().name()` |
| methodName | 切面获取的方法全限定名 |
| requestParams | 方法参数序列化 |
| oldData | UPDATE/DELETE 时方法执行前查库的旧数据 |
| newData | 方法返回值序列化 |
| ip | `HttpServletRequest` |

---

### Phase 4：系统异常日志

**修改文件**：`handler/GlobalExceptionHandler.java`

**改动点**：
- 注入 `AdminErrorLogMapper`
- 在 `handleException`（兜底异常）和 `handleBusinessException`（业务异常中的 500 级别）中，异步写入 `admin_error_log`
- 只记录 WARNING 级别以上的异常（业务校验异常如 400/404 不入库）

**异常级别映射**：

| 异常类型 | 级别 | 是否入库 |
|----------|------|---------|
| `BusinessException`（400/404） | — | 不入库 |
| `BusinessException`（500） | WARNING | 入库 |
| 未处理 `Exception` | ERROR | 入库 |
| OOM / StackOverflow 等致命异常 | CRITICAL | 入库 |

**记录内容**：

| 字段 | 来源 |
|------|------|
| level | 根据异常类型映射 |
| exceptionClass | `e.getClass().getName()` |
| exceptionMessage | `e.getMessage()`（截断至 500 字符） |
| stackTrace | `ExceptionUtils.getStackTrace(e)`（截断至 4000 字符） |
| requestPath | `HttpServletRequest.getRequestURI()` |
| requestMethod | `HttpServletRequest.getMethod()` |
| requestParams | queryString + body（截断） |
| userId | `SecurityUtils.getCurrentUserId()` |
| ip | 从请求头提取 |

---

### Phase 5：IP 提取工具

**新建文件**：`util/IpUtils.java`

各日志模块都需要从请求中提取客户端 IP，抽取为公共工具方法：

```java
public static String getClientIp(HttpServletRequest request) {
    // 优先级：X-Forwarded-For > X-Real-IP > getRemoteAddr()
}
```

> 注意：`AuthServiceImpl` 中已有 `getClientIp()` 私有方法（第 342 行），应提取到 `IpUtils` 后统一复用。

---

## 数据库迁移

需要新建 `V8__add_update_time_to_log_tables.sql`：

```sql
-- admin_api_log 和 admin_operation_log 缺少 update_time（BaseEntity 需要）
-- admin_error_log 同理
ALTER TABLE admin_api_log ADD COLUMN IF NOT EXISTS update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE admin_operation_log ADD COLUMN IF NOT EXISTS update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE admin_error_log ADD COLUMN IF NOT EXISTS update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
```

---

## 文件清单

### 新建

| 文件 | 说明 |
|------|------|
| `config/AsyncConfig.java` | 异步线程池配置 |
| `aspect/ApiLogAspect.java` | API 请求日志切面 |
| `annotation/OperationLog.java` | 操作审计注解 |
| `model/enums/OperationType.java` | 操作类型枚举 |
| `aspect/OperationLogAspect.java` | 操作审计日志切面 |
| `util/IpUtils.java` | IP 提取工具 |
| `db/migration/V8__add_update_time_to_log_tables.sql` | 补齐 update_time 字段 |

### 修改

| 文件 | 改动 |
|------|------|
| `handler/GlobalExceptionHandler.java` | 异步写入 admin_error_log |
| `config/WebMvcConfig.java` | 移除 ApiLogInterceptor 注册 |
| `service/impl/AuthServiceImpl.java` | `getClientIp()` 改用 `IpUtils` |

### 可选删除

| 文件 | 原因 |
|------|------|
| `interceptor/ApiLogInterceptor.java` | 被 `ApiLogAspect` 替代 |

---

## 实施顺序

1. **Phase 1**：AsyncConfig（所有异步写入的基础）
2. **Phase 5**：IpUtils（被后续所有模块依赖）
3. **Phase 2**：API 请求日志（替换 Interceptor）
4. **Phase 4**：系统异常日志（改 GlobalExceptionHandler）
5. **Phase 3**：操作审计日志（工作量最大，需要标注注解到各 Service 方法）
6. **数据库迁移**：V8 脚本（可在任意阶段提前执行）
