# FastAPI 后端重构总体实施方案

> 创建日期：2026-03-25
> 最后更新：2026-03-25
> 前置文档：[DESIGN_FASTAPI_REWRITE_FEASIBILITY.md](./DESIGN_FASTAPI_REWRITE_FEASIBILITY.md)

## 1. 总体原则

### 1.1 核心约束

| 约束 | 说明 |
|------|------|
| **数据库不动** | 复用现有 PostgreSQL 表结构，SQLAlchemy 模型映射到已有表，不改字段名/类型 |
| **API 契约不变** | 所有接口路径、请求参数、响应格式与 Java 版完全一致 |
| **前端零改动** | 只需将 orval 指向新后端的 `/api-docs`，重新 `npm run generate:api` |
| **密码兼容** | 使用 `passlib[bcrypt]` 兼容 Java BCrypt 加密的密码，用户无需重置 |
| **Redis Key 兼容** | 保持 Java 版相同的 Redis Key 前缀和 TTL，支持平滑切换 |

### 1.2 后端适配前端策略

前端已完善且稳定运行，重构目标是 **Python 后端产出与 Java 后端完全一致的 OpenAPI spec**，使得：

1. 前端 `orval.config.js` 中 `input.target` 改为 `http://localhost:8000/api-docs` 即可
2. 生成到 `admin-frontend/src/api/generated/`（Java 版保留在 `javaedition/` 作参考）
3. 前端逐步将 `import from '@/api/javaedition/...'` 替换为 `import from '@/api/generated/...'`
4. 最终确认全部替换完成后删除 `javaedition/`

---

## 2. 项目目录结构

