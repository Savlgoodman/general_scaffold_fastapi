"""API 请求日志中间件，对应 Java ApiLogAspect。

记录所有 /api/ 开头请求的方法、路径、参数、耗时、IP。
"""

import asyncio
import logging
import time

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.config import get_settings
from app.services.log_write_service import write_api_log
from app.utils.ip_utils import get_client_ip

logger = logging.getLogger(__name__)

settings = get_settings()

# 跳过日志记录的路径前缀
_SKIP_PREFIXES = (
    "/health",
    "/swagger-ui",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/api-docs",
)


class ApiLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path

        # 跳过非业务路径
        if any(path.startswith(p) for p in _SKIP_PREFIXES):
            return await call_next(request)

        # 只记录 /api/ 路径
        if not path.startswith("/api/"):
            return await call_next(request)

        start = time.time()

        # 读取请求体
        body_bytes = await request.body()
        request_body = body_bytes.decode("utf-8", errors="replace") if body_bytes else None

        # 执行请求
        response = await call_next(request)

        duration_ms = int((time.time() - start) * 1000)

        # 提取用户信息
        user_id = getattr(request.state, "user_id", None)
        username = getattr(request.state, "username", None)

        # 异步写入日志
        asyncio.create_task(
            write_api_log(
                user_id=user_id,
                username=username,
                method=request.method,
                path=path,
                query_params=str(request.query_params) if request.query_params else None,
                request_body=request_body,
                response_code=response.status_code,
                response_body=None,  # 默认不存储响应体
                duration_ms=duration_ms,
                ip=get_client_ip(request),
                user_agent=request.headers.get("User-Agent", ""),
            )
        )

        return response
