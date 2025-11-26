"""
Роутер для RSVP (подтверждение присутствия)
"""
from fastapi import APIRouter, HTTPException, status, Depends
from dependencies.auth import get_current_user
from dependencies.redis import RedisDep
from schemas.rsvp import RSVPRequest, RSVPResponse
from services.guest import guest_service

router = APIRouter(prefix="/rsvp", tags=["RSVP"])


@router.post(
    "/",
    response_model=RSVPResponse,
    status_code=status.HTTP_200_OK,
    summary="Подтвердить присутствие",
    description="Подтверждает или отклоняет присутствие на свадьбе"
)
async def confirm_rsvp(
    request: RSVPRequest,
    current_user: dict = Depends(get_current_user),
    redis_client: RedisDep = None
) -> RSVPResponse:
    """Подтверждает или отклоняет присутствие на свадьбе"""
    try:
        await guest_service.update_rsvp(
            current_user["uuid"],
            request.rsvp
        )
        
        message = "Подтверждение присутствия сохранено" if request.rsvp else "Отклонение присутствия сохранено"
        
        return RSVPResponse(
            success=True,
            message=message,
            rsvp=request.rsvp
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при сохранении RSVP: {str(e)}"
        )


@router.get(
    "/",
    response_model=RSVPResponse,
    status_code=status.HTTP_200_OK,
    summary="Получить статус RSVP",
    description="Возвращает текущий статус подтверждения присутствия"
)
async def get_rsvp(
    current_user: dict = Depends(get_current_user),
    redis_client: RedisDep = None
) -> RSVPResponse:
    """Получает текущий статус RSVP"""
    rsvp = await guest_service.get_rsvp(current_user["uuid"])
    
    if rsvp is None:
        return RSVPResponse(
            success=True,
            message="RSVP еще не подтвержден",
            rsvp=None
        )
    
    message = "Вы подтвердили присутствие" if rsvp else "Вы отклонили приглашение"
    
    return RSVPResponse(
        success=True,
        message=message,
        rsvp=rsvp
    )

