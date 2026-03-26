import logging
import traceback

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware

from app.common.exceptions import BusinessException
from app.common.response import R
from app.common.result_code import ResultCode
from app.config import get_settings
from app.db.redis import redis_client
from app.routers import admin_user_permissions, admin_users, auth, health, menus, permissions, roles
from app.security.auth_middleware import JwtAuthMiddleware

logger = logging.getLogger(__name__)
settings = get_settings()


# ── Lifespan ──────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """启动/关闭时的资源管理"""
    logger.info("admin-fastapi starting up...")
    yield
    # 关闭 Redis 连接
    await redis_client.aclose()
    logger.info("admin-fastapi shut down.")


# ── App 实例 ──────────────────────────────────────────────
app = FastAPI(
    title="Admin Backend",
    version="1.0.0",
    docs_url="/swagger-ui.html",
    redoc_url="/redoc",
    openapi_url="/api-docs",
    lifespan=lifespan,
)


# ── 中间件（注意：注册顺序与执行顺序相反）─────────────
# 最后注册的最先执行：CORS → JWT Auth
app.add_middleware(JwtAuthMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── 全局异常处理（对应 GlobalExceptionHandler.java）──────
@app.exception_handler(BusinessException)
async def business_exception_handler(request: Request, exc: BusinessException):
    logger.warning("业务异常: code=%s, message=%s", exc.code, exc.message)
    return JSONResponse(
        status_code=200,
        content=R.error(exc.code, exc.message).model_dump(),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    messages = []
    for err in errors:
        loc = " -> ".join(str(l) for l in err.get("loc", []))
        messages.append(f"{loc}: {err.get('msg', '')}")
    message = "; ".join(messages) if messages else "参数校验失败"
    logger.warning("参数校验异常: %s", message)
    return JSONResponse(
        status_code=200,
        content=R.error(ResultCode.PARAM_ERROR, message).model_dump(),
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error("系统异常: %s", traceback.format_exc())
    return JSONResponse(
        status_code=200,
        content=R.error(ResultCode.INTERNAL_SERVER_ERROR, "系统内部错误，请稍后重试").model_dump(),
    )


# ── 路由注册 ──────────────────────────────────────────────
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(admin_users.router)
app.include_router(roles.router)
app.include_router(permissions.router)
app.include_router(menus.router)
app.include_router(admin_user_permissions.router)