```
admin-fastapi/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI 入口，挂载中间件/路由/异常处理
│   ├── config.py                  # Pydantic Settings 配置管理
│   │
│   ├── common/                    # 公共组件
│   │   ├── __init__.py
│   │   ├── response.py            # R<T> 统一响应模型
│   │   ├── exceptions.py          # BusinessException + 全局异常处理器
│   │   ├── pagination.py          # PageResult 分页模型
│   │   ├── result_code.py         # ResultCode 枚举
│   │   ├── redis_keys.py          # Redis Key 常量
│   │   └── security_constants.py  # 公开路径白名单
│   │
│   ├── models/                    # SQLAlchemy ORM 模型（对应 entity/）
│   │   ├── __init__.py
│   │   ├── base.py                # Base 声明基类 + 公共字段 mixin
│   │   ├── user.py                # AdminUser
│   │   ├── role.py                # AdminRole
│   │   ├── permission.py          # AdminPermission
│   │   ├── menu.py                # AdminMenu
│   │   ├── associations.py        # 关联表（user_role / role_permission / role_menu / user_perm_override）
│   │   ├── notice.py              # AdminNotice
│   │   ├── file.py                # AdminFile
│   │   ├── logs.py                # AdminApiLog / AdminLoginLog / AdminOperationLog / AdminErrorLog
│   │   ├── task.py                # AdminTaskConfig / AdminTaskLog
│   │   └── system_config.py       # SystemConfig
│   │
│   ├── schemas/                   # Pydantic 模型（对应 dto/ + vo/）
│   │   ├── __init__.py
│   │   ├── auth.py                # LoginDTO / RefreshTokenDTO / LoginVO / CaptchaVO
│   │   ├── user.py                # CreateAdminUserDTO / UpdateAdminUserDTO / AdminUserVO / UserVO
│   │   ├── role.py                # CreateRoleDTO / UpdateRoleDTO / RoleBaseVO / RolePermissionFullVO
│   │   ├── permission.py          # PermissionBaseVO / PermissionGroupVO
│   │   ├── menu.py                # CreateMenuDTO / UpdateMenuDTO / MenuVO / SortMenuDTO
│   │   ├── notice.py              # CreateNoticeDTO / UpdateNoticeDTO
│   │   ├── file.py                # FileUploadVO / BucketFileVO
│   │   ├── log.py                 # 各类日志查询参数与 VO
│   │   ├── system.py              # SystemInfoVO / SystemConfigGroupVO
│   │   ├── statistics.py          # StatOverviewVO / StatApiStatsVO / 趋势 VO
│   │   ├── online_user.py         # OnlineUserVO / OnlineSessionData
│   │   └── task.py                # UpdateTaskConfigDTO
│   │
│   ├── routers/                   # API 路由（对应 controller/）
│   │   ├── __init__.py
│   │   ├── auth.py                # /api/admin/auth/*
│   │   ├── admin_users.py         # /api/admin/admin-users/*
│   │   ├── roles.py               # /api/admin/roles/*
│   │   ├── permissions.py         # /api/admin/permissions/*
│   │   ├── menus.py               # /api/admin/menus/*
│   │   ├── notices.py             # /api/admin/notices/*
│   │   ├── files.py               # /api/admin/files/*
│   │   ├── online_users.py        # /api/admin/online-users/*
│   │   ├── api_logs.py            # /api/admin/api-logs/*
│   │   ├── login_logs.py          # /api/admin/login-logs/*
│   │   ├── operation_logs.py      # /api/admin/operation-logs/*
│   │   ├── error_logs.py          # /api/admin/error-logs/*
│   │   ├── statistics.py          # /api/admin/statistics/*
│   │   ├── system_config.py       # /api/admin/system-config/*
│   │   ├── system_monitor.py      # /api/admin/system/*
│   │   ├── tasks.py               # /api/admin/tasks/*
│   │   └── health.py              # /health
│   │
│   ├── services/                  # 业务逻辑层（对应 service/impl/）
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── user_service.py
│   │   ├── role_service.py
│   │   ├── permission_service.py
│   │   ├── menu_service.py
│   │   ├── rbac_service.py
│   │   ├── notice_service.py
│   │   ├── file_service.py
│   │   ├── online_user_service.py
│   │   ├── statistics_service.py
│   │   ├── system_config_service.py
│   │   ├── system_monitor_service.py
│   │   ├── log_write_service.py
│   │   ├── log_clean_service.py
│   │   └── task_service.py
│   │
│   ├── security/                  # 认证与鉴权
│   │   ├── __init__.py
│   │   ├── jwt_provider.py        # JWT 生成/验证/黑名单
│   │   ├── auth_middleware.py      # JWT 认证中间件
│   │   ├── permission_deps.py     # 权限校验 Depends
│   │   └── security_utils.py      # 获取当前用户等工具
│   │
│   ├── middleware/                 # 中间件
│   │   ├── __init__.py
│   │   ├── api_log.py             # API 请求日志（替代 ApiLogAspect）
│   │   └── cors.py                # CORS 配置
│   │
│   ├── decorators/                # 装饰器
│   │   ├── __init__.py
│   │   └── operation_log.py       # @operation_log 操作审计（替代 @OperationLog 注解）
│   │
│   ├── db/                        # 数据库连接
│   │   ├── __init__.py
│   │   ├── session.py             # AsyncSession 工厂 + get_db 依赖
│   │   └── redis.py               # Redis 连接池
│   │
│   └── utils/                     # 工具类
│       ├── __init__.py
│       ├── ip_utils.py            # 客户端 IP 提取
│       ├── minio_utils.py         # MinIO 操作封装
│       └── captcha_utils.py       # 验证码生成
│
├── alembic/                       # 数据库迁移
│   ├── env.py
│   └── versions/                  # 迁移脚本（初始版本从现有 schema 生成 baseline）
│
├── alembic.ini                    # Alembic 配置
├── pyproject.toml                 # 项目依赖与元数据（uv / poetry）
├── requirements.txt               # pip 依赖锁定
├── .env.example                   # 环境变量模板（不含真实密钥）
├── .env                           # 本地开发环境变量（git 忽略）
├── CLAUDE.md                      # Claude Code 开发指导
└── README.md                      # 项目说明
```

---

## 3. 技术栈与依赖

### 3.1 核心依赖

