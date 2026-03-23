# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 提供在此代码库中工作的指导。

## 构建与运行命令

```bash
# 构建（跳过测试）
mvn clean package -DskipTests

# 运行
mvn spring-boot:run

# 指定 profile 运行
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# 运行单个测试类
mvn test -Dtest=类名

# 运行所有测试
mvn test
```

## 架构说明

### MVC 分层原则（核心规范）

**严格分层，职责明确：**

- `controller/` — 控制器层
  - 只负责：接收请求参数/请求体 → 调用 service 方法 → 返回结果
  - 禁止：在 controller 层进行任何业务逻辑、数据库增删查改

- `service/` — 业务逻辑层
  - 负责：所有业务逻辑处理、事务管理
  - 增删查改：只能通过 Mapper 操作数据库，禁止在 controller/util/其他层操作

- `mapper/` — 数据访问层
  - 只负责：数据库 CRUD 操作，对接 MyBatis-Plus BaseMapper

- `util/` — 工具层
  - 只放：纯算法、无状态工具类（如验证码生成、加密工具）
  - 禁止：直接操作数据库

- `common/` — 公共组件
  - 放：枚举类、常量类、全局异常等共享组件

**违反后果**：业务逻辑散落在各层会导致代码难以维护、测试困难、职责混乱。

### 分层结构

- `controller/` — REST 接口层，路由前缀 `/api/admin/*`。所有方法必须标注 `@Tag`、`@Operation`、`@Schema` 注解以支持 OpenAPI 文档生成。
- `service/` — 业务逻辑层，接口 + impl 实现
- `mapper/` — MyBatis-Plus `BaseMapper` 接口层
- `model/entity/` — 数据库实体，用 `@TableName` 标注，全部继承 `BaseEntity`
- `model/dto/` — 请求 DTO，全部字段带完整 `@Schema` 注解
- `model/vo/` — 响应视图对象，全部字段带完整 `@Schema` 注解
- `model/enums/` — 枚举类
- `security/` — JWT 过滤器链、Token 提供者
- `aspect/` — AOP 切面（API 日志切面、操作审计日志切面）
- `handler/` — `@RestControllerAdvice` 全局异常处理器
- `util/` — 工具类（纯算法、无状态）

### 依赖注入规范

**构造器注入 + `@RequiredArgsConstructor`（强制）**：

```java
@Service
@RequiredArgsConstructor
public class AuthServiceImpl {
    private final AdminUserMapper adminUserMapper;      // 注入
    private final AuthenticationManager authenticationManager;  // 注入
    // 无需构造器、setter、@Autowired
}
```

**禁止**：
- `@Autowired` 字段注入（即使能工作，也不允许）
- `private` 可变字段（不用 `final`）
- 服务内直接 `new` 依赖（违反依赖倒置）

**原则**：
- 所有依赖必须通过构造器注入，使用 Lombok `@RequiredArgsConstructor` 自动生成
- `final` 字段确保不可变性，编译时检查依赖完整性
- Service/Controller/Config 等组件类必须使用 `@RequiredArgsConstructor`
- Util 工具类不使用 DI（无状态，纯算法）

### 关键约定

**数据库表名**：所有管理后台表均以 `admin_` 为前缀（如 `admin_user`、`admin_role`）。软删除通过 `is_deleted` 字段 + MyBatis-Plus `@TableLogic` 实现。

**OpenAPI 注解规范（前端代码生成的关键）**：
- Controller 类：`@Tag(name = "模块名", description = "模块描述")`，其中模块名必须使用英文，必须。
- 方法：`@Operation(summary = "简要说明", description = "详细描述")`
- DTO 字段：`@Schema(description = "字段说明", example = "示例值")`
- 错误响应：`@ApiResponse(responseCode = "4xx", description = "错误说明")`

**统一响应格式**：`R<T>` 包装类始终返回 `{code, message, data}`。使用 `R.ok(data)`、`R.error(ResultCode.XXX)` 或 `R.error(code, message)`。

**BaseEntity**：所有实体继承 `BaseEntity`（id、createTime、updateTime、isDeleted）。createTime/updateTime 由 MyBatis-Plus MetaObjectHandler 自动填充。

**Redis 用途**：Token 黑名单、验证码存储（key=`captcha:{uuid}`，TTL 5分钟）、登录失败计数（key=`login:fail:{username}`）。

**Flyway 迁移**：所有 SQL 脚本放在 `src/main/resources/db/migration/`，命名格式 `V{版本}__{描述}.sql`。所有表结构变更必须通过迁移脚本完成。

**密码加密**：使用 `BCryptPasswordEncoder`。默认管理员账号密码为 `admin123`。

### 异常处理规范

**全局异常处理器统一兜底，Controller 禁止 try-catch**：

- `GlobalExceptionHandler`（`@RestControllerAdvice`）统一处理所有异常并返回 `R<T>` 格式
- **Controller 层禁止 try-catch**：Controller 只做 接收参数 → 调 Service → 返回结果，异常自动上抛给全局处理器
- **Service 层抛 `BusinessException`**：业务校验失败时抛出，携带 `ResultCode` 和用户友好的 message

