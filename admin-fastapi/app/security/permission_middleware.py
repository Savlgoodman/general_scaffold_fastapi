"""权限授权中间件，对应 Java PermissionAuthorizationFilter。

在 JWT 认证之后执行，检查用户是否有访问当前接口的权限。
使用 Redis 缓存（30s TTL）避免每次请求都查数据库。
"""

import json
import logging
import time

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.common.response import R
from app.common.result_code import ResultCode
from app.common.security_constants import is_public_path
from app.db.redis import redis_client
from app.db.session import async_session_factory
from app.services.rbac_service import check_permission

logger = logging.getLogger(__name__)

_CACHE_TTL = 30  # 权限缓存 30 秒
_CACHE_PREFIX = "perm:check:"


class PermissionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # 公开路径跳过
        if is_public_path(path):
            return await call_next(request)

        # 非 /api/ 路径跳过
        if not path.startswith("/api/"):
            return await call_next(request)

        # 未认证跳过
        user_id = getattr(request.state, "user_id", None)
        if user_id is None:
            return await call_next(request)

        method = request.method
        t0 = time.perf_counter()
        has_perm = await _check_with_cache(user_id, path, method)
        request.state._timing_perm_ms = (time.perf_counter() - t0) * 1000

        if not has_perm:
            logger.debug("用户 %s 无权访问 %s %s", user_id, method, path)
            return JSONResponse(
                status_code=403,
                content=R.error(ResultCode.FORBIDDEN, "无权访问该接口").model_dump(),
            )

        return await call_next(request)


async def _check_with_cache(user_id: int, path: str, method: str) -> bool:
    """带 Redis 缓存的权限校验。"""
    cache_key = f"{_CACHE_PREFIX}{user_id}:{method}:{path}"

    # 先查缓存
    cached = await redis_client.get(cache_key)
    if cached is not None:
        return cached == "1"

    # 缓存未命中，查数据库
    async with async_session_factory() as db:
        has_perm = await check_permission(db, user_id, path, method)

    # 写入缓存
    await redis_client.set(cache_key, "1" if has_perm else "0", ex=_CACHE_TTL)
    return has_perm
