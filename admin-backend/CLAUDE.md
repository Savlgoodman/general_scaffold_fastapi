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

### 分层结构

- `controller/` — REST 接口层，路由前缀 `/api/admin/*`。所有方法必须标注 `@Tag`、`@Operation`、`@Schema` 注解以支持 OpenAPI 文档生成。
- `service/` — 业务逻辑层，接口 + impl 实现
- `mapper/` — MyBatis-Plus `BaseMapper` 接口层
- `model/entity/` — 数据库实体，用 `@TableName` 标注，全部继承 `BaseEntity`
- `model/dto/` — 请求 DTO，全部字段带完整 `@Schema` 注解
- `model/vo/` — 响应视图对象，全部字段带完整 `@Schema` 注解
- `model/enums/` — 枚举类
- `security/` — JWT 过滤器链、Token 提供者、UserDetailsService
- `aspect/` — AOP 切面（API 日志切面、操作审计日志切面）
- `handler/` — `@RestControllerAdvice` 全局异常处理器

### 关键约定

**数据库表名**：所有管理后台表均以 `admin_` 为前缀（如 `admin_user`、`admin_role`）。软删除通过 `is_deleted` 字段 + MyBatis-Plus `@TableLogic` 实现。

**OpenAPI 注解规范（前端代码生成的关键）**：
- Controller 类：`@Tag(name = "模块名", description = "模块描述")`
- 方法：`@Operation(summary = "简要说明", description = "详细描述")`
- DTO 字段：`@Schema(description = "字段说明", example = "示例值")`
- 错误响应：`@ApiResponse(responseCode = "4xx", description = "错误说明")`

**统一响应格式**：`R<T>` 包装类始终返回 `{code, message, data}`。使用 `R.ok(data)`、`R.error(ResultCode.XXX)` 或 `R.error(code, message)`。

**BaseEntity**：所有实体继承 `BaseEntity`（id、createTime、updateTime、isDeleted）。createTime/updateTime 由 MyBatis-Plus MetaObjectHandler 自动填充。

**Redis 用途**：Token 黑名单、验证码存储（key=`captcha:{uuid}`，TTL 5分钟）、登录失败计数（key=`login:fail:{username}`）。

**Flyway 迁移**：所有 SQL 脚本放在 `src/main/resources/db/migration/`，命名格式 `V{版本}__{描述}.sql`。所有表结构变更必须通过迁移脚本完成。

**密码加密**：使用 `BCryptPasswordEncoder`。默认管理员账号密码为 `admin123`。

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

- 描述使用英文、小写开头、不加句号
- 保持简洁（一行 50 字符以内为佳）