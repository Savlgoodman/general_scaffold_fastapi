"""当前用户工具，对应 Java SecurityUtils.java。

提供 FastAPI Depends 依赖，从 request.state 获取当前用户。
"""

from fastapi import Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.exceptions import BusinessException
from app.common.result_code import ResultCode
from app.db.session import get_db
from app.models.user import AdminUser


async def get_current_user_id(request: Request) -> int:
    """从 request.state 获取当前用户 ID（需 JWT 中间件先注入）。"""
    user_id = getattr(request.state, "user_id", None)
    if user_id is None:
        raise BusinessException(ResultCode.UNAUTHORIZED, "未认证")
    return user_id


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> AdminUser:
    """获取当前登录用户完整对象。"""
    user_id = await get_current_user_id(request)
    result = await db.execute(
        select(AdminUser).where(AdminUser.id == user_id, AdminUser.is_deleted == 0)
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise BusinessException(ResultCode.UNAUTHORIZED, "用户不存在")
    return user


def is_superuser(user: AdminUser) -> bool:
    return user.is_superuser is not None and user.is_superuser == 1