```toml
[project]
name = "admin-fastapi"
requires-python = ">=3.11"

dependencies = [
    # Web 框架
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.30.0",

    # ORM + 数据库
    "sqlalchemy[asyncio]>=2.0",
    "asyncpg>=0.29.0",           # PostgreSQL 异步驱动
    "alembic>=1.13.0",           # 数据库迁移

    # Redis
    "redis[hiredis]>=5.0.0",     # 异步 Redis 客户端

    # 认证
    "python-jose[cryptography]>=3.3.0",  # JWT
    "passlib[bcrypt]>=1.7.4",    # 密码哈希（兼容 Java BCrypt）

    # 验证码
    "easy-captcha-python>=1.0.0",

    # 对象存储
    "minio>=7.2.0",

    # 系统监控
    "psutil>=5.9.0",

    # 配置管理
    "pydantic-settings>=2.0.0",
    "python-dotenv>=1.0.0",

    # 工具
    "python-multipart>=0.0.9",   # 文件上传支持
    "httpx>=0.27.0",             # HTTP 客户端（测试/内部调用）
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-asyncio>=0.23",
    "ruff>=0.4.0",               # Linter + Formatter
    "mypy>=1.10",
]
```

### 3.2 Python 版本要求

- **最低 Python 3.11**（原生 `tomllib`、更好的异步性能、`ExceptionGroup`）
- 推荐 3.12+

---

## 4. 配置管理

### 4.1 配置文件设计

使用 **Pydantic Settings** + `.env` 文件，对应 Java 的 `application-dev.yml`：

```python
# app/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # 服务器
    app_name: str = "admin-fastapi"
    app_port: int = 8000
    debug: bool = False

    # 数据库（对应 database.* 配置）
    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = "scaffold_spring_dev"  # 复用同一数据库
    db_username: str = "postgres"
    db_password: str = ""
    db_pool_size: int = 20
    db_pool_overflow: int = 5

    # Redis（对应 redis.* 配置）
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_password: str = ""
    redis_db: int = 0
    redis_max_connections: int = 50

    # JWT（对应 jwt.* 配置）
    jwt_secret: str = "dev-secret-key-do-not-use-in-production-please-change-it"
    jwt_access_expiration_ms: int = 300000      # 5 分钟
    jwt_refresh_expiration_ms: int = 604800000   # 7 天

    # CORS
    cors_allowed_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    # MinIO（对应 minio.* 配置）
    minio_endpoint: str = "http://localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket_name: str = "admin-uploads"

    # 日志保留天数（对应 app.log.* 配置）
    log_store_response_body: bool = False
    api_log_retention_days: int = 30
    operation_log_retention_days: int = 90
    login_log_retention_days: int = 90
    error_log_retention_days: int = 60

    # 文件
    recycle_bin_retention_days: int = 7

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}
```

### 4.2 .env 文件模板

```env
# .env.example — 复制为 .env 并填入实际值
# 数据库
DB_HOST=47.109.140.92
DB_PORT=15432
DB_NAME=scaffold_spring_dev
DB_USERNAME=postgres
DB_PASSWORD=your_password_here

# Redis
REDIS_HOST=47.109.140.92
REDIS_PORT=16379
REDIS_PASSWORD=your_password_here
REDIS_DB=0

# JWT
JWT_SECRET=your-256-bit-secret-key
JWT_ACCESS_EXPIRATION_MS=300000
JWT_REFRESH_EXPIRATION_MS=604800000

# MinIO
MINIO_ENDPOINT=https://oss.wqysb.xyz
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=your_password_here
MINIO_BUCKET_NAME=admin-uploads
```

---

## 5. 关键基础设施设计

### 5.1 统一响应格式 `R<T>`

必须与 Java 版 `R<T>` 输出格式完全一致：

