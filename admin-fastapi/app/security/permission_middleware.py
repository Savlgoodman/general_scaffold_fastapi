"""权限授权中间件，对应 Java PermissionAuthorizationFilter。

在 JWT 认证之后执行，检查用户是否有访问当前接口的权限。
"""

import logging

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.common.response import R
from app.common.result_code import ResultCode
from app.common.security_constants import is_public_path
from app.db.session import async_session_factory
from app.services.rbac_service import check_permission

logger = logging.getLogger(__name__)


class PermissionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # 公开路径跳过
        if is_public_path(path):
            return await call_next(request)

        # 非 /api/ 路径跳过（docs、静态资源等）
        if not path.startswith("/api/"):
            return await call_next(request)

        # 未认证的请求跳过（JWT 中间件已处理）
        user_id = getattr(request.state, "user_id", None)
        if user_id is None:
            return await call_next(request)

        # 权限校验
        method = request.method
        async with async_session_factory() as db:
            has_perm = await check_permission(db, user_id, path, method)

        if not has_perm:
            logger.debug("用户 %s 无权访问 %s %s", user_id, method, path)
            return JSONResponse(
                status_code=403,
                content=R.error(ResultCode.FORBIDDEN, "无权访问该接口").model_dump(),
            )

        return await call_next(request)
