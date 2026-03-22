# CLAUDE.md

本文件为 Claude Code 提供项目级开发指导。

## 项目结构

```
general_scaffold_spring/
├── admin-backend/       # Spring Boot 后端（Java 17, MyBatis-Plus, PostgreSQL）
├── admin-frontend/      # React 前端（TypeScript, Vite, shadcn/ui, Tailwind CSS）
```

后端和前端各有独立的 `CLAUDE.md`，包含各自的构建命令和架构细节。

## 前后端协作开发流程

### 核心流程：后端先行，API 生成驱动前端

1. **后端开发接口** — 编写 Controller/Service/VO/DTO，确保所有字段标注 `@Schema` 注解
2. **后端编译验证** — `mvn compile` 确认无误
3. **用户生成前端 API** — 等待用户运行 `npm run generate:api`（orval 从 OpenAPI spec 生成），**不要自行运行此命令**
4. **前端对接** — 使用 `src/api/generated/` 中的函数和类型，直接调用

### 前端 API 调用规范

- **必须使用 generated endpoint 函数**，不手写 API 文件
- generated 代码使用工厂模式：`const rolesApi = getRoles()` 然后 `rolesApi.listRoles(params)`
- 返回类型是 `R<T>` 包装：`{code, message, data}`，用 `res.code === 200 && res.data` 判断
- generated 类型所有字段都是 optional（`?`），使用时注意 `?? fallback` 或 `!` 断言
- 自定义 axios 实例在 `src/api/custom-instance.ts`，已配置 token 注入和 401 自动退出

### 后端 OpenAPI 注解要点

- Controller 类必须有 `@Tag(name = "英文tag名", description = "...")`
- 所有 DTO/VO 字段必须有 `@Schema(description = "...")`
- **内部类命名必须唯一**：不同 VO 中的内部类不能同名（如 `GroupSection`/`Summary`），否则 orval 会合并它们导致类型丢失。命名规范：`{父类前缀}{内部类名}`（如 `UserPermGroupSection`）
- 确保 `application.yml` 配置 `springdoc.default-produces-media-type: application/json`，否则 orval 会生成 Blob 返回类型
- **Controller 方法必须添加 `operationId`**：`@Operation(operationId = "listUsers", summary = "...")`，否则 orval 会用数字后缀区分同名方法（如 `getDetail2`、`list1`），命名规范：`{动词}{资源}`（如 `listRoles`、`getUserDetail`、`syncRolePermissions`）

## 关键开发经验

### MyBatis-Plus @TableLogic

- BaseEntity 的 `isDeleted` 字段有 `@TableLogic` 注解
- **删除操作使用 `mapper.delete()` / `mapper.deleteById()` / `mapper.deleteBatchIds()` 方法**，让 MyBatis-Plus 自动处理逻辑删除
- **不要** `setIsDeleted(1)` + `updateById()`，`updateById()` 会忽略 `@TableLogic` 字段的 SET
- **不要** `LambdaUpdateWrapper.set(::getIsDeleted, 1)` + `mapper.update()`，应改用 `mapper.delete(LambdaQueryWrapper)` 方式
- 查询时 MyBatis-Plus 已自动加 `is_deleted=0`，不需要手动加

### 权限通配符匹配

- `/**` 模式必须匹配前缀路径本身（如 `/api/admin/users/**` 需匹配 `/api/admin/users`）
- 使用前缀匹配而非正则，避免 `.*` 要求必须有后续路径段的问题

### 权限同步脚本

- `admin-backend/script/sync_permissions_from_openapi.py`
- 使用 `psycopg2` 直连 PostgreSQL，自动读取 `application-{profile}.yml`
- `group_key` 格式统一为下划线（如 `admin_users`），不用点分隔

### 前端组件规范

- shadcn 的 `Badge` 组件不支持 `forwardRef`，作为 Radix Tooltip trigger 时需用 `<span>` 包裹
- 方法标签（GET/POST/PUT/DELETE）使用固定宽度保证对齐
- 滚动条已全局自定义（`index.css`），`scrollbar-gutter: stable` 防止页面抖动

### API 冗余清理原则

- 当 `sync`（全量同步）接口存在时，`revoke`（批量撤销）接口是冗余的，可以删除
- 删除后端接口后需同步删除关联的 DTO 类（如 `RevokePermissionsDTO`）
- 同时检查 Service 接口和实现中是否有方法不再被任何 Controller 调用

### operationId 变更后的前端对接

- 后端添加/修改 `operationId` 后，用户重新生成 API，前端函数名会变化
- 需要全局搜索旧函数名并替换为新函数名
- 常见变化模式：`list` → `listRoles`、`getDetail` → `getRoleDetail`、`_delete` → `deleteRole`
- 修改后运行 `npx tsc --noEmit` 验证无类型错误



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
