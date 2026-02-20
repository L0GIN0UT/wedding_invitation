import logging
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

LogLevel = Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]

# Определяем путь к .env файлу в корне приложения /app/.env
ENV_FILE = Path("/app/.env")


class Settings(BaseSettings):
    """
    Глобальные настройки проекта
    """

    model_config = SettingsConfigDict(env_file=str(ENV_FILE), case_sensitive=True, extra="ignore")

    # Настройки логирования
    LOG_LEVEL: LogLevel

    # Настройки базы данных PostgreSQL
    DB_HOST: str
    DB_PORT: int
    DB_USER: str
    DB_PASSWORD: str
    DB_NAME: str
    
    # Настройки pgAdmin
    PGADMIN_EMAIL: str
    PGADMIN_PASSWORD: str
    PGADMIN_PORT: int

    # Настройки Redis
    REDIS_HOST: str
    REDIS_PORT: int
    REDIS_DB: int
    REDIS_PASSWORD: str
    
    # Настройки авторизации
    VERIFICATION_CODE_LENGTH: int
    VERIFICATION_CODE_TTL: int  # Время жизни кода в секундах (5 минут = 300)
    VERIFICATION_MAX_ATTEMPTS: int  # Максимальное количество попыток ввода кода (3)
    VERIFICATION_REQUEST_COOLDOWN: int  # Минимальный интервал между запросами кода в секундах (150 = 2.5 минуты)
    
    # Настройки JWT токенов
    SECRET_KEY: str  # Секретный ключ для подписи JWT токенов
    SECRET_ALGORITHM: str  # Алгоритм подписи JWT (например, HS256)
    ACCESS_TOKEN_TTL: int  # Время жизни access токена в секундах 
    REFRESH_TOKEN_TTL: int  # Время жизни refresh токена в секундах 
    
    # Настройки Email (SMTP)
    SMTP_SERVER: str
    SMTP_PORT: int
    SMTP_USER: str
    SMTP_PASSWORD: str
    SMTP_USE_TLS: bool
    SMTP_FROM_EMAIL: str # Email отправителя (если None, используется SMTP_USER)
    SMTP_FROM_NAME: str  # Имя отправителя
    
    # Настройки OAuth2 - VK
    VK_CLIENT_ID: str
    VK_CLIENT_SECRET: str
    
    # Настройки OAuth2 - Яндекс
    YANDEX_CLIENT_ID: str
    YANDEX_CLIENT_SECRET: str

    # Базовый URL сайта для redirect_uri Яндекс и редиректа после OAuth (в .env задать свой, напр. SITE_ORIGIN=https://wedding-ivan-and-alina-forever.ru)
    SITE_ORIGIN: str
    
    # Настройки Zvonok.com для звонков с кодом
    ZVONOK_API_KEY: str  # API ключ (public_key) от Zvonok.com
    ZVONOK_CAMPAIGN_ID: str  # ID кампании для звонков (создается в личном кабинете Zvonok.com)
    
    # Настройки Celery (использует Redis как брокер)
    CELERY_BROKER_DB: int
    CELERY_RESULT_BACKEND_DB: int
    CELERY_TASK_SERIALIZER: str
    CELERY_RESULT_SERIALIZER: str
    CELERY_ACCEPT_CONTENT: list[str]
    CELERY_TIMEZONE: str
    CELERY_ENABLE_UTC: bool
    CELERY_TASK_TRACK_STARTED: bool
    CELERY_TASK_TIME_LIMIT: int
    CELERY_TASK_SOFT_TIME_LIMIT: int

    @property
    def database_url(self) -> str:
        """Формирует URL для подключения к базе данных"""
        return f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    @property
    def async_database_url(self) -> str:
        """Формирует асинхронный URL для подключения к базе данных"""
        return f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
    
    @property
    def redis_url(self) -> str:
        """Формирует URL для подключения к Redis"""
        return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
    
    @property
    def celery_broker_url(self) -> str:
        """Формирует URL для Celery брокера (Redis)"""
        return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/{self.CELERY_BROKER_DB}"
    
    @property
    def celery_result_backend_url(self) -> str:
        """Формирует URL для Celery result backend (Redis)"""
        return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/{self.CELERY_RESULT_BACKEND_DB}"


settings = Settings()