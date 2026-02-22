"""
Схемы для API гостей (список, famili_prefer_forms)
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID


class GuestListItem(BaseModel):
    """Элемент списка гостей для API"""
    uuid: str = Field(..., description="UUID гостя")
    phone: Optional[str] = Field(None, description="Номер телефона")
    last_name: Optional[str] = Field(None, description="Фамилия")
    first_name: str = Field(..., description="Имя")
    patronomic: Optional[str] = Field(None, description="Отчество")


class GuestListResponse(BaseModel):
    """Ответ со списком гостей"""
    guests: List[GuestListItem] = Field(..., description="Список гостей")


class AddFamiliPreferFormRequest(BaseModel):
    """Запрос на добавление гостя в famili_prefer_forms"""
    guest_uuid: UUID = Field(..., description="UUID гостя для добавления")


class FamiliPreferFormItem(BaseModel):
    """Один гость из famili_prefer_forms с его предпочтениями"""
    guest_uuid: str
    last_name: Optional[str] = None
    first_name: str = ""
    patronomic: Optional[str] = None
    food_preference: Optional[str] = None
    alcohol_preferences: List[str] = Field(default_factory=list)
    allergies: List[str] = Field(default_factory=list)
    have_allergies: Optional[bool] = None


class FamiliPreferFormsResponse(BaseModel):
    """Ответ со списком гостей из famili_prefer_forms и их предпочтениями"""
    items: List[FamiliPreferFormItem] = Field(..., description="Список гостей с предпочтениями")
