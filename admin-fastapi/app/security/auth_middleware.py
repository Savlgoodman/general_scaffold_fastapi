"""JWT 认证中间件，对应 Java JwtAuthenticationFilter.java。

从 Authorization 头提取 Bearer Token → 验证 → 注入 request.state。
"""

import logging

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.common.response import R
from app.common.result_code import ResultCode
from app.common.security_constants import is_public_path
from app.security import jwt_provider

logger = logging.getLogger(__name__)


class JwtAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # 公开路径直接放行
        if is_public_path(path):
            return await call_next(request)

        # 提取 Bearer Token
        token = _extract_bearer_token(request)
        if not token:
            return _unauthorized("未提供认证令牌")

        # 验证 Token
        payload = jwt_provider.verify_token(token)
        if payload is None:
            return _unauthorized("令牌无效或已过期")

        if not jwt_provider.is_access_token(payload):
            return _unauthorized("无效的访问令牌")

        # 检��黑名单
        if await jwt_provider.is_in_blacklist(token):
            return _unauthorized("令牌已失效")

        # 注入用户信息到 request.state
        request.state.user_id = jwt_provider.get_user_id(payload)
        request.state.username = jwt_provider.get_username(payload)
        request.state.token = token

        return await call_next(request)


def _extract_bearer_token(request: Request) -> str | None:
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:]
    return None


def _unauthorized(message: str) -> JSONResponse:
    """返回 HTTP 401，前端拦截器依赖 HTTP 状态码触发 token 刷新。"""
    return JSONResponse(
        status_code=401,
        content=R.error(ResultCode.UNAUTHORIZED, message).model_dump(),
    )
