import redis.asyncio as aioredis

from app.config import get_settings

settings = get_settings()

redis_client: aioredis.Redis = aioredis.Redis(
    host=settings.redis_host,
    port=settings.redis_port,
    password=settings.redis_password or None,
    db=settings.redis_db,
    max_connections=settings.redis_max_connections,
    decode_responses=True,
)


async def get_redis() -> aioredis.Redis:
    """FastAPI 依赖：获取 Redis 客户端"""
    return redis_client
