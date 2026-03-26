"""在线用户 Service。"""

from __future__ import annotations

import json
import logging
from datetime import datetime

from app.common.redis_keys import RedisKeys
from app.db.redis import redis_client
from app.schemas.online_user import OnlineUserVO
from app.security import jwt_provider

logger = logging.getLogger(__name__)


async def list_online_users() -> list[OnlineUserVO]:
    """获取所有在线用户列表，从 Redis 读取会话信息。"""
    sessions: list[OnlineUserVO] = []
    pattern = RedisKeys.ONLINE_SESSION.key("*")

    async for key in redis_client.scan_iter(match=pattern, count=200):
        raw = await redis_client.get(key)
        if not raw:
            continue
        try:
            data = json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            continue

        sessions.append(
            OnlineUserVO(
                user_id=data.get("userId"),
                username=data.get("username"),
                nickname=data.get("nickname"),
                avatar=data.get("avatar"),
                login_ip=data.get("loginIp"),
                user_agent=data.get("userAgent"),
                login_time=_parse_dt(data.get("loginTime")),
                last_active_time=_parse_dt(data.get("lastActiveTime")),
            )
        )

    # 按登录时间降序排序
    sessions.sort(key=lambda s: s.login_time or datetime.min, reverse=True)
    return sessions


async def force_offline(user_id: int) -> None:
    """强制用户下线：黑名单 access token、删除 refresh token、删除在线会话。"""
    session_key = RedisKeys.ONLINE_SESSION.key(str(user_id))
    raw = await redis_client.get(session_key)

    if raw:
        try:
            data = json.loads(raw)
            access_token = data.get("accessToken")
            if access_token:
                await jwt_provider.add_to_blacklist(access_token)
        except (json.JSONDecodeError, TypeError):
            pass

    # 删除 refresh token
    refresh_key = RedisKeys.USER_REFRESH_TOKEN.key(str(user_id))
    await redis_client.delete(refresh_key)

    # 删除在线会话
    await redis_client.delete(session_key)

    logger.info("用户 %s 已被强制下线", user_id)


def _parse_dt(value) -> datetime | None:
    """尝试将字符串解析为 datetime。"""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value))
    except (ValueError, TypeError):
        return None
