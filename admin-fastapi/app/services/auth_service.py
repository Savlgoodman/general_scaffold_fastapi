"""认证服务，对应 Java AuthServiceImpl.java。

包括：验证码生成、登录、登出、刷新 Token、在线会话管理。
"""

import json
import logging
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.exceptions import BusinessException
from app.common.redis_keys import RedisKeys
from app.common.result_code import ResultCode
from app.config import get_settings
from app.db.redis import redis_client
from app.models.logs import AdminLoginLog
from app.models.user import AdminUser
from app.schemas.auth import CaptchaVO, LoginDTO, LoginVO, MenuVO, RefreshTokenDTO, UserVO
from app.security import jwt_provider
from app.utils.captcha_utils import generate_captcha, verify_captcha

logger = logging.getLogger(__name__)

settings = get_settings()

_DEFAULT_MAX_LOGIN_FAIL_COUNT = 5
_DEFAULT_LOCK_DURATION = 30  # 分钟
_ONLINE_SESSION_TTL = 6 * 60  # 6 分钟（秒）


# ── 公开接口 ──────────────────────────────────────────────


async def do_generate_captcha() -> CaptchaVO:
    captcha_key, captcha_image, captcha_type = await generate_captcha()
    return CaptchaVO(captcha_key=captcha_key, captcha_image=captcha_image, type=captcha_type)


async def do_login(dto: LoginDTO, db: AsyncSession, ip: str, user_agent: str) -> LoginVO:
    username = dto.username

    # 检查账户锁定
    await _check_account_locked(username)

    # 验证验证码
    if not await verify_captcha(dto.captcha_key, dto.captcha_code):
        await _record_login_log(db, username, "failed", ip, user_agent, "验证码错误")
        await _increment_login_fail_count(username)
        raise BusinessException(ResultCode.PARAM_ERROR, "验证码错误")

    # 查询用户
    result = await db.execute(
        select(AdminUser).where(AdminUser.username == username, AdminUser.is_deleted == 0)
    )
    user = result.scalar_one_or_none()

    if user is None:
        await _record_login_log(db, username, "failed", ip, user_agent, "用户不存在")
        await _increment_login_fail_count(username)
        raise BusinessException(ResultCode.UNAUTHORIZED, "用户名或密码错误")

    # 检查状态
    if not user.status or user.status != 1:
        await _record_login_log(db, username, "disabled", ip, user_agent, "账户已被禁用")
        raise BusinessException(ResultCode.ACCOUNT_LOCKED, "账户已被禁用")

    # 验证密码（bcrypt 直接调用，兼容 Java BCrypt）
    import bcrypt as _bcrypt
    if not _bcrypt.checkpw(dto.password.encode("utf-8"), user.password.encode("utf-8")):
        await _record_login_log(db, username, "failed", ip, user_agent, "密码错误")
        await _increment_login_fail_count(username)
        raise BusinessException(ResultCode.UNAUTHORIZED, "用户名或密码错误")

    # 登录成功
    await _clear_login_fail_count(username)

    access_token = jwt_provider.generate_access_token(user.id, user.username)
    refresh_token = jwt_provider.generate_refresh_token(user.id, user.username)

    await _store_refresh_token(user.id, refresh_token)
    await _create_online_session(user, access_token, ip, user_agent)
    await _record_login_log(db, username, "success", ip, user_agent, "登录成功")

    return await _build_login_vo(user, access_token, refresh_token, db)


