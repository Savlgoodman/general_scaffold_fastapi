# CLAUDE.md

本文件为 Claude Code 提供项目级开发指导。

## 项目概况

本项目正在将 Java Spring Boot 后端重构为 Python FastAPI，**前端保持不变**。

### 当前状态

- `admin-backend/` — Java Spring Boot 后端（**参考实现，不再修改**）
- `admin-fastapi/` — Python FastAPI 后端（**当前开发重点**）
- `admin-frontend/` — React 前端（TypeScript, Vite, shadcn/ui, Tailwind CSS）

### 重构核心约束

| 约束 | 说明 |
|------|------|
| **数据库不动** | 使用独立数据库 `scaffold_fastapi_dev`（从 Java 版迁移表结构），SQLAlchemy 映射到已有表 |
| **API 契约不变** | 路径、参数、响应格式与 Java 版完全一致 |
| **前端零改动** | orval 指向新后端 `/api-docs`，重新生成即可 |
| **密码兼容** | `passlib[bcrypt]` 兼容 Java BCrypt 密码 |
| **Redis Key 兼容** | Key 前缀、TTL 与 Java 版一致 |

---

## 项目结构

```
general_scaffold_fastapi/
├── admin-backend/       # Java Spring Boot 后端（参考实现，只读）
├── admin-fastapi/       # Python FastAPI 后端（开发重点）
│   ├── app/
│   │   ├── main.py              # 入口：中间件/路由/异常处理
│   │   ├── config.py            # Pydantic Settings 配置
│   │   ├── common/              # 公共组件（R/ResultCode/异常/分页/Redis Key/安全常量）
│   │   ├── models/              # SQLAlchemy ORM 模型（17 个实体）
│   │   ├── schemas/             # Pydantic 模型（DTO + VO）
│   │   ├── routers/             # API 路由（对应 Java Controller）
│   │   ├── services/            # 业务逻辑层（对应 Java ServiceImpl）
│   │   ├── security/            # JWT/认证/权限
│   │   ├── middleware/          # HTTP 中间件（API 日志/CORS）
│   │   ├── decorators/          # 装饰器（操作审计）
│   │   ├── db/                  # 数据库/Redis 连接
│   │   └── utils/               # 工具类
│   ├── alembic/                 # 数据库迁移
│   ├── requirements.txt
│   └── .env                     # 环境配置（git 忽略）
├── admin-frontend/      # React 前端（不修改）
├── docs/                # 项目文档
└── CLAUDE.md            # 本文件
```

---

## 重构实施计划（分 6 阶段）

详见 [docs/DESIGN_FASTAPI_REWRITE_PLAN.md](./docs/DESIGN_FASTAPI_REWRITE_PLAN.md)

### Phase 1：项目骨架与基础设施 ✅ 已完成
- 目录结构、配置管理、数据库/Redis 连接、17 个 ORM 模型、统一响应、全局异常处理、CORS、Health 端点

### Phase 2：认证安全体系（当前阶段）
- JWT Provider（生成/验证/黑名单）
- 验证码（`easy-captcha-python`，用法见 `docs/EASYCAPTCHA-PYTHON-USAGE.md`）
- Auth Router（登录/登出/刷新/获取当前用户/头像上传）
- JWT 认证中间件 + RBAC 权限依赖

### Phase 3：核心 CRUD 模块
- 用户/角色/权限/菜单管理，用户权限覆写

### Phase 4：日志与审计
- API 日志中间件、操作审计装饰器、异常日志、登录日志、日志查询 Router

### Phase 5：辅助功能模块
- 通知公告、文件管理（MinIO）、系统配置、系统监控、仪表盘统计、在线用户、定时任务

### Phase 6：联调验证与切换
- API 契约对比、orval 重新生成、前端引用替换、回归测试

---

## FastAPI 后端开发规范

### 构建与运行

```bash
# 环境管理使用 venv（位于 admin-fastapi/.venv/）
cd admin-fastapi

# 激活虚拟环境（Windows Git Bash）
source .venv/Scripts/activate

# 安装依赖
pip install -r requirements.txt

# 开发运行
uvicorn app.main:app --reload --port 8000

# OpenAPI 文档
# http://localhost:8000/swagger-ui.html
# http://localhost:8000/api-docs（JSON，供 orval 消费）
```