```python
# app/common/response.py
from typing import Any, Generic, TypeVar
from pydantic import BaseModel

T = TypeVar("T")

class R(BaseModel, Generic[T]):
    code: int = 200
    message: str = "success"
    data: T | None = None

    @classmethod
    def ok(cls, data: Any = None, message: str = "success") -> "R":
        return cls(code=200, message=message, data=data)

    @classmethod
    def error(cls, code: int = 500, message: str = "服务器内部错误") -> "R":
        return cls(code=code, message=message, data=None)
```

### 5.2 分页模型

对应 MyBatis-Plus 的 `Page<T>` 响应格式（前端依赖这些字段名）：

```python
# app/common/pagination.py
class PageResult(BaseModel, Generic[T]):
    records: list[T] = []
    total: int = 0
    size: int = 10
    current: int = 1
    pages: int = 0
```

### 5.3 全局异常处理

```python
# app/common/exceptions.py
class BusinessException(Exception):
    def __init__(self, code: int = 400, message: str = "请求错误"):
        self.code = code
        self.message = message

# 在 main.py 中注册
@app.exception_handler(BusinessException)
async def business_exception_handler(request, exc):
    return JSONResponse(content=R.error(exc.code, exc.message).model_dump())

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(content=R.error(400, "参数校验失败").model_dump())

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    # 写入 error_log 表
    asyncio.create_task(write_error_log(request, exc))
    return JSONResponse(content=R.error(500, "服务器内部错误").model_dump())
```

### 5.4 SQLAlchemy Base 模型

对应 Java 的 `BaseEntity`，映射到现有表结构：

```python
# app/models/base.py
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import BigInteger, Integer, DateTime, func

class Base(DeclarativeBase):
    pass

class BaseEntity(Base):
    __abstract__ = True

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    create_time: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    update_time: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    is_deleted: Mapped[int] = mapped_column(Integer, default=0)
```

### 5.5 逻辑删除查询过滤器

全局自动追加 `WHERE is_deleted = 0`，对应 MyBatis-Plus 的 `@TableLogic`：

```python
# 方案：SQLAlchemy event 或 自定义查询基类
# 删除操作使用 UPDATE SET is_deleted=1，不做物理删除
```

### 5.6 数据库 Session 管理

```python
# app/db/session.py
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

engine = create_async_engine(
    f"postgresql+asyncpg://{settings.db_username}:{settings.db_password}"
    f"@{settings.db_host}:{settings.db_port}/{settings.db_name}",
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_pool_overflow,
)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session
```

---

## 6. 安全体系设计

### 6.1 JWT 认证中间件

对应 `JwtAuthenticationFilter`，作为 Starlette 中间件：

```python
# app/security/auth_middleware.py
@app.middleware("http")
async def jwt_auth_middleware(request: Request, call_next):
    if is_public_path(request.url.path):
        return await call_next(request)

    token = extract_bearer_token(request)
    if not token:
        return JSONResponse(status_code=401, content=R.error(401, "未认证").model_dump())

    try:
        payload = jwt_provider.verify_token(token)
        if not jwt_provider.is_access_token(payload):
            return JSONResponse(status_code=401, content=R.error(401, "无效的访问令牌").model_dump())
        if await jwt_provider.is_in_blacklist(token):
            return JSONResponse(status_code=401, content=R.error(401, "令牌已失效").model_dump())
        request.state.user_id = payload["user_id"]
        request.state.username = payload["username"]
    except JWTError:
        return JSONResponse(status_code=401, content=R.error(401, "令牌无效或已过期").model_dump())

    return await call_next(request)
```

### 6.2 权限校验依赖

对应 `PermissionAuthorizationFilter`，使用 FastAPI `Depends`：

```python
# app/security/permission_deps.py
async def require_permission(request: Request, db: AsyncSession = Depends(get_db)):
    user_id = request.state.user_id
    method = request.method
    path = request.url.path
    if not await rbac_service.check_permission(db, user_id, method, path):
        raise BusinessException(403, "无访问权限")
```

### 6.3 公开路径白名单

对应 `SecurityConstants.PUBLIC_PATHS`：

