"""
Зависимости для работы с Redis
"""
from typing import Annotated
from fastapi import Depends
import redis.asyncio as redis
from conf.settings import settings

# Глобальный клиент Redis (создается при старте приложения)
_redis_client: redis.Redis | None = None


async def get_redis_client() -> redis.Redis:
    """
    Получает клиент Redis (singleton)
    """
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True
        )
    return _redis_client


# Dependency для использования в роутерах
RedisDep = Annotated[redis.Redis, Depends(get_redis_client)]

