"""
Схемы для OAuth2 авторизации
"""
from pydantic import BaseModel, Field
from typing import Literal

OAuthProvider = Literal["vk", "yandex"]


class OAuthLoginRequest(BaseModel):
    """Запрос на авторизацию через OAuth"""
    provider: OAuthProvider = Field(..., description="OAuth провайдер: vk, yandex")
    access_token: str = Field(..., description="Access token от OAuth провайдера")


class OAuthLoginResponse(BaseModel):
    """Ответ на OAuth авторизацию"""
    success: bool = Field(..., description="Успешность операции")
    access_token: str = Field(..., description="Access токен")
    refresh_token: str = Field(..., description="Refresh токен")
    message: str = Field(..., description="Сообщение")
    phone: str | None = Field(None, description="Номер телефона пользователя")


class OAuthExchangeCodeRequest(BaseModel):
    """Запрос на обмен кода авторизации на токен"""
    provider: OAuthProvider = Field(..., description="OAuth провайдер: vk, yandex")
    code: str = Field(..., description="Код авторизации от OAuth провайдера")
    redirect_uri: str = Field(..., description="Redirect URI, использованный при авторизации")
    code_verifier: str | None = Field(None, description="PKCE code_verifier (обязателен для VK ID)")
    state: str | None = Field(None, description="Строка state из редиректа (обязательна для VK ID)")
    device_id: str | None = Field(None, description="Идентификатор устройства из редиректа (обязателен для VK ID)")


class OAuthExchangeCodeResponse(BaseModel):
    """Ответ на обмен кода на токен"""
    access_token: str = Field(..., description="Access token")
    expires_in: int | None = Field(None, description="Время жизни токена в секундах")
    user_id: int | None = Field(None, description="ID пользователя")


class OAuthTicketExchangeRequest(BaseModel):
    """Запрос на обмен одноразового ticket на токены (после Yandex callback)"""
    ticket: str = Field(..., description="Одноразовый ticket из redirect после OAuth")


class OAuthTicketExchangeResponse(BaseModel):
    """Ответ: токены сессии"""
    access_token: str = Field(..., description="Access токен")
    refresh_token: str = Field(..., description="Refresh токен")