### 分层原则（严格执行）

| 层级 | 目录 | 职责 | 禁止 |
|------|------|------|------|
| Router | `routers/` | 接收参数 → 调 Service → 返回结果 | 业务逻辑、直接查数据库 |
| Service | `services/` | 业务逻辑、事务管理 | 直接返回 HTTP 响应 |
| Model | `models/` | ORM 映射 | 业务逻辑 |
| Schema | `schemas/` | 请求/响应校验 | 业务逻辑 |

### 命名规范

| 对象 | 规范 | 示例 |
|------|------|------|
| 文件名 | snake_case | `user_service.py` |
| 类名 | PascalCase | `AdminUserService` |
| 函数/方法 | snake_case | `create_user()` |
| 常量 | UPPER_SNAKE | `TOKEN_BLACKLIST` |
| Pydantic Schema | PascalCase + 后缀 | `CreateRoleDTO` / `RoleBaseVO` |
| SQLAlchemy Model | PascalCase | `AdminUser` → `__tablename__ = "admin_user"` |

### OpenAPI 对齐要点（前端兼容关键）

1. **路径完全一致**：如 `/api/admin/roles/{id}` 不能写成 `/{role_id}`
2. **operation_id 一致**：`operation_id="listRoles"` 对应 Java `@Operation(operationId="listRoles")`
3. **tags 一致**：`tags=["Roles"]` 对应 Java `@Tag(name="Roles")`
4. **Query 参数名一致**：`pageNum` 不是 `page_num`（使用 FastAPI `Query(alias="pageNum")`）
5. **JSON 字段名驼峰**：Pydantic 使用 `alias_generator` 将 snake_case → camelCase
6. **分页字段名一致**：`records` / `total` / `size` / `current`

### 驼峰命名兼容

```python
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )
```

### 异常处理规范

- **Router 层禁止 try-catch**
- **Service 层抛 `BusinessException`**：`raise BusinessException(ResultCode.NOT_FOUND, "用户不存在")`
- **全局异常处理器统一兜底**（`app/main.py` 中已注册）
- **安全原则**：错误信息不透传内部实现细节

### 逻辑删除

```python
# 查询：手动加条件
stmt = select(AdminUser).where(AdminUser.is_deleted == 0)

# 删除：UPDATE 而非 DELETE
stmt = update(AdminUser).where(AdminUser.id == id).values(is_deleted=1)
```

### 依赖注入

```python
from fastapi import Depends
from app.db.session import get_db
from app.security.security_utils import get_current_user

@router.get("/me")
async def me(
    db: AsyncSession = Depends(get_db),
    user: AdminUser = Depends(get_current_user),
): ...
```

### 操作审计

所有 CUD Service 方法使用 `@operation_log` 装饰器：

```python
@operation_log(module="用户管理", op_type="CREATE")
async def create_user(self, dto, db, request): ...
```

### 异步规范

- 数据库操作：`async/await`（SQLAlchemy AsyncSession）
- Redis 操作：`async/await`（redis-py async）
- 日志写入：`asyncio.create_task()` 异步，不阻塞响应
- MinIO：`run_in_executor`（官方 SDK 不支持 async）

---

## 前后端协作开发流程

### 核心流程（FastAPI 版）

1. **后端开发 Router** — 编写 Router/Service/Schema，确保 `operation_id`、`tags`、`Field(description=...)` 完整
2. **后端启动验证** — `uvicorn app.main:app --reload`，访问 `/api-docs` 确认 OpenAPI JSON 正确
3. **用户生成前端 API** — 等待用户运行 `npm run generate:api`，**不要自行运行此命令**
4. **前端对接** — 使用 `src/api/generated/` 中的函数和类型

### 前端 API 调用规范

- **必须使用 generated endpoint 函数**，不手写 API 文件
- generated 代码使用工厂模式：`const rolesApi = getRoles()` 然后 `rolesApi.listRoles(params)`
- 返回类型是 `R<T>` 包装：`{code, message, data}`，用 `res.code === 200 && res.data` 判断
- generated 类型所有字段都是 optional（`?`），使用时注意 `?? fallback` 或 `!` 断言
- 自定义 axios 实例在 `src/api/custom-instance.ts`，已配置 token 注入和 401 自动退出
- Java 版生成的 API 保留在 `src/api/javaedition/` 作参考