```python
# app/common/security_constants.py
PUBLIC_PATHS = [
    "/health",
    "/api/admin/auth/",          # auth 下所有路径
    "/docs",                     # Swagger UI
    "/redoc",                    # ReDoc
    "/openapi.json",             # OpenAPI spec
    "/api-docs",                 # 兼容 Java 版路径
    "/api/admin/system-config/public",
]
```

### 6.4 当前用户获取

对应 `SecurityUtils`：

```python
# app/security/security_utils.py
async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> AdminUser:
    user_id = request.state.user_id
    user = await db.get(AdminUser, user_id)
    if not user or user.is_deleted:
        raise BusinessException(401, "用户不存在")
    return user

async def get_current_user_id(request: Request) -> int:
    return request.state.user_id
```

---

## 7. OpenAPI 文档兼容

### 7.1 关键配置

FastAPI 原生 OpenAPI 必须输出与 SpringDoc 一致的格式，供 orval 消费：

```python
# app/main.py
app = FastAPI(
    title="Admin Backend",
    version="1.0.0",
    docs_url="/swagger-ui.html",     # 兼容 Java 路径
    redoc_url="/redoc",
    openapi_url="/api-docs",         # 兼容 Java 的 /api-docs 路径
)
```

### 7.2 Router Tag 与 operationId

每个 Router 必须指定 `tags`，每个端点必须指定 `operation_id`，与 Java 版保持一致：

```python
router = APIRouter(prefix="/api/admin/roles", tags=["Roles"])

@router.get("", operation_id="listRoles", summary="分页查询角色列表")
async def list_roles(page_num: int = 1, page_size: int = 10, keyword: str | None = None):
    ...

@router.get("/{id}", operation_id="getRoleDetail", summary="获取角色详情")
async def get_role_detail(id: int):
    ...
```

### 7.3 Pydantic Schema 与 `@Schema` 对齐

Java DTO/VO 的 `@Schema(description=...)` 对应 Pydantic 的 `Field(description=...)`：

```python
class CreateRoleDTO(BaseModel):
    name: str = Field(..., description="角色名称")
    code: str = Field(..., description="角色编码（唯一）")
    description: str | None = Field(None, description="角色描述")
    status: int = Field(1, description="状态：1-启用，0-禁用")
```

### 7.4 响应模型声明

必须显式声明 `response_model` 使 OpenAPI 输出完整 schema：

```python
@router.get("", operation_id="listRoles", response_model=R[PageResult[RoleBaseVO]])
async def list_roles(...):
    ...
```

---

## 8. 中间件与装饰器

### 8.1 API 日志中间件（替代 ApiLogAspect）

```python
# app/middleware/api_log.py
@app.middleware("http")
async def api_log_middleware(request: Request, call_next):
    # 排除 swagger、health、api-docs 等路径
    if should_skip_log(request.url.path):
        return await call_next(request)

    start = time.time()
    body = await request.body()
    response = await call_next(request)
    duration_ms = (time.time() - start) * 1000

    # 异步写入日志，不阻塞响应
    asyncio.create_task(write_api_log(request, response, body, duration_ms))
    return response
```

### 8.2 操作审计装饰器（替代 @OperationLog 注解）

```python
# app/decorators/operation_log.py
def operation_log(module: str, op_type: str, description: str = ""):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            result = await func(*args, **kwargs)
            # 从 kwargs 中提取 request 获取用户信息
            request = kwargs.get("request") or next(
                (a for a in args if isinstance(a, Request)), None
            )
            asyncio.create_task(
                write_operation_log(request, module, op_type, description, kwargs)
            )
            return result
        return wrapper
    return decorator

# 使用示例
@operation_log(module="用户管理", op_type="CREATE")
async def create_user(request: Request, dto: CreateAdminUserDTO, db: AsyncSession):
    ...
```

---

## 9. 分阶段实施计划

### Phase 1：项目骨架与基础设施

**目标**：搭建可运行的 FastAPI 项目，完成数据库连接与基础中间件