async def do_refresh_token(dto: RefreshTokenDTO, db: AsyncSession, ip: str, user_agent: str) -> LoginVO:
    refresh_token = dto.refresh_token

    payload = jwt_provider.verify_token(refresh_token)
    if payload is None or not jwt_provider.is_refresh_token(payload):
        raise BusinessException(ResultCode.UNAUTHORIZED, "无效的Refresh Token")

    if await jwt_provider.is_in_blacklist(refresh_token):
        raise BusinessException(ResultCode.UNAUTHORIZED, "Refresh Token已失效")

    user_id = jwt_provider.get_user_id(payload)
    if user_id is None:
        raise BusinessException(ResultCode.UNAUTHORIZED, "无效的Refresh Token")

    # 检查是否是当前有效的 Refresh Token
    stored = await _get_stored_refresh_token(user_id)
    if stored is None or stored != refresh_token:
        raise BusinessException(ResultCode.UNAUTHORIZED, "Refresh Token已失效")

    result = await db.execute(select(AdminUser).where(AdminUser.id == user_id, AdminUser.is_deleted == 0))
    user = result.scalar_one_or_none()
    if user is None:
        raise BusinessException(ResultCode.NOT_FOUND, "用户不存在")
    if not user.status or user.status != 1:
        raise BusinessException(ResultCode.ACCOUNT_LOCKED, "账户已被禁用")

    # 旧 Token 加黑名单
    await jwt_provider.add_to_blacklist(refresh_token)

    # 生成新 Token
    new_access = jwt_provider.generate_access_token(user.id, user.username)
    new_refresh = jwt_provider.generate_refresh_token(user.id, user.username)
    await _store_refresh_token(user.id, new_refresh)

    # 更新在线会话
    await _update_online_session(user, new_access, ip, user_agent)

    return await _build_login_vo(user, new_access, new_refresh, db)


async def do_logout(authorization: str) -> None:
    access_token = authorization
    if access_token and access_token.startswith("Bearer "):
        access_token = access_token[7:]

    if not access_token:
        return

    await jwt_provider.add_to_blacklist(access_token)

    payload = jwt_provider.verify_token(access_token)
    if payload:
        user_id = jwt_provider.get_user_id(payload)
        if user_id is not None:
            stored = await _get_stored_refresh_token(user_id)
            if stored:
                await jwt_provider.add_to_blacklist(stored)
                await _delete_stored_refresh_token(user_id)
            await _delete_online_session(user_id)

    logger.debug("用户登出，Token已加入黑名单")


# ── 内部辅助 ──────────────────────────────────────────────


async def _check_account_locked(username: str) -> None:
    key = RedisKeys.LOGIN_FAIL.key(username)
    fail_count = await redis_client.get(key)
    if fail_count is not None:
        count = int(fail_count)
        if count >= _DEFAULT_MAX_LOGIN_FAIL_COUNT:
            raise BusinessException(
                ResultCode.ACCOUNT_LOCKED,
                f"登录失败次数过多，账户已被锁定{_DEFAULT_LOCK_DURATION}分钟",
            )


async def _increment_login_fail_count(username: str) -> None:
    key = RedisKeys.LOGIN_FAIL.key(username)
    count = await redis_client.incr(key)
    if count == 1:
        await redis_client.expire(key, _DEFAULT_LOCK_DURATION * 60)


async def _clear_login_fail_count(username: str) -> None:
    key = RedisKeys.LOGIN_FAIL.key(username)
    await redis_client.delete(key)


async def _store_refresh_token(user_id: int, refresh_token: str) -> None:
    key = RedisKeys.USER_REFRESH_TOKEN.key(str(user_id))
    ttl_ms = jwt_provider.get_refresh_token_expiration_ms()
    await redis_client.set(key, refresh_token, px=ttl_ms)


async def _get_stored_refresh_token(user_id: int) -> str | None:
    key = RedisKeys.USER_REFRESH_TOKEN.key(str(user_id))
    return await redis_client.get(key)


async def _delete_stored_refresh_token(user_id: int) -> None:
    key = RedisKeys.USER_REFRESH_TOKEN.key(str(user_id))
    await redis_client.delete(key)


async def _create_online_session(user: AdminUser, access_token: str, ip: str, user_agent: str) -> None:
    session_data = {
        "userId": user.id,
        "username": user.username,
        "nickname": user.nickname,
        "avatar": user.avatar,
        "loginIp": ip,
        "userAgent": user_agent,
        "loginTime": datetime.now().isoformat(),
        "lastActiveTime": datetime.now().isoformat(),
        "accessToken": access_token,
    }
    key = RedisKeys.ONLINE_SESSION.key(str(user.id))
    await redis_client.set(key, json.dumps(session_data, ensure_ascii=False), ex=_ONLINE_SESSION_TTL)


