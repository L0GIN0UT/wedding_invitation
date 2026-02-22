"""
Проверка медиа-токена (JWT type=media), подписанного тем же SECRET_KEY, что и Main_back.
"""
import jwt
from fastapi import HTTPException, Query, status

# Конфиг из общего conf (при монтировании в Docker)
try:
    from conf.settings import settings
except ImportError:
    # Локальный запуск без conf
    from pathlib import Path
    from pydantic_settings import BaseSettings, SettingsConfigDict

    class _LocalSettings(BaseSettings):
        model_config = SettingsConfigDict(env_file=".env", extra="ignore")
        SECRET_KEY: str = "change-me"
        SECRET_ALGORITHM: str = "HS256"

    settings = _LocalSettings()


def verify_media_token(token: str = Query(..., alias="token")) -> dict:
    """Декодирует и проверяет медиа-токен. Возвращает payload или 401."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Токен не указан",
        )
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.SECRET_ALGORITHM],
        )
        if payload.get("type") != "media":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Неверный тип токена",
            )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Токен истёк",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный токен",
        )
