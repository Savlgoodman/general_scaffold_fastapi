"""在线用户管理路由，对应 Java OnlineUserController。"""

from fastapi import APIRouter

from app.common.response import R
from app.schemas.online_user import OnlineUserVO
from app.services import online_user_service

router = APIRouter(prefix="/api/admin/monitor/online-users", tags=["online-users"])


@router.get("", operation_id="listOnlineUsers", summary="在线用户列表")
async def list_online_users() -> R[list[OnlineUserVO]]:
    users = await online_user_service.list_online_users()
    return R.ok(data=users)


@router.delete("/{userId}", operation_id="forceUserOffline", summary="强制用户下线")
async def force_user_offline(userId: int) -> R[None]:
    await online_user_service.force_offline(userId)
    return R.ok()
