"""Redis Key 常量，对应 Java RedisKeys 枚举。

用法：RedisKeys.CAPTCHA.key("abc-123")  →  "captcha:abc-123"
"""

from __future__ import annotations

from enum import Enum


class RedisKeys(Enum):
    CAPTCHA = ("captcha", "验证码")
    TOKEN_BLACKLIST = ("token:blacklist", "Token黑名单")
    LOGIN_FAIL = ("login:fail", "登录失败计数")
    USER_REFRESH_TOKEN = ("user:refresh_token", "用户当前有效的Refresh Token")
    ONLINE_SESSION = ("online:session", "用户在线会话")
    SYSTEM_CONFIG = ("system:config", "系统配置")

    def __init__(self, prefix: str, description: str):
        self.prefix = prefix
        self.description = description

    def key(self, *suffixes: str) -> str:
        if not suffixes:
            return self.prefix
        return self.prefix + ":" + ":".join(suffixes)
