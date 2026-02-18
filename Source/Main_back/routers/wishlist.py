"""
Роутер для вишлиста
"""
from fastapi import APIRouter, HTTPException, status, Depends
from dependencies.auth import get_current_user
from dependencies.redis import RedisDep
from schemas.wishlist import (
    WishlistResponse,
    WishlistItemResponse,
    ReserveWishlistItemRequest,
    ReserveWishlistItemResponse,
    UnreserveWishlistItemRequest,
    UnreserveWishlistItemResponse
)
from services.wishlist_service import wishlist_service

router = APIRouter(prefix="/wishlist", tags=["Вишлист"])


@router.get(
    "/",
    response_model=WishlistResponse,
    status_code=status.HTTP_200_OK,
    summary="Получить вишлист",
    description="Возвращает весь вишлист (предметы невесты и жениха)"
)
async def get_wishlist(
    current_user: dict = Depends(get_current_user),
    redis_client: RedisDep = None
) -> WishlistResponse:
    """Получает весь вишлист"""
    items = await wishlist_service.get_all_wishlist_items()
    
    # Преобразуем в модели ответа
    wishlist_items = [
        WishlistItemResponse(**item) for item in items
    ]
    
    # Разделяем на предметы невесты и жениха
    bride_items = [item for item in wishlist_items if item.owner_type == "bride"]
    groom_items = [item for item in wishlist_items if item.owner_type == "groom"]
    
    return WishlistResponse(
        items=wishlist_items,
        bride_items=bride_items,
        groom_items=groom_items,
        current_user_uuid=current_user["uuid"]
    )


@router.post(
    "/reserve",
    response_model=ReserveWishlistItemResponse,
    status_code=status.HTTP_200_OK,
    summary="Забронировать предмет",
    description="Бронирует предмет из вишлиста за текущим гостем"
)
async def reserve_item(
    request: ReserveWishlistItemRequest,
    current_user: dict = Depends(get_current_user),
    redis_client: RedisDep = None
) -> ReserveWishlistItemResponse:
    """Бронирует предмет из вишлиста"""
    try:
        item = await wishlist_service.reserve_item(
            request.wishlist_uuid,
            current_user["uuid"]
        )
        
        return ReserveWishlistItemResponse(
            success=True,
            message="Предмет успешно забронирован",
            item=WishlistItemResponse(**item)
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при бронировании: {str(e)}"
        )


@router.post(
    "/unreserve",
    response_model=UnreserveWishlistItemResponse,
    status_code=status.HTTP_200_OK,
    summary="Отменить бронирование",
    description="Отменяет бронирование предмета (только если он забронирован текущим гостем)"
)
async def unreserve_item(
    request: UnreserveWishlistItemRequest,
    current_user: dict = Depends(get_current_user),
    redis_client: RedisDep = None
) -> UnreserveWishlistItemResponse:
    """Отменяет бронирование предмета"""
    try:
        await wishlist_service.unreserve_item(
            request.wishlist_uuid,
            current_user["uuid"]
        )
        
        return UnreserveWishlistItemResponse(
            success=True,
            message="Бронирование отменено"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при отмене бронирования: {str(e)}"
        )

