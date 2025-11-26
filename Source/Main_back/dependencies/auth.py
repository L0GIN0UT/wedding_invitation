"""
Зависимости для авторизации
"""
from fastapi import Header, HTTPException, status
from redis.asyncio import Redis
from dependencies.redis import RedisDep
from services.session import session_service
from services.guest import guest_service


async def get_current_user(
    authorization: str = Header(..., description="Токен авторизации в формате: Bearer <token>"),
    redis_client: RedisDep = None
) -> dict:
    """
    Получает текущего авторизованного пользователя по JWT access токену из заголовка Authorization
    Возвращает данные гостя из базы данных
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный формат токена авторизации. Используйте: Bearer <token>",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = authorization.replace("Bearer ", "").strip()
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Токен авторизации не предоставлен",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Проверяем и декодируем JWT access токен
    phone = await session_service.verify_access_token(token)
    
    if not phone:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Токен истек или недействителен",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Получаем данные гостя из базы
    guest = await guest_service.get_guest_by_phone(phone)
    
    if guest is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Гость не найден"
        )
    
    return guest

