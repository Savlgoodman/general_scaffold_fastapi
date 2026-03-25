"""权限校验依赖，对应 Java PermissionAuthorizationFilter.java。

作为 FastAPI Depends 使用，在需要权限校验的 Router 上挂载。
"""

import logging

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.exceptions import BusinessException
from app.common.result_code import ResultCode
from app.db.session import get_db
from app.services.rbac_service import check_permission

logger = logging.getLogger(__name__)


async def require_permission(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> None:
    """权限校验依赖：检查当前用户是否有访问当前接口的权限。"""
    user_id = getattr(request.state, "user_id", None)
    if user_id is None:
        raise BusinessException(ResultCode.UNAUTHORIZED, "未登���")

    path = request.url.path
    method = request.method

    has_perm = await check_permission(db, user_id, path, method)
    if not has_perm:
        logger.debug("用户 %s 无权访问 %s %s", user_id, method, path)
        raise BusinessException(ResultCode.FORBIDDEN, "无权访问该接口")
