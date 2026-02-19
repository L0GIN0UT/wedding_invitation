"""
Схемы для пожеланий гостей
"""
from pydantic import BaseModel, Field
from typing import List, Optional


# Словари для форм
FOOD_CHOICES = ["Мясо", "Рыба", "Веган", "Нет предпочтений"]

ALCOHOL_CHOICES = [
    "Вино красное",
    "Вино белое",
    "Шампанское",
    "Коньяк",
    "Водка",
    "Виски"
]


class PreferencesFormOptionsResponse(BaseModel):
    """Ответ с вариантами для форм пожеланий"""
    food_choices: List[str] = Field(..., description="Варианты предпочтений по еде")
    alcohol_choices: List[str] = Field(..., description="Варианты предпочтений по алкоголю")


class FoodPreferenceRequest(BaseModel):
    """Запрос на сохранение предпочтения по еде"""
    food_choice: str = Field(..., description="Выбор: Мясо, Рыба, Веган, Нет предпочтений")


class FoodPreferenceResponse(BaseModel):
    """Ответ с предпочтением по еде"""
    success: bool
    message: str
    food_choice: Optional[str] = None


class AlcoholPreferenceRequest(BaseModel):
    """Запрос на сохранение предпочтений по алкоголю"""
    alcohol_choices: List[str] = Field(..., min_length=0, max_length=3, description="Список от 0 до 3 видов алкоголя")


class AlcoholPreferenceResponse(BaseModel):
    """Ответ с предпочтениями по алкоголю"""
    success: bool
    message: str
    alcohol_choices: Optional[List[str]] = None


class AllergyRequest(BaseModel):
    """Запрос на добавление аллергии"""
    allergen: str = Field(..., min_length=3, max_length=12, description="Название аллергена (3–12 символов)")


class AllergyResponse(BaseModel):
    """Ответ с аллергией"""
    success: bool
    message: str
    allergen: Optional[str] = None


class AllergiesListResponse(BaseModel):
    """Ответ со списком аллергий"""
    allergies: List[str] = Field(..., description="Список аллергий")


class PreferencesResponse(BaseModel):
    """Полный ответ с пожеланиями гостя"""
    food_preference: Optional[str] = None
    alcohol_preferences: Optional[List[str]] = None
    allergies: List[str] = Field(default_factory=list)