```java
// ✅ 正确：Service 抛 BusinessException
throw new BusinessException(ResultCode.PARAM_ERROR, "用户名已存在");
throw new BusinessException(ResultCode.NOT_FOUND, "角色不存在");

// ❌ 错误：抛 IllegalArgumentException（message 可能含内部信息）
throw new IllegalArgumentException("用户不存在: " + id);

// ❌ 错误：Controller 手动 try-catch
try {
    roleService.createRole(dto);
} catch (IllegalArgumentException e) {
    return R.error(ResultCode.PARAM_ERROR, e.getMessage()); // 泄露内部信息
}
```

**已覆盖的异常类型**：`BusinessException`、`MethodArgumentNotValidException`（@Valid 校验）、`BindException`、`MissingServletRequestParameterException`、`HttpMessageNotReadableException`（JSON 解析失败）、`HttpRequestMethodNotSupportedException`（405）、`NoHandlerFoundException`（404）、`IllegalArgumentException`（兜底，不透传 message）、`Exception`（兜底，返回固定文案）

**安全原则**：异常 message **永远不直接透传**给前端。`BusinessException` 的 message 是开发者主动编写的安全文案；其他异常一律返回通用错误提示。

### 安全白名单

**单一数据源：`SecurityConstants.PUBLIC_PATHS`**

所有不需要认证的公开路径统一定义在 `common/SecurityConstants.java` 中。`SecurityConfig`（Spring Security permitAll）和 `PermissionAuthorizationFilter`（权限跳过）共用此数组，禁止各自维护。

```java
// ✅ 正确：引用共享常量
.requestMatchers(SecurityConstants.PUBLIC_PATHS).permitAll()

// ❌ 错误：在过滤器中重复定义白名单
private static final Set<String> EXCLUDE_PATHS = Set.of("/health", ...);
```

### 获取当前用户

**统一使用 `SecurityUtils` 工具类**（`util/SecurityUtils.java`）：

```java
// 获取当前用户详情
AdminUserDetails user = SecurityUtils.getCurrentUser();

// 获取当前用户ID（最常用）
Long userId = SecurityUtils.getCurrentUserId();

// 判断是否为超级管理员
boolean isSuperuser = SecurityUtils.isSuperuser();
```

**禁止**：
- 直接写 `SecurityContextHolder.getContext().getAuthentication().getPrincipal()` 硬取 + 强转
- 不同 Controller 各用各的方式获取用户

### JWT Token 处理

- `JwtTokenProvider.verifyToken(token)` 返回 `DecodedJWT`，后续通过 `getUserIdFromJwt(jwt)` / `isAccessToken(jwt)` 等重载方法提取信息
- **同一次请求只调用一次 `verifyToken()`**，复用 `DecodedJWT` 对象，禁止多次验证同一 token

### 日志规范

- 日志配置在 `logback-spring.xml`，按 dev/prod profile 区分
- dev 环境：彩色精简控制台 + 7 天滚动文件
- prod 环境：异步写入 + 30 天滚动
- 项目代码日志级别为 `INFO`，需要调试时临时改为 `DEBUG`
- Spring Security 框架日志级别为 `WARN`，避免每次请求输出过滤器链日志

### 错误信息安全

- `server.error.include-stacktrace: never` — 禁止 Spring Boot `/error` 端点返回栈信息
- `server.error.include-message: never` — 禁止返回异常 message
- 以上配置仅影响 HTTP 响应体，**不影响** `log.error("异常", e)` 的控制台/文件日志输出

### 响应状态码

`ResultCode` 枚举：SUCCESS(200)、PARAM_ERROR(400)、UNAUTHORIZED(401)、FORBIDDEN(403)、NOT_FOUND(404)、ACCOUNT_LOCKED(423)、INTERNAL_SERVER_ERROR(500)。

### Swagger UI 访问地址

- 文档页面：`http://localhost:8080/swagger-ui.html`
- OpenAPI JSON：`http://localhost:8080/api-docs`



## Git 提交规范

### 自动提交原则

- 每次完成一个独立的修改后，必须立即提交代码（不等用户要求）
- 每个 commit 只做一件事（原子化提交）
- 提交前确保测试通过（如有对应测试）

### Conventional Commits 规范

按修改类型使用对应前缀：

| 类型       | 说明               | 示例                                                |
| ---------- | ------------------ | --------------------------------------------------- |
| `feat`     | 新功能             | `feat: add industries endpoint`                     |
| `fix`      | Bug 修复           | `fix: correct field mapping in allocation response` |
| `refactor` | 重构（不改变行为） | `refactor: extract status computation to helper`    |
| `docs`     | 文档更新           | `docs: update API.md for new endpoints`             |
| `test`     | 测试相关           | `test: add tests for allocation results`            |
| `chore`    | 构建/依赖/配置     | `chore: update dependencies`                        |

### 类型隔离原则

- `fix` 不改变 API 接口
- `feat` 有明确边界，一个 commit 对应一个功能点
- `refactor` 不改变外部行为
- `docs` 独立于代码变更（如果代码和文档同时改，拆分为两个 commit）

### Commit Message 格式

```
<type>: <简短描述>
```

- 描述使用中文、不加句号
- 保持简洁（一行 50 字符以内为佳）