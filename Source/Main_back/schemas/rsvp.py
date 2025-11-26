"""
Схемы для RSVP (подтверждение присутствия)
"""
from pydantic import BaseModel, Field
from typing import Optional


class RSVPRequest(BaseModel):
    """Запрос на подтверждение присутствия"""
    rsvp: bool = Field(..., description="True - будет присутствовать, False - не будет")


class RSVPResponse(BaseModel):
    """Ответ с результатом подтверждения присутствия"""
    success: bool
    message: str
    rsvp: Optional[bool] = None