| 任务 | 具体内容 |
|------|---------|
| 项目初始化 | `pyproject.toml`、目录结构、`.env.example`、`.gitignore` |
| 配置管理 | Pydantic Settings + `.env` 读取 |
| 数据库连接 | AsyncSession 工厂、`get_db` 依赖 |
| Redis 连接 | 异步 Redis 连接池 |
| SQLAlchemy 模型 | 全部 17 个 Entity 映射到现有表（不建新表） |
| Alembic 初始化 | 从现有 schema 生成 baseline，后续增量迁移 |
| 统一响应 | `R<T>` + `PageResult<T>` + `ResultCode` |
| 全局异常处理 | BusinessException + 校验异常 + 兜底异常 |
| CORS 中间件 | 对应 `CorsConfig.java` |
| Health 端点 | `GET /health` |

**验收标准**：`uvicorn app.main:app` 启动成功，`/health` 返回 200，`/api-docs` 输出 OpenAPI JSON

### Phase 2：认证安全体系

**目标**：完成 JWT 认证 + RBAC 鉴权，可登录并访问受保护接口

| 任务 | 具体内容 |
|------|---------|
| JWT Provider | 生成/验证 Access & Refresh Token，Token 黑名单（Redis） |
| 验证码 | `easy-captcha-python` 生成 + Redis 存储 |
| Auth Router | 登录 / 登出 / 刷新 / 获取当前用户 / 验证码 / 头像上传 |
| JWT 中间件 | Bearer Token 提取 → 验证 → `request.state` 注入 |
| RBAC Service | 权限检查（通配符匹配、用户覆写、超管跳过） |
| 权限 Depends | `require_permission` 依赖注入 |
| Security Utils | `get_current_user` / `get_current_user_id` / `is_superuser` |

**验收标准**：前端可登录、刷新 Token、登出；非授权接口返回 403

### Phase 3：核心 CRUD 模块

**目标**：完成用户/角色/权限/菜单管理

| 任务 | 具体内容 |
|------|---------|
| 用户管理 | 分页列表 / 详情 / 创建 / 更新 / 删除 / 批量删除 / 分配角色 |
| 角色管理 | 分页列表 / 详情 / 创建 / 更新 / 删除 / 同步权限 / 同步菜单 |
| 权限管理 | 列表（分组） / 同步（脚本） |
| 菜单管理 | 树形列表 / 创建 / 更新 / 删除 / 排序 |
| 用户权限覆写 | 查看用户权限概览 / 同步覆写 |

**验收标准**：前端用户/角色/权限/菜单页面全部功能正常

### Phase 4：日志与审计

**目标**：完成四类日志体系

| 任务 | 具体内容 |
|------|---------|
| API 日志中间件 | 全局请求日志异步写入 |
| 操作审计装饰器 | Service CUD 方法标注 `@operation_log` |
| 异常日志 | 全局异常处理器自动写入 |
| 登录日志 | Auth Service 登录成功/失败时写入 |
| 日志查询 Router | API 日志 / 登录日志 / 操作日志 / 异常日志 分页查询 |

**验收标准**：前端日志管理页面数据正常显示

### Phase 5：辅助功能模块

**目标**：完成通知、文件、配置、监控、统计、在线用户、定时任务

| 任务 | 具体内容 |
|------|---------|
| 通知公告 | CRUD + 发布/撤回 |
| 文件管理 | MinIO 上传/下载/删除/列表/回收站/presigned URL |
| 系统配置 | KV 配置 CRUD + 公开配置接口 |
| 系统监控 | psutil 获取 CPU/内存/磁盘信息 |
| 仪表盘统计 | 聚合查询 |
| 在线用户 | Redis 会话管理 + 强制下线 |
| 定时任务 | APScheduler 动态调度 + 执行日志 |
| 日志清理 | 定时清理过期日志 |

**验收标准**：前端所有页面功能正常

### Phase 6：联调验证与切换

**目标**：全量 API 对比，前端无缝切换

