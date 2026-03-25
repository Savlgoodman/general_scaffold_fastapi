"""验证码工具，对应 Java AuthCaptchaUtil.java。

使用 easy-captcha-python 库生成验证码，Redis 存储。
"""

import uuid

from easy_captcha import SpecCaptcha

from app.common.redis_keys import RedisKeys
from app.db.redis import redis_client

_CAPTCHA_EXPIRATION = 5 * 60  # 5 分钟（秒）
_DEFAULT_WIDTH = 130
_DEFAULT_HEIGHT = 48
_DEFAULT_LEN = 4


async def generate_captcha(
    width: int = _DEFAULT_WIDTH,
    height: int = _DEFAULT_HEIGHT,
    length: int = _DEFAULT_LEN,
) -> tuple[str, str, str]:
    """生成验证码。

    Returns:
        (captcha_key, captcha_image_base64, type)
    """
    captcha = SpecCaptcha(width, height, length)
    code = captcha.text()
    base64_image = captcha.to_base64()

    captcha_key = uuid.uuid4().hex
    redis_key = RedisKeys.CAPTCHA.key(captcha_key)
    await redis_client.set(redis_key, code, ex=_CAPTCHA_EXPIRATION)

    return captcha_key, base64_image, "png"


async def verify_captcha(captcha_key: str, captcha_code: str) -> bool:
    """验证验证码，成功后自动删除。"""
    if not captcha_key or not captcha_code:
        return False

    redis_key = RedisKeys.CAPTCHA.key(captcha_key)
    cached_code = await redis_client.get(redis_key)
    if cached_code is None:
        return False

    if cached_code.strip().lower() == captcha_code.strip().lower():
        await redis_client.delete(redis_key)
        return True

    return False
