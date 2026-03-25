"""认证路由，对应 Java AuthController.java。

端点：验证码、登录、刷新、登出、获取当前用户、头像上传。
"""

from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.response import R
from app.db.session import get_db
from app.models.user import AdminUser
from app.schemas.auth import CaptchaVO, LoginDTO, LoginVO, RefreshTokenDTO, UserVO
from app.security.security_utils import get_current_user
from app.services import auth_service
from app.utils.ip_utils import get_client_ip

router = APIRouter(prefix="/api/admin/auth", tags=["auth"])


@router.get("/captcha", operation_id="getCaptcha", summary="获取图形验证码")
async def get_captcha() -> R[CaptchaVO]:
    vo = await auth_service.do_generate_captcha()
    return R.ok(data=vo)


@router.post("/login", operation_id="login", summary="用户登录")
async def login(
    dto: LoginDTO,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> R[LoginVO]:
    ip = get_client_ip(request)
    user_agent = request.headers.get("User-Agent", "")
    vo = await auth_service.do_login(dto, db, ip, user_agent)
    return R.ok(data=vo)


@router.post("/refresh", operation_id="refreshToken", summary="刷新Token")
async def refresh_token(
    dto: RefreshTokenDTO,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> R[LoginVO]:
    ip = get_client_ip(request)
    user_agent = request.headers.get("User-Agent", "")
    vo = await auth_service.do_refresh_token(dto, db, ip, user_agent)
    return R.ok(data=vo)


@router.post("/logout", operation_id="logout", summary="用户登出")
async def logout(authorization: str = Header(...)) -> R[None]:
    await auth_service.do_logout(authorization)
    return R.ok()


@router.get("/me", operation_id="getCurrentUser", summary="获取当前用户信息")
async def get_current_user_info(
    user: AdminUser = Depends(get_current_user),
) -> R[UserVO]:
    vo = UserVO(
        id=user.id,
        username=user.username,
        email=user.email,
        nickname=user.nickname,
        avatar=user.avatar,
        status=user.status,
        is_superuser=user.is_superuser,
        create_time=user.create_time,
    )
    return R.ok(data=vo)
