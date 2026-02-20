"""
Фабрика для OAuth2 провайдеров (VK ID, Яндекс)
"""
import httpx
import logging
from typing import Literal, Optional, Tuple
from abc import ABC, abstractmethod
from conf.settings import settings

logger = logging.getLogger(__name__)

OAuthProvider = Literal["vk", "yandex"]


class OAuthProviderBase(ABC):
    """Базовый класс для OAuth провайдеров"""
    
    @abstractmethod
    async def get_user_phone(self, access_token: str) -> Optional[str]:
        """
        Получает номер телефона пользователя по access token
        Возвращает номер телефона или None
        """
        pass


class VKOAuthProvider(OAuthProviderBase):
    """OAuth провайдер для VK ID (документация: id.vk.com/about/business, OAuth 2.1)"""
    
    async def get_user_phone(self, access_token: str) -> Optional[str]:
        """
        Получает номер телефона пользователя из VK ID.
        По документации VK ID: POST /oauth2/user_info с Bearer и client_id в body.
        """
        if not access_token or not access_token.strip():
            return None
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                # 1) Официальный способ VK ID: POST с Bearer и client_id (id.vk.com/docs)
                response = await client.post(
                    "https://id.vk.ru/oauth2/user_info",
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json",
                    },
                    json={"client_id": settings.VK_CLIENT_ID},
                )
                if response.status_code == 200:
                    data = response.json()
                    user = data.get("user") or data
                    phone = (
                        user.get("phone")
                        or user.get("phone_number")
                        or (user.get("phone_number_mask") if isinstance(user.get("phone_number_mask"), str) else None)
                    )
                    if phone:
                        return phone
                # 2) GET с access_token в query (альтернативный вариант из доки)
                response = await client.get(
                    "https://id.vk.ru/oauth2/user_info",
                    params={"access_token": access_token},
                )
                if response.status_code == 200:
                    data = response.json()
                    user = data.get("user") or data
                    phone = user.get("phone") or user.get("phone_number")
                    if phone:
                        return phone
                # 3) GET с Bearer в заголовке
                response = await client.get(
                    "https://id.vk.ru/oauth2/user_info",
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                if response.status_code == 200:
                    data = response.json()
                    user = data.get("user") or data
                    phone = user.get("phone") or user.get("phone_number")
                    if phone:
                        return phone
                
                # Fallback: классический VK API (если токен от oauth.vk.com)
                response = await client.get(
                    "https://api.vk.com/method/users.get",
                    params={
                        "access_token": access_token,
                        "fields": "contacts,phone",
                        "v": "5.131"
                    }
                )
                if response.status_code == 200:
                    data = response.json()
                    if "response" in data and len(data["response"]) > 0:
                        user = data["response"][0]
                        phone = user.get("mobile_phone") or user.get("phone")
                        if phone:
                            return phone
                
                response = await client.get(
                    "https://api.vk.com/method/account.getProfileInfo",
                    params={
                        "access_token": access_token,
                        "v": "5.131"
                    }
                )
                if response.status_code == 200:
                    data = response.json()
                    if "response" in data:
                        profile = data["response"]
                        phone = profile.get("phone") or profile.get("mobile_phone")
                        if phone:
                            return phone
                
                return None
        except Exception as e:
            logger.error(f"Ошибка получения данных из VK ID: {e}")
            return None


class YandexOAuthProvider(OAuthProviderBase):
    """OAuth провайдер для Яндекс"""
    
    async def get_user_phone(self, access_token: str) -> Optional[str]:
        """
        Получает номер телефона пользователя из Яндекс
        """
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    "https://login.yandex.ru/info",
                    headers={"Authorization": f"OAuth {access_token}"},
                    params={"format": "json"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    # Яндекс возвращает телефон в поле default_phone
                    phone = data.get("default_phone", {}).get("number")
                    if phone:
                        return phone
                
                return None
        except Exception as e:
            logger.error(f"Ошибка получения данных из Яндекс: {e}")
            return None


class OAuthFactory:
    """Фабрика для создания OAuth провайдеров"""
    
    _providers = {
        "vk": VKOAuthProvider,
        "yandex": YandexOAuthProvider,
    }
    
    @classmethod
    def get_provider(cls, provider: OAuthProvider) -> OAuthProviderBase:
        """
        Получает провайдер по имени
        """
        provider_class = cls._providers.get(provider)
        if not provider_class:
            raise ValueError(f"Неизвестный OAuth провайдер: {provider}")
        return provider_class()
    
    @classmethod
    async def get_user_phone(
        cls,
        provider: OAuthProvider,
        access_token: str
    ) -> Optional[str]:
        """
        Получает номер телефона пользователя через указанный провайдер
        """
        oauth_provider = cls.get_provider(provider)
        return await oauth_provider.get_user_phone(access_token)


# Экземпляр фабрики
oauth_factory = OAuthFactory()

