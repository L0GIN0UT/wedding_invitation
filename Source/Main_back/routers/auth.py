"""
Роутер для авторизации
"""
from fastapi import APIRouter, HTTPException, status
from redis.asyncio import Redis

from dependencies.redis import RedisDep
from schemas.auth import (
    SendCodeRequest,
    SendCodeResponse,
    VerifyCodeRequest,
    VerifyCodeResponse,
    LogoutRequest,
    LogoutResponse
)
from services.verification import verification_service
from services.session import session_service
from services.guest import guest_service

router = APIRouter(prefix="/auth", tags=["Авторизация"])


@router.post(
    "/send-code",
    response_model=SendCodeResponse,
    status_code=status.HTTP_200_OK,
    summary="Отправка кода верификации",
    description="Отправляет код верификации на указанный номер телефона"
)
async def send_code(
    request: SendCodeRequest,
    redis_client: RedisDep
) -> SendCodeResponse:
    """
    Отправляет код верификации на номер телефона через выбранный метод
    """
    # Проверяем что гость существует в базе с таким номером телефона
    guest = await guest_service.get_guest_by_phone(request.phone)
    
    if guest is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Гость с таким номером телефона не найден"
        )
    
    # Получаем блокировку для предотвращения одновременных запросов
    lock_acquired = await verification_service.acquire_lock(
        redis_client,
        request.phone,
        timeout=10  # Блокировка на 10 секунд
    )
    
    if not lock_acquired:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Запрос уже обрабатывается. Подождите несколько секунд."
        )
    
    try:
        # Проверяем cooldown (минимальный интервал между запросами)
        can_request, seconds_remaining = await verification_service.can_request_code(
            redis_client,
            request.phone
        )
        
        if not can_request:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Слишком частые запросы. Попробуйте через {seconds_remaining} секунд."
            )
        
        # Отправляем звонок с кодом
        await verification_service.send_code_to_phone(
            redis_client,
            request.phone
        )
        
        return SendCodeResponse(
            success=True,
            message="Вам поступит звонок. Последние 4 цифры номера звонящего - это ваш код верификации."
        )
    except HTTPException:
        # Пробрасываем HTTPException как есть (для кулдауна и других HTTP ошибок)
        raise
    except Exception as e:
        # Обрабатываем только неожиданные ошибки
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при отправке кода: {str(e)}"
        )
    finally:
        # Освобождаем блокировку
        await verification_service.release_lock(redis_client, request.phone)


@router.post(
    "/verify-code",
    response_model=VerifyCodeResponse,
    status_code=status.HTTP_200_OK,
    summary="Подтверждение кода",
    description="Подтверждает код верификации и создает сессию пользователя"
)
async def verify_code(
    request: VerifyCodeRequest,
    redis_client: RedisDep
) -> VerifyCodeResponse:
    """
    Подтверждает код верификации и создает сессию
    """
    # Проверяем код
    is_valid, message = await verification_service.verify_code(
        redis_client,
        request.phone,
        request.code
    )
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    # Проверяем что гость существует в базе
    guest = await guest_service.get_guest_by_phone(request.phone)
    
    if guest is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Гость с таким номером телефона не найден"
        )
    
    # Создаем сессию
    token = await session_service.create_session(
        redis_client,
        request.phone
    )
    
    return VerifyCodeResponse(
        success=True,
        token=token,
        message="Код подтвержден, сессия создана"
    )


@router.post(
    "/logout",
    response_model=LogoutResponse,
    status_code=status.HTTP_200_OK,
    summary="Выход из системы",
    description="Удаляет сессию пользователя"
)
async def logout(
    request: LogoutRequest,
    redis_client: RedisDep
) -> LogoutResponse:
    """
    Удаляет сессию пользователя
    """
    try:
        await session_service.delete_session(
            redis_client,
            request.token
        )
        return LogoutResponse(
            success=True,
            message="Выход выполнен успешно"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при выходе: {str(e)}"
        )

