"""
Сервис для работы с сессиями пользователей через JWT токены
"""
import jwt
from datetime import datetime, timedelta
import redis.asyncio as redis
from conf.settings import settings


class SessionService:
    """Сервис для управления сессиями пользователей через JWT"""
    
    @staticmethod
    def generate_access_token(phone: str) -> str:
        """
        Генерирует JWT access токен
        """
        payload = {
            "sub": phone,  # subject (телефон пользователя)
            "type": "access",
            "exp": datetime.utcnow() + timedelta(seconds=settings.ACCESS_TOKEN_TTL),
            "iat": datetime.utcnow()  # issued at
        }
        token = jwt.encode(
            payload,
            settings.SECRET_KEY,
            algorithm=settings.SECRET_ALGORITHM
        )
        # jwt.encode может вернуть bytes в некоторых версиях, конвертируем в строку
        if isinstance(token, bytes):
            return token.decode('utf-8')
        return token
    
    @staticmethod
    def generate_refresh_token(phone: str) -> str:
        """
        Генерирует JWT refresh токен
        """
        payload = {
            "sub": phone,  # subject (телефон пользователя)
            "type": "refresh",
            "exp": datetime.utcnow() + timedelta(seconds=settings.REFRESH_TOKEN_TTL),
            "iat": datetime.utcnow()  # issued at
        }
        token = jwt.encode(
            payload,
            settings.SECRET_KEY,
            algorithm=settings.SECRET_ALGORITHM
        )
        # jwt.encode может вернуть bytes в некоторых версиях, конвертируем в строку
        if isinstance(token, bytes):
            return token.decode('utf-8')
        return token
    
    @staticmethod
    def generate_media_token(scope: str | None = None, path: str | None = None) -> str:
        """
        Генерирует короткоживущий JWT для доступа к файловому хранилищу (type=media).
        scope или path можно использовать для ограничения доступа.
        """
        payload = {
            "type": "media",
            "exp": datetime.utcnow() + timedelta(seconds=getattr(settings, "MEDIA_TOKEN_TTL", 3600)),
            "iat": datetime.utcnow(),
        }
        if scope is not None:
            payload["scope"] = scope
        if path is not None:
            payload["path"] = path
        token = jwt.encode(
            payload,
            settings.SECRET_KEY,
            algorithm=settings.SECRET_ALGORITHM
        )
        if isinstance(token, bytes):
            return token.decode("utf-8")
        return token

    @staticmethod
    def get_refresh_token_key(token: str) -> str:
        """
        Формирует ключ для хранения refresh токена в Redis
        """
        return f"refresh_token:{token}"
    
    async def create_session(
        self,
        redis_client: redis.Redis,
        phone: str
    ) -> tuple[str, str]:
        """
        Создает новую сессию для пользователя
        Возвращает кортеж (access_token, refresh_token)
        """
        # Генерируем токены
        access_token = self.generate_access_token(phone)
        refresh_token = self.generate_refresh_token(phone)
        
        # Сохраняем refresh токен в Redis
        refresh_key = self.get_refresh_token_key(refresh_token)
        await redis_client.setex(
            refresh_key,
            settings.REFRESH_TOKEN_TTL,
            phone
        )
        
        return access_token, refresh_token
    
    async def verify_access_token(self, token: str) -> str | None:
        """
        Проверяет и декодирует access токен
        Возвращает телефон пользователя или None если токен невалиден
        """
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.SECRET_ALGORITHM]
            )
            
            # Проверяем тип токена
            if payload.get("type") != "access":
                return None
            
            return payload.get("sub")  # Возвращаем телефон
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    async def verify_refresh_token(
        self,
        redis_client: redis.Redis,
        token: str
    ) -> str | None:
        """
        Проверяет refresh токен
        Возвращает телефон пользователя или None если токен невалиден
        """
        try:
            # Проверяем JWT подпись и срок действия
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.SECRET_ALGORITHM]
            )
            
            # Проверяем тип токена
            if payload.get("type") != "refresh":
                return None
            
            phone = payload.get("sub")
            
            # Проверяем что токен есть в Redis (не был отозван)
            refresh_key = self.get_refresh_token_key(token)
            stored_phone = await redis_client.get(refresh_key)
            
            if stored_phone is None:
                return None
            
            # Декодируем если это bytes
            if isinstance(stored_phone, bytes):
                stored_phone = stored_phone.decode('utf-8')
            
            # Проверяем что телефон совпадает
            if stored_phone != phone:
                return None
            
            return phone
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    async def refresh_tokens(
        self,
        redis_client: redis.Redis,
        refresh_token: str
    ) -> tuple[str, str] | None:
        """
        Обновляет пару токенов по refresh токену
        Возвращает кортеж (access_token, refresh_token) или None если refresh токен невалиден
        """
        phone = await self.verify_refresh_token(redis_client, refresh_token)
        
        if phone is None:
            return None
        
        # Удаляем старый refresh токен
        old_refresh_key = self.get_refresh_token_key(refresh_token)
        await redis_client.delete(old_refresh_key)
        
        # Создаем новую пару токенов
        return await self.create_session(redis_client, phone)
    
    async def delete_session(
        self,
        redis_client: redis.Redis,
        refresh_token: str
    ) -> None:
        """
        Удаляет сессию (удаляет refresh токен из Redis)
        """
        refresh_key = self.get_refresh_token_key(refresh_token)
        await redis_client.delete(refresh_key)


# Экземпляр сервиса
session_service = SessionService()
