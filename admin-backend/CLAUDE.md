# Admin Backend - Claude Code 项目规范

## 技术栈

| 职责 | 技术选型 | 版本 |
|------|---------|------|
| Web 框架 | Spring Boot | 3.3.0 |
| ORM | MyBatis-Plus | 3.5.6 |
| 安全框架 | Spring Security | — |
| 数据库 | PostgreSQL + HikariCP | — |
| 数据库迁移 | Flyway | 10.10.0 |
| 缓存/会话 | Spring Data Redis + Lettuce | — |
| JWT 认证 | java-jwt (com.auth0) | 0.12.6 |
| 图形验证码 | easy-captcha | 1.6.2 |
| API 文档 | springdoc-openapi | 2.5.0 |
| 工具库 | Hutool | 5.8.26 |
| 系统监控 | OSHI | 6.4.0 |
| 简化代码 | Lombok | — |

## 数据库表命名

所有后台管理表统一以 `admin_` 为前缀，如 `admin_user`、`admin_role`、`admin_permission` 等。

## Git 提交规范

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

### 自动提交原则

- 每次完成一个独立的修改后，必须立即提交代码（不等用户要求）
- 每个 commit 只做一件事（原子化提交）
- 提交前确保测试通过（如有对应测试）

### Commit Message 格式

```
<type>: <简短描述>
```

- 描述使用英文、小写开头、不加句号
- 保持简洁（一行 50 字符以内为佳）
