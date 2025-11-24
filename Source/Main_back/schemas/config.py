"""
Схемы для конфигурации
"""
from pydantic import BaseModel, Field


class PublicConfigResponse(BaseModel):
    """Публичная конфигурация для фронтенда"""
    vk_client_id: str = Field(..., description="VK Client ID")
    yandex_client_id: str = Field(..., description="Yandex Client ID")

