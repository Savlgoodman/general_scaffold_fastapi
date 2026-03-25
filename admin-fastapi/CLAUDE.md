# CLAUDE.md

本文件为 Claude Code 提供 FastAPI 后端的开发指导。

## 构建与运行命令

```bash
# 安装依赖（conda 环境已由用户管理）
pip install -r requirements.txt

# 开发模式运行
uvicorn app.main:app --reload --port 8000

# 生产模式运行
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Alembic 迁移
alembic upgrade head              # 执行迁移
alembic revision --autogenerate -m "描述"  # 生成迁移脚本
```

## 架构说明

### 分层结构

- `app/routers/` — API 路由层，路由前缀 `/api/admin/*`
- `app/services/` — 业务逻辑层
- `app/models/` — SQLAlchemy ORM 模型（映射到现有数据库表）
- `app/schemas/` — Pydantic 模型（请求 DTO + 响应 VO）
- `app/security/` — JWT 认证中间件、权限依赖、工具
- `app/middleware/` — HTTP 中间件（API 日志、CORS）
- `app/decorators/` — 函数装饰器（操作审计）
- `app/common/` — 公共组件（响应格式、异常、枚举、常量）
- `app/db/` — 数据库和 Redis 连接管理
- `app/utils/` — 无状态工具类

### MVC 分层原则

**严格分层，与 Java 版一致：**

- **Router 层**：只负责接收参数 → 调 Service → 返回结果。禁止业务逻辑。
- **Service 层**：所有业务逻辑、事务管理。通过 SQLAlchemy Session 操作数据库。
- **Model 层**：ORM 映射。禁止业务逻辑。
- **Schema 层**：请求/响应数据校验。禁止业务逻辑。

### 关键约定

**数据库表名**：所有表以 `admin_` 为前缀。使用现有 PostgreSQL 数据库，不修改表结构。

**逻辑删除**：通过 `is_deleted` 字段实现。查询时手动添加 `where(Model.is_deleted == 0)`，删除时 `update set is_deleted = 1`。

**统一响应格式**：`R[T]` 包装，始终返回 `{code, message, data}`。使用 `R.ok(data)` 或 `R.error(ResultCode.XXX)`。

**BaseEntity**：所有模型继承 `BaseEntity`（id、create_time、update_time、is_deleted）。

**依赖注入**：使用 FastAPI `Depends()` 注入数据库会话、当前用户等。

**异常处理**：
- Router 层禁止 try-catch
- Service 层抛 `BusinessException(ResultCode.XXX, "用户友好的消息")`
- 全局异常处理器统一兜底

**OpenAPI 注解**：
- 每个 Router 必须指定 `tags`
- 每个端点必须指定 `operation_id`（与 Java 版一致）
- Schema 使用 Pydantic `Field(description="...")` 提供文档

**驼峰命名**：API 请求/响应 JSON 使用 camelCase（通过 Pydantic alias），Python 代码内部使用 snake_case。

**Redis Key**：使用 `RedisKeys` 枚举构建，与 Java 版 Key 前缀完全一致。

**密码加密**：`passlib[bcrypt]`，与 Java BCrypt 兼容。

### 操作审计日志

所有 CUD Service 方法使用 `@operation_log` 装饰器：

```python
@operation_log(module="用户管理", op_type="CREATE")
async def create_user(self, dto, db, request): ...
```

### 获取当前用户

```python
from app.security.security_utils import get_current_user, get_current_user_id

@router.get("/me")
async def me(user: AdminUser = Depends(get_current_user)): ...
```

## Git 提交规范

与项目根 CLAUDE.md 一致：Conventional Commits，中文描述，原子化提交。
