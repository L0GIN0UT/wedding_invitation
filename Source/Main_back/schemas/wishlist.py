"""
Схемы для вишлиста
"""
from pydantic import BaseModel, Field
from typing import Optional, List


class WishlistItemResponse(BaseModel):
    """Элемент вишлиста"""
    uuid: str
    wish_id: str
    item: str
    link: Optional[str] = None  # Ссылка на подарок (опционально)
    owner_type: str  # 'bride' или 'groom'
    user_uuid: Optional[str] = None  # UUID гостя, который выбрал предмет (если выбран)
    created_at: str


class WishlistResponse(BaseModel):
    """Ответ со списком вишлиста"""
    items: List[WishlistItemResponse] = Field(..., description="Список предметов вишлиста")
    bride_items: List[WishlistItemResponse] = Field(default_factory=list, description="Предметы невесты")
    groom_items: List[WishlistItemResponse] = Field(default_factory=list, description="Предметы жениха")
    current_user_uuid: Optional[str] = Field(None, description="UUID текущего гостя (для сравнения с user_uuid предмета)")


class ReserveWishlistItemRequest(BaseModel):
    """Запрос на бронирование предмета из вишлиста"""
    wishlist_uuid: str = Field(..., description="UUID предмета из вишлиста")


class ReserveWishlistItemResponse(BaseModel):
    """Ответ на бронирование предмета"""
    success: bool
    message: str
    item: Optional[WishlistItemResponse] = None


class UnreserveWishlistItemRequest(BaseModel):
    """Запрос на отмену бронирования предмета"""
    wishlist_uuid: str = Field(..., description="UUID предмета из вишлиста")


class UnreserveWishlistItemResponse(BaseModel):
    """Ответ на отмену бронирования"""
    success: bool
    message: str

