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
    """OAuth провайдер для VK ID"""
    
    async def get_user_phone(self, access_token: str) -> Optional[str]:
        """
        Получает номер телефона пользователя из VK ID
        """
        try:
            # VK ID использует другой endpoint для получения данных пользователя
            async with httpx.AsyncClient(timeout=10.0) as client:
                # Сначала пробуем получить через VK ID API
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
                        # VK может вернуть телефон в поле mobile_phone или phone
                        phone = user.get("mobile_phone") or user.get("phone")
                        if phone:
                            return phone
                
                # Если не получили через users.get, пробуем через account.getProfileInfo
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