| 任务 | 具体内容 |
|------|---------|
| API 契约对比 | 逐一对比 Java/Python 版 OpenAPI spec（路径/参数/响应） |
| orval 重新生成 | 指向 Python 后端，生成到 `src/api/generated/` |
| 前端引用替换 | `javaedition/` → `generated/` 逐步替换 |
| 回归测试 | 全部前端页面功能回归 |
| 性能基准 | 关键接口响应时间对比 |

---

## 10. OpenAPI 对齐检查清单

每个 Router 实现完成后，必须逐一对照检查：

- [ ] 路径完全一致（如 `/api/admin/roles/{id}` 不是 `/api/admin/roles/{role_id}`）
- [ ] HTTP 方法一致
- [ ] `operation_id` 与 Java `@Operation(operationId=...)` 一致
- [ ] `tags` 与 Java `@Tag(name=...)` 一致
- [ ] Query 参数名一致（如 `pageNum` 不是 `page_num`）
- [ ] Request Body JSON 字段名一致（使用 Pydantic `alias` 或 `model_config` 处理驼峰）
- [ ] Response Body JSON 字段名一致（驼峰命名）
- [ ] 分页响应字段名一致（`records`/`total`/`size`/`current`/`pages`）
- [ ] 可选字段对齐（Java `@Schema` 中标注的 required 与否）

### 驼峰命名兼容

Java 默认 camelCase，Python 默认 snake_case。Pydantic 需全局配置：

```python
from pydantic import ConfigDict

class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,       # snake_case → camelCase
        populate_by_name=True,          # 允许 snake_case 输入
        json_schema_extra=None,
    )
```

---

## 11. Git 忽略配置

在根 `.gitignore` 中增加 Python 相关规则：

```gitignore
# Python / FastAPI
admin-fastapi/__pycache__/
admin-fastapi/**/__pycache__/
admin-fastapi/*.pyc
admin-fastapi/.venv/
admin-fastapi/venv/
admin-fastapi/.env
admin-fastapi/.env.local
admin-fastapi/dist/
admin-fastapi/*.egg-info/

# Alembic
admin-fastapi/alembic/versions/*.pyc

# IDE
*.py[cod]
__pycache__/
.mypy_cache/
.ruff_cache/
.pytest_cache/
```

---

## 12. Python 代码规范（初始版，随开发迭代完善）

### 12.1 分层原则

与 Java 版一致，严格分层：

| 层级 | 目录 | 职责 | 禁止 |
|------|------|------|------|
| Router | `routers/` | 接收参数 → 调 Service → 返回结果 | 业务逻辑、直接操作数据库 |
| Service | `services/` | 业务逻辑、事务管理 | 直接返回 HTTP 响应 |
| Model | `models/` | ORM 映射 | 业务逻辑 |
| Schema | `schemas/` | 请求/响应数据校验 | 业务逻辑 |

### 12.2 命名规范

| 对象 | 规范 | 示例 |
|------|------|------|
| 文件名 | snake_case | `user_service.py` |
| 类名 | PascalCase | `AdminUserService` |
| 函数/方法 | snake_case | `create_user()` |
| 常量 | UPPER_SNAKE | `TOKEN_BLACKLIST` |
| Pydantic Schema | PascalCase + 用途后缀 | `CreateRoleDTO` / `RoleBaseVO` |
| SQLAlchemy Model | PascalCase（与表名映射） | `AdminUser`（`__tablename__ = "admin_user"`） |

### 12.3 异步规范

- 所有数据库操作使用 `async/await`
- 所有 Redis 操作使用 `async/await`
- 日志写入使用 `asyncio.create_task()` 异步执行
- MinIO 操作在 `run_in_executor` 中执行（官方 SDK 不支持 async）

### 12.4 依赖注入

- 使用 FastAPI `Depends()` 进行依赖注入
- `get_db` → AsyncSession
- `get_current_user` → AdminUser
- `get_current_user_id` → int
- `require_permission` → None（仅校验）

### 12.5 错误处理

- Router 层不使用 try-catch
- Service 层抛出 `BusinessException(code, message)`
- 全局异常处理器统一兜底
- 错误信息不透传内部实现细节

