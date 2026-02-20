"""
Роутер для OAuth2 авторизации
"""
from fastapi import APIRouter, HTTPException, status
from redis.asyncio import Redis

from dependencies.redis import RedisDep
from schemas.oauth import (
    OAuthLoginRequest, 
    OAuthLoginResponse,
    OAuthExchangeCodeRequest,
    OAuthExchangeCodeResponse
)
from services.oauth.oauth_factory import oauth_factory
from services.session import session_service
from services.guest import guest_service
from conf.settings import settings
import httpx

router = APIRouter(prefix="/auth/oauth", tags=["OAuth2 Авторизация"])


@router.post(
    "/login",
    response_model=OAuthLoginResponse,
    status_code=status.HTTP_200_OK,
    summary="Авторизация через OAuth2",
    description="Авторизует пользователя через OAuth2 провайдер (VK, Яндекс)"
)
async def oauth_login(
    request: OAuthLoginRequest,
    redis_client: RedisDep
) -> OAuthLoginResponse:
    """
    Авторизует пользователя через OAuth2 провайдер
    Получает номер телефона из провайдера и создает сессию
    """
    try:
        if not request.access_token or not request.access_token.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Передан пустой access_token"
            )
        # Получаем номер телефона через OAuth провайдер
        phone = await oauth_factory.get_user_phone(
            request.provider,
            request.access_token
        )
        
        if not phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Не удалось получить номер телефона из {request.provider}. Проверьте scope (для VK нужен scope «phone») и что токен от того же приложения."
            )
        
        # Нормализуем номер телефона
        phone_clean = phone.replace('+', '').replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
        if phone_clean.startswith('8') and len(phone_clean) == 11:
            phone_clean = '7' + phone_clean[1:]
        if not phone_clean.startswith('7'):
            phone_clean = '7' + phone_clean
        
        phone_formatted = '+' + phone_clean
        
        # Проверяем что гость существует в базе
        guest = await guest_service.get_guest_by_phone(phone_formatted)
        
        if guest is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Гость с таким номером телефона не найден"
            )
        
        # Создаем сессию (генерируем access и refresh токены)
        access_token, refresh_token = await session_service.create_session(
            redis_client,
            phone_formatted
        )
        
        provider_names = {
            "vk": "VK",
            "yandex": "Яндекс"
        }
        
        return OAuthLoginResponse(
            success=True,
            access_token=access_token,
            refresh_token=refresh_token,
            message=f"Авторизация через {provider_names.get(request.provider, request.provider)} успешна",
            phone=phone_formatted
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка OAuth авторизации: {str(e)}"
        )


@router.post(
    "/exchange-code",
    response_model=OAuthExchangeCodeResponse,
    status_code=status.HTTP_200_OK,
    summary="Обмен кода авторизации на токен",
    description="Обменивает код авторизации на access token для VK ID"
)
async def exchange_code(
    request: OAuthExchangeCodeRequest,
) -> OAuthExchangeCodeResponse:
    """
    Обменивает код авторизации на access token
    Используется для VK ID SDK (Authorization Code Flow)
    """
    if request.provider != "vk":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Обмен кода поддерживается только для VK"
        )
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # VK ID (id.vk.ru): при наличии code_verifier используем PKCE (документация: client_secret обязателен для server-side)
            if request.code_verifier:
                response = await client.post(
                    "https://id.vk.ru/oauth2/auth",
                    data={
                        "grant_type": "authorization_code",
                        "code": request.code,
                        "redirect_uri": request.redirect_uri,
                        "client_id": settings.VK_CLIENT_ID,
                        "client_secret": settings.VK_CLIENT_SECRET,
                        "code_verifier": request.code_verifier,
                    },
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )
            else:
                # Классический VK OAuth (oauth.vk.com)
                response = await client.get(
                    "https://oauth.vk.com/access_token",
                    params={
                        "client_id": settings.VK_CLIENT_ID,
                        "client_secret": settings.VK_CLIENT_SECRET,
                        "redirect_uri": request.redirect_uri,
                        "code": request.code
                    }
                )
            
            if response.status_code != 200:
                error_data = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
                err_msg = error_data.get("error_description") or error_data.get("error") or "Неизвестная ошибка"
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=str(err_msg)
                )
            
            data = response.json()
            if "error" in data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=data.get("error_description", data.get("error", "Неизвестная ошибка"))
                )
            
            access_token = data.get("access_token")
            if not access_token:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Токен не получен от VK"
                )
            
            user_id = data.get("user_id")
            if isinstance(user_id, str):
                try:
                    user_id = int(user_id)
                except (ValueError, TypeError):
                    user_id = None
            
            return OAuthExchangeCodeResponse(
                access_token=access_token,
                expires_in=data.get("expires_in"),
                user_id=user_id
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка обмена кода на токен: {str(e)}"
        )

