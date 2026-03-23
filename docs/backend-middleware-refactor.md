# 后端中间件重构记录

> 日期：2026-03-23
> 背景：后端认证/日志/异常处理链路由实习生搭建，存在日志过多、安全泄露、代码规范等问题

## 问题诊断

### 1. 日志过多（每次 API 请求 10+ 行）

**根因**：`application.yml` 中 `com.scaffold.admin: DEBUG`，导致 Spring MVC DispatcherServlet、MyBatis SQL、Security FilterChain 等框架级 DEBUG 日志全部输出。

**加剧因素**：无 `logback-spring.xml`，使用 Spring Boot 默认日志格式（含完整类名 + 线程名），单行很长。

### 2. 栈信息泄露到前端（安全漏洞）

**泄露点 A — Controller try-catch 透传**：
```java
// RoleController、AdminUserController 中大量存在
catch (IllegalArgumentException e) {
    return R.error(ResultCode.PARAM_ERROR, e.getMessage());  // message 可能含内部信息
}
```
`IllegalArgumentException.getMessage()` 可能包含类名、SQL 片段等内部信息。

**泄露点 B — Filter 层异常绕过 ControllerAdvice**：
Spring Security Filter 中的异常不经过 `@RestControllerAdvice`，Spring Boot 默认 `/error` 端点会返回完整栈信息。

### 3. JWT Token 重复验证

`JwtAuthenticationFilter.doFilterInternal()` 中：
- `getUserIdFromToken(token)` → 调用 `verifyToken()` 第 1 次
- `isAccessToken(token)` → `getTokenType()` → 调用 `verifyToken()` 第 2 次

同一 token 每次请求被 JWT 库解析验证 2 次。

### 4. 安全白名单维护两份

- `SecurityConfig.securityFilterChain()` 的 `permitAll()` 路径
- `PermissionAuthorizationFilter.EXCLUDE_PATHS` 常量

两份白名单独立维护，已出现过不一致导致的 bug（refresh 接口被权限拦截）。

### 5. 获取当前用户方式不统一

- `AuthController`：用 `@AuthenticationPrincipal AdminUserDetails`
- `MenuController`：用 `SecurityContextHolder.getContext().getAuthentication().getPrincipal()` 硬取 + 强转
- 无统一工具类

### 6. GlobalExceptionHandler 覆盖不全

缺少：`HttpMessageNotReadableException`（JSON 解析失败）、`NoHandlerFoundException`（404）、`HttpRequestMethodNotSupportedException`（405）、`MissingServletRequestParameterException`（缺必填参数）

---

## 修复方案

### Fix 1：栈信息泄露防护

- `application.yml` 增加 `server.error.include-stacktrace: never` 和 `include-message: never`
- 注意：此配置仅影响 HTTP 响应体，不影响 `log.error("异常", e)` 的控制台/文件日志输出

### Fix 2：日志系统优化

- `com.scaffold.admin` 日志级别 `DEBUG` → `INFO`
- 新建 `logback-spring.xml`：
  - dev profile：彩色控制台、精简格式
  - prod profile：按天滚动、30 天保留、异步写入
  - 统一缩短类名显示（`%logger{36}` 代替完整类名）

### Fix 3：异常处理规范化

- `GlobalExceptionHandler` 补全缺失异常类型
- Controller 层删除所有手动 try-catch
- Service 层 `IllegalArgumentException` → `BusinessException`（含安全��用户���好 message）

### Fix 4：SecurityUtils 工具类

新建 `util/SecurityUtils.java`，提供 `getCurrentUser()`、`getCurrentUserId()`、`isAuthenticated()`

### Fix 5：JWT 重复验证修复

`JwtAuthenticationFilter` 中只调用一次 `verifyToken()`，从 `DecodedJWT` 中同时提取 userId 和 tokenType

### Fix 6：安全白名单统一

抽取 `common/SecurityConstants.java`，`SecurityConfig` 和 `PermissionAuthorizationFilter` 共用同一白名单数组
