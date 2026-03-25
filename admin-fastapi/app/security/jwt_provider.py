"""JWT Token 提供者，对应 Java JwtTokenProvider.java。

负责签发、验证 Access/Refresh Token，以及 Token 黑名单管理。
"""

import logging
import time
from datetime import datetime, timezone

from jose import JWTError, jwt

from app.common.redis_keys import RedisKeys
from app.config import get_settings
from app.db.redis import redis_client

logger = logging.getLogger(__name__)

settings = get_settings()

_ALGORITHM = "HS256"
_USER_ID_KEY = "userId"
_USERNAME_KEY = "username"
_TOKEN_TYPE_KEY = "tokenType"
_ACCESS_TOKEN_TYPE = "access"
_REFRESH_TOKEN_TYPE = "refresh"


def generate_access_token(user_id: int, username: str) -> str:
    return _generate_token(user_id, username, _ACCESS_TOKEN_TYPE, settings.jwt_access_expiration_ms)


def generate_refresh_token(user_id: int, username: str) -> str:
    return _generate_token(user_id, username, _REFRESH_TOKEN_TYPE, settings.jwt_refresh_expiration_ms)


def _generate_token(user_id: int, username: str, token_type: str, expiration_ms: int) -> str:
    now = time.time()
    payload = {
        _USER_ID_KEY: user_id,
        _USERNAME_KEY: username,
        _TOKEN_TYPE_KEY: token_type,
        "iat": int(now),
        "exp": int(now + expiration_ms / 1000),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=_ALGORITHM)


def verify_token(token: str) -> dict | None:
    """验证 Token 并返回 payload，失败返回 None。"""
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[_ALGORITHM])
    except JWTError as e:
        logger.warning("Token验证失败: %s", e)
        return None


def get_user_id(payload: dict) -> int | None:
    val = payload.get(_USER_ID_KEY)
    return int(val) if val is not None else None


def get_username(payload: dict) -> str | None:
    return payload.get(_USERNAME_KEY)


def is_access_token(payload: dict) -> bool:
    return payload.get(_TOKEN_TYPE_KEY) == _ACCESS_TOKEN_TYPE


def is_refresh_token(payload: dict) -> bool:
    return payload.get(_TOKEN_TYPE_KEY) == _REFRESH_TOKEN_TYPE


async def add_to_blacklist(token: str) -> None:
    """将 Token 加入 Redis 黑名单，TTL 为 Token 剩余有效期。"""
    if not token:
        return
    payload = verify_token(token)
    if payload is None:
        return
    exp = payload.get("exp", 0)
    remaining_ms = int((exp - time.time()) * 1000)
    if remaining_ms > 0:
        key = RedisKeys.TOKEN_BLACKLIST.key(token)
        await redis_client.set(key, "1", px=remaining_ms)
        logger.debug("Token已加入黑名单: %s", key)


async def is_in_blacklist(token: str) -> bool:
    if not token:
        return False
    key = RedisKeys.TOKEN_BLACKLIST.key(token)
    return await redis_client.exists(key) > 0


def get_access_token_expiration_seconds() -> int:
    return settings.jwt_access_expiration_ms // 1000


def get_refresh_token_expiration_ms() -> int:
    return settings.jwt_refresh_expiration_ms
