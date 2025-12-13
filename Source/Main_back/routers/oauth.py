"""
Роутер для OAuth2 авторизации
"""
from fastapi import APIRouter, HTTPException, status
from redis.asyncio import Redis
import logging

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

logger = logging.getLogger(__name__)

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
        # Получаем номер телефона через OAuth провайдер
        phone = await oauth_factory.get_user_phone(
            request.provider,
            request.access_token
        )
        
        if not phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Не удалось получить номер телефона из {request.provider}"
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
    
    # Валидация обязательных параметров
    if not request.code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Код авторизации обязателен"
        )
    if not request.redirect_uri:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Redirect URI обязателен"
        )
    if not request.code_verifier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Code verifier обязателен для VK ID с PKCE"
        )
    
    logger.info(f"VK ID token exchange: redirect_uri={request.redirect_uri}, code_length={len(request.code)}, code_verifier_length={len(request.code_verifier) if request.code_verifier else 0}")
    
    try:
        # Обмениваем код на токен через VK API
        # Сначала пробуем VK ID (OAuth 2.1) с PKCE, так как ошибка "Selected sign-in method not available"
        # означает, что приложение настроено на VK ID, а не на старый OAuth
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Пробуем VK ID endpoint сначала (если есть code_verifier)
            if request.code_verifier:
                # По документации VK ID правильный endpoint: https://id.vk.ru/oauth2/auth
                # Пробуем сначала все параметры в body (application/x-www-form-urlencoded)
                exchange_data = {
                    "grant_type": "authorization_code",
                    "client_id": settings.VK_CLIENT_ID,
                    "redirect_uri": request.redirect_uri,
                    "code": request.code,
                    "code_verifier": request.code_verifier
                }
                
                logger.info(f"VK ID token exchange attempt: redirect_uri={request.redirect_uri}, has_code_verifier={bool(request.code_verifier)}")
                
                response = await client.post(
                    "https://id.vk.ru/oauth2/auth",
                    data=exchange_data
                )
                
                # Логируем ответ для отладки
                if response.status_code != 200:
                    try:
                        error_text = response.text
                        logger.error(f"VK ID token exchange failed: {response.status_code} - {error_text[:500]}")
                    except:
                        logger.error(f"VK ID token exchange failed: {response.status_code}")
                
                # Если не работает, пробуем с параметрами в query string (как в некоторых примерах)
                if response.status_code != 200:
                    logger.info("Trying alternative format with query parameters")
                    response = await client.post(
                        "https://id.vk.ru/oauth2/auth",
                        params={
                            "grant_type": "authorization_code",
                            "client_id": settings.VK_CLIENT_ID,
                            "redirect_uri": request.redirect_uri,
                            "code_verifier": request.code_verifier
                        },
                        data={
                            "code": request.code
                        }
                    )
            else:
                # Если нет code_verifier, пробуем старый OAuth
                response = await client.get(
                    "https://oauth.vk.com/access_token",
                    params={
                        "client_id": settings.VK_CLIENT_ID,
                        "client_secret": settings.VK_CLIENT_SECRET,
                        "redirect_uri": request.redirect_uri,
                        "code": request.code
                    }
                )
            
            # Дополнительные попытки уже сделаны выше
            
            if response.status_code != 200:
                # Логируем детали ошибки для отладки
                try:
                    error_data = response.json()
                    error_text = error_data.get('error_description', error_data.get('error', response.text))
                    logger.error(f"VK token exchange error: {response.status_code} - {error_text}")
                except:
                    error_text = response.text or 'Неизвестная ошибка'
                    logger.error(f"VK token exchange error: {response.status_code} - {error_text}")
                
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Ошибка обмена кода на токен: {error_text}"
                )
            
            data = response.json()
            
            if "error" in data:
                error_text = data.get('error_description', data.get('error', 'Неизвестная ошибка'))
                logger.error(f"VK API error: {error_text}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Ошибка VK: {error_text}"
                )
            
            return OAuthExchangeCodeResponse(
                access_token=data.get("access_token"),
                expires_in=data.get("expires_in"),
                user_id=data.get("user_id")
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка обмена кода на токен: {str(e)}"
        )