### 前端 API 迁移流程

1. Python 后端某模块完成后，用户重新 `npm run generate:api`
2. 生成到 `src/api/generated/`
3. 前端逐步将 `import from '@/api/javaedition/...'` 替换为 `import from '@/api/generated/...'`
4. 全部替换后删除 `javaedition/`

---

## 前端路由注册流程

### 单一数据源：`src/routes.tsx`

所有受保护页面的路由定义在 `admin-frontend/src/routes.tsx` 的 `appRoutes` 数组中。

### 菜单控制机制

- **超级管理员 + 开发者模式 ON**：侧边栏显示 `appRoutes` 中所有前端路由
- **超级管理员 + 开发者模式 OFF / 普通用户**：侧边栏按后端登录接口返回的菜单树渲染

### Token 刷新机制

- `src/api/custom-instance.ts` 中实现了 access token 自动刷新
- 401 响应时自动使用 refresh token 换取新 token 并重试原请求
- 并发请求加锁，只刷新一次，其余排队等待
- refresh token 也失效时，弹出 toast「登录失效！请重新登录」并跳转登录页

---

## 关键开发经验

### Java 参考对照

开发 FastAPI 接口时，对照 Java 版实现确保行为一致：

| 需要对照的内容 | Java 位置 | Python 位置 |
|---------------|-----------|------------|
| 接口路径与参数 | `controller/*.java` | `routers/*.py` |
| 业务逻辑 | `service/impl/*.java` | `services/*.py` |
| 数据校验 | `model/dto/*.java` | `schemas/*.py` |
| 响应格式 | `model/vo/*.java` | `schemas/*.py` |
| 安全过滤 | `security/*.java` | `security/*.py` |
| Redis Key | `common/RedisKeys.java` | `common/redis_keys.py` |

### 权限通配符匹配

- `/**` 模式必须匹配前缀路径本身（如 `/api/admin/users/**` 需匹配 `/api/admin/users`）
- 使用前缀匹配而非正则

### 前端组件规范

- shadcn 的 `Badge` 组件不支持 `forwardRef`，作为 Radix Tooltip trigger 时需用 `<span>` 包裹
- 方法标签（GET/POST/PUT/DELETE）使用固定宽度保证对齐
- 滚动条已全局自定义（`index.css`），`scrollbar-gutter: stable` 防止页面抖动

---

## 文档编写规范

### 文档目录

所有项目文档存放在 `docs/` 目录，`docs/README.md` 是文档索引入口。新增文档前必须先阅读 `docs/README.md` 了解分类和命名规则。

### 命名规则

文件名格式：`{类型前缀}_{模块}_{描述}.md`，全大写下划线分隔。

| 前缀 | 用途 | 示例 |
|------|------|------|
| `SYSTEM_` | 系统功能总结 | `SYSTEM_RBAC_SUMMARY.md` |
| `UPDATE_` | 功能升级规划 | `UPDATE_NOTICE_AUTH_UPGRADE.md` |
| `DESIGN_` | 架构/技术方案 | `DESIGN_DATABASE_SCHEMA.md` |
| `GUIDE_` | 操作指南/部署 | `GUIDE_DEPLOYMENT.md` |
| `API_` | 接口文档 | `API_AUTH_ENDPOINTS.md` |
| `TROUBLESHOOT_` | 故障排查 | `TROUBLESHOOT_JWT_TOKEN_ISSUES.md` |

### 新建文档流程

1. 判断文档类型，选择对应前缀
2. 检查 `docs/README.md` 索引，确认无重复
3. 在 `docs/` 下按命名规则创建文件
4. 在 `docs/README.md` 对应分类标题下添加索引条目

## Git 提交规范

### 自动提交原则

- 每次完成一个独立的修改后，必须立即提交代码（不等用户要求）
- 每个 commit 只做一件事（原子化提交）
- 提交前确保测试通过（如有对应测试）
- 请注意：本项目可能是多agent在同一个工作区工作，可能会出现多组代码被修改的情况，请务必提交自己修改的文件！

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
