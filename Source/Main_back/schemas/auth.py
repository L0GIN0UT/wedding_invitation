"""
Схемы для авторизации
"""
from pydantic import BaseModel, Field, field_validator
import re


class SendCodeRequest(BaseModel):
    """Запрос на отправку кода верификации"""
    phone: str = Field(..., description="Номер телефона", min_length=10, max_length=20)
    
    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        """Валидация номера телефона"""
        # Убираем все пробелы, дефисы и скобки
        phone_clean = re.sub(r'[\s\-\(\)]', '', v)
        # Проверяем что остались только цифры и возможно знак +
        if not re.match(r'^\+?\d{10,15}$', phone_clean):
            raise ValueError("Некорректный формат номера телефона")
        return phone_clean


class SendCodeResponse(BaseModel):
    """Ответ на запрос отправки кода"""
    success: bool = Field(..., description="Успешность операции")
    message: str = Field(..., description="Сообщение")


class VerifyCodeRequest(BaseModel):
    """Запрос на подтверждение кода"""
    phone: str = Field(..., description="Номер телефона", min_length=10, max_length=20)
    code: str = Field(..., description="Код верификации", min_length=4, max_length=6)
    
    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        """Валидация номера телефона"""
        phone_clean = re.sub(r'[\s\-\(\)]', '', v)
        if not re.match(r'^\+?\d{10,15}$', phone_clean):
            raise ValueError("Некорректный формат номера телефона")
        return phone_clean
    
    @field_validator("code")
    @classmethod
    def validate_code(cls, v: str) -> str:
        """Валидация кода"""
        if not v.isdigit():
            raise ValueError("Код должен содержать только цифры")
        return v


class VerifyCodeResponse(BaseModel):
    """Ответ на подтверждение кода"""
    success: bool = Field(..., description="Успешность операции")
    access_token: str = Field(..., description="Access токен")
    refresh_token: str = Field(..., description="Refresh токен")
    message: str = Field(..., description="Сообщение")


class RefreshTokenRequest(BaseModel):
    """Запрос на обновление токенов"""
    refresh_token: str = Field(..., description="Refresh токен")


class RefreshTokenResponse(BaseModel):
    """Ответ на обновление токенов"""
    success: bool = Field(..., description="Успешность операции")
    access_token: str = Field(..., description="Новый access токен")
    refresh_token: str = Field(..., description="Новый refresh токен")
    message: str = Field(..., description="Сообщение")


class LogoutRequest(BaseModel):
    """Запрос на выход"""
    refresh_token: str = Field(..., description="Refresh токен")


class LogoutResponse(BaseModel):
    """Ответ на выход"""
    success: bool = Field(..., description="Успешность операции")
    message: str = Field(..., description="Сообщение")


class ValidateTokenRequest(BaseModel):
    """Запрос на проверку валидности токена"""
    access_token: str = Field(..., description="Access токен")


class ValidateTokenResponse(BaseModel):
    """Ответ на проверку валидности токена"""
    valid: bool = Field(..., description="Валиден ли токен")
    phone: str | None = Field(None, description="Телефон пользователя (если токен валиден)")
    friend: bool | None = Field(None, description="Доступ к вишлисту (показывать в меню и разрешать переход)")