---

## 13. 前端对接流程

### 13.1 开发阶段

1. Python 后端实现某个 Router 后，启动服务
2. 浏览器访问 `http://localhost:8000/api-docs` 确认 OpenAPI JSON 输出正确
3. 用户运行 `npm run generate:api`（orval 指向 Python 后端）
4. 生成到 `src/api/generated/`，对比 `javaedition/` 中的函数名与类型
5. 前端替换 import 路径

### 13.2 orval 配置调整

```javascript
// orval.config.js — 切换到 Python 后端
module.exports = {
  adminApi: {
    input: {
      target: 'http://localhost:8000/api-docs',  // 改为 FastAPI 端口
    },
    output: {
      target: './src/api/generated/endpoints.ts',  // 输出到 generated/
      schemas: './src/api/generated/model',
      // ... 其余不变
    },
  },
};
```

### 13.3 兼容性验证

- 对比两版 OpenAPI spec 的 diff，确保路径/参数/响应完全一致
- 重点检查：`operationId`（决定前端函数名）、字段驼峰命名、分页字段名

---

## 14. 附录：Java → Python 文件映射表

| Java 文件 | Python 文件 | 说明 |
|-----------|------------|------|
| `AdminApplication.java` | `app/main.py` | 入口 |
| `R.java` | `app/common/response.py` | 统一响应 |
| `ResultCode.java` | `app/common/result_code.py` | 状态码枚举 |
| `BusinessException.java` | `app/common/exceptions.py` | 业务异常 |
| `BaseEntity.java` | `app/models/base.py` | ORM 基类 |
| `PageResult.java` | `app/common/pagination.py` | 分页模型 |
| `RedisKeys.java` | `app/common/redis_keys.py` | Redis Key |
| `SecurityConstants.java` | `app/common/security_constants.py` | 公开路径 |
| `SecurityConfig.java` | `app/main.py`（中间件注册） | 安全配置 |
| `JwtTokenProvider.java` | `app/security/jwt_provider.py` | JWT 工具 |
| `JwtAuthenticationFilter.java` | `app/security/auth_middleware.py` | 认证中间件 |
| `PermissionAuthorizationFilter.java` | `app/security/permission_deps.py` | 权限依赖 |
| `GlobalExceptionHandler.java` | `app/common/exceptions.py` | 异常处理器 |
| `ApiLogAspect.java` | `app/middleware/api_log.py` | API 日志 |
| `OperationLogAspect.java` | `app/decorators/operation_log.py` | 操作审计 |
| `CorsConfig.java` | `app/middleware/cors.py` | CORS |
| `AsyncConfig.java` | `asyncio.create_task()` | Python 原生异步 |
| `MinIOConfig.java` | `app/config.py` + `app/utils/minio_utils.py` | MinIO |
| `RedisConfig.java` | `app/db/redis.py` | Redis |
| `*Controller.java` | `app/routers/*.py` | API 路由 |
| `*ServiceImpl.java` | `app/services/*.py` | 业务逻辑 |
| `*Mapper.java` | SQLAlchemy 查询（内联于 Service） | 数据访问 |
| `model/entity/*.java` | `app/models/*.py` | ORM 模型 |
| `model/dto/*.java` | `app/schemas/*.py` | 请求校验 |
| `model/vo/*.java` | `app/schemas/*.py` | 响应模型 |
| `IpUtils.java` | `app/utils/ip_utils.py` | IP 提取 |
| `AuthCaptchaUtil.java` | `app/utils/captcha_utils.py` | 验证码 |
| `MinioUtils.java` | `app/utils/minio_utils.py` | MinIO 封装 |
| `SecurityUtils.java` | `app/security/security_utils.py` | 用户工具 |
| `DynamicTaskScheduler.java` | `app/services/task_service.py` | APScheduler |
| `application.yml` | `app/config.py` + `.env` | 配置 |
| `db/migration/V*.sql` | `alembic/versions/` | 迁移脚本 |
