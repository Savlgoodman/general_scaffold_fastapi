import asyncio
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
from app.middleware.api_log import ApiLogMiddleware
from app.routers import (
    admin_user_permissions, admin_users, api_logs, auth, error_logs,
    health, login_logs, menus, operation_logs, permissions, roles,
)
from app.security.auth_middleware import JwtAuthMiddleware
from app.services.log_write_service import write_error_log
from app.utils.ip_utils import get_client_ip

logger = logging.getLogger(__name__)
settings = get_settings()


# ── Lifespan ──────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """启动/关闭时的资源管理"""
    logger.info("admin-fastapi starting up...")
    yield
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


# ── 中间件（注册顺序与执行顺序相反）─────────────────────
# 执行顺序：CORS → API Log → JWT Auth → Router
app.add_middleware(JwtAuthMiddleware)
app.add_middleware(ApiLogMiddleware)
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
    tb = traceback.format_exc()
    logger.error("系统异常: %s", tb)

    # 异步写入异常日志到数据库
    asyncio.create_task(
        write_error_log(
            level="ERROR",
            exception_class=type(exc).__name__,
            exception_message=str(exc),
            stack_trace=tb,
            request_path=request.url.path,
            request_method=request.method,
            request_params=str(request.query_params) if request.query_params else None,
            user_id=getattr(request.state, "user_id", None),
            ip=get_client_ip(request),
        )
    )

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
app.include_router(api_logs.router)
app.include_router(login_logs.router)
app.include_router(operation_logs.router)
app.include_router(error_logs.router)
