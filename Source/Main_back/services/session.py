"""
Сервис для работы с сессиями пользователей
"""
import secrets
import redis.asyncio as redis
from conf.settings import settings


class SessionService:
    """Сервис для управления сессиями пользователей"""
    
    @staticmethod
    def generate_token() -> str:
        """
        Генерирует токен сессии
        """
        return secrets.token_urlsafe(settings.SESSION_TOKEN_LENGTH)
    
    @staticmethod
    def get_session_key(token: str) -> str:
        """
        Формирует ключ для хранения сессии в Redis
        """
        return f"session:{token}"
    
    async def create_session(
        self,
        redis_client: redis.Redis,
        phone: str
    ) -> str:
        """
        Создает новую сессию для пользователя
        Возвращает токен сессии
        """
        token = self.generate_token()
        key = self.get_session_key(token)
        
        # Сохраняем телефон в сессии
        await redis_client.setex(
            key,
            settings.SESSION_TOKEN_TTL,
            phone
        )
        
        return token
    
    async def get_session_phone(
        self,
        redis_client: redis.Redis,
        token: str
    ) -> str | None:
        """
        Получает телефон пользователя по токену сессии
        Возвращает None если сессия не найдена или истекла
        """
        key = self.get_session_key(token)
        phone = await redis_client.get(key)
        return phone
    
    async def delete_session(
        self,
        redis_client: redis.Redis,
        token: str
    ) -> None:
        """
        Удаляет сессию
        """
        key = self.get_session_key(token)
        await redis_client.delete(key)


# Экземпляр сервиса
session_service = SessionService()