async def _update_online_session(user: AdminUser, new_access_token: str, ip: str, user_agent: str) -> None:
    key = RedisKeys.ONLINE_SESSION.key(str(user.id))
    existing = await redis_client.get(key)

    if existing:
        try:
            session_data = json.loads(existing)
            session_data["lastActiveTime"] = datetime.now().isoformat()
            session_data["accessToken"] = new_access_token
            session_data["avatar"] = user.avatar
        except (json.JSONDecodeError, TypeError):
            session_data = None

    if not existing or not session_data:
        session_data = {
            "userId": user.id,
            "username": user.username,
            "nickname": user.nickname,
            "avatar": user.avatar,
            "loginIp": ip,
            "userAgent": user_agent,
            "loginTime": datetime.now().isoformat(),
            "lastActiveTime": datetime.now().isoformat(),
            "accessToken": new_access_token,
        }

    await redis_client.set(key, json.dumps(session_data, ensure_ascii=False), ex=_ONLINE_SESSION_TTL)


async def _delete_online_session(user_id: int) -> None:
    key = RedisKeys.ONLINE_SESSION.key(str(user_id))
    await redis_client.delete(key)


async def _record_login_log(
    db: AsyncSession, username: str, status: str, ip: str, user_agent: str, message: str
) -> None:
    try:
        log_entry = AdminLoginLog(
            username=username,
            status=status,
            ip=ip,
            user_agent=user_agent,
            message=message,
        )
        db.add(log_entry)
        await db.commit()
    except Exception as e:
        logger.error("记录登录日志失败: %s", e)
        await db.rollback()


async def _build_login_vo(
    user: AdminUser, access_token: str, refresh_token: str, db: AsyncSession
) -> LoginVO:
    user_vo = UserVO(
        id=user.id,
        username=user.username,
        email=user.email,
        nickname=user.nickname,
        avatar=user.avatar,
        status=user.status,
        is_superuser=user.is_superuser,
        create_time=user.create_time,
    )

    # 查询用户可见菜单树（简化版，后续 Phase 3 完善 MenuService）
    menus = await _get_user_menus(db, user)

    return LoginVO(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="Bearer",
        expires_in=jwt_provider.get_access_token_expiration_seconds(),
        user=user_vo,
        menus=menus,
    )


async def _get_user_menus(db: AsyncSession, user: AdminUser) -> list[MenuVO]:
    """获取用户可见菜单树。超管返回全部，普通用户按角色过滤。"""
    from app.models.menu import AdminMenu
    from app.models.associations import AdminRoleMenu, AdminUserRole

    if user.is_superuser == 1:
        result = await db.execute(
            select(AdminMenu).where(AdminMenu.is_deleted == 0).order_by(AdminMenu.sort)
        )
        all_menus = result.scalars().all()
    else:
        # 普通用户：通过角色获取菜单
        result = await db.execute(
            select(AdminUserRole.role_id).where(
                AdminUserRole.user_id == user.id, AdminUserRole.is_deleted == 0
            )
        )
        role_ids = result.scalars().all()
        if not role_ids:
            return []

        result = await db.execute(
            select(AdminRoleMenu.menu_id).where(
                AdminRoleMenu.role_id.in_(role_ids), AdminRoleMenu.is_deleted == 0
            )
        )
        assigned_ids = set(result.scalars().all())
        if not assigned_ids:
            return []

        # 查全量菜单用于回溯父级
        result = await db.execute(
            select(AdminMenu).where(AdminMenu.is_deleted == 0).order_by(AdminMenu.sort)
        )
        all_db_menus = result.scalars().all()
        menu_by_id = {m.id: m for m in all_db_menus}

        # 回溯补齐所有祖先菜单，确保树完整
        needed_ids = set(assigned_ids)
        for mid in assigned_ids:
            m = menu_by_id.get(mid)
            while m and m.parent_id and m.parent_id in menu_by_id:
                needed_ids.add(m.parent_id)
                m = menu_by_id.get(m.parent_id)

        all_menus = [m for m in all_db_menus if m.id in needed_ids]

    return _build_menu_tree(all_menus)


def _build_menu_tree(menus) -> list[MenuVO]:
    """将扁平菜单列表构建为树形结构。"""
    menu_map: dict[int, MenuVO] = {}
    for m in menus:
        menu_map[m.id] = MenuVO(
            id=m.id, name=m.name, path=m.path, icon=m.icon,
            component=m.component, parent_id=m.parent_id,
            type=m.type, sort=m.sort, children=[],
        )

    roots: list[MenuVO] = []
    for vo in menu_map.values():
        if vo.parent_id and vo.parent_id in menu_map:
            menu_map[vo.parent_id].children.append(vo)
        else:
            roots.append(vo)

    return roots
