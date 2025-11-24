"""
Роутер для пожеланий гостей
"""
from fastapi import APIRouter, HTTPException, status, Depends
from dependencies.auth import get_current_user
from dependencies.redis import RedisDep
from schemas.preferences import (
    PreferencesFormOptionsResponse,
    FoodPreferenceRequest,
    FoodPreferenceResponse,
    AlcoholPreferenceRequest,
    AlcoholPreferenceResponse,
    AllergyRequest,
    AllergyResponse,
    PreferencesResponse,
    FOOD_CHOICES,
    ALCOHOL_CHOICES
)
from services.preferences import preferences_service

router = APIRouter(prefix="/preferences", tags=["Пожелания"])


@router.get(
    "/form-options",
    response_model=PreferencesFormOptionsResponse,
    status_code=status.HTTP_200_OK,
    summary="Получить варианты для форм",
    description="Возвращает доступные варианты для заполнения форм пожеланий"
)
async def get_form_options(
    current_user: dict = Depends(get_current_user),
    redis_client: RedisDep = None
) -> PreferencesFormOptionsResponse:
    """Возвращает варианты для форм пожеланий (только для авторизованных пользователей)"""
    return PreferencesFormOptionsResponse(
        food_choices=FOOD_CHOICES,
        alcohol_choices=ALCOHOL_CHOICES
    )


@router.get(
    "/",
    response_model=PreferencesResponse,
    status_code=status.HTTP_200_OK,
    summary="Получить все пожелания",
    description="Возвращает все пожелания текущего авторизованного гостя"
)
async def get_preferences(
    current_user: dict = Depends(get_current_user),
    redis_client: RedisDep = None
) -> PreferencesResponse:
    """Получает все пожелания гостя"""
    preferences = await preferences_service.get_all_preferences(current_user["uuid"])
    
    return PreferencesResponse(
        food_preference=preferences["food_preference"],
        alcohol_preferences=preferences["alcohol_preferences"],
        allergies=preferences["allergies"]
    )


@router.post(
    "/food",
    response_model=FoodPreferenceResponse,
    status_code=status.HTTP_200_OK,
    summary="Сохранить предпочтение по еде",
    description="Сохраняет или обновляет предпочтение по еде для текущего гостя"
)
async def set_food_preference(
    request: FoodPreferenceRequest,
    current_user: dict = Depends(get_current_user),
    redis_client: RedisDep = None
) -> FoodPreferenceResponse:
    """Сохраняет предпочтение по еде"""
    if request.food_choice not in FOOD_CHOICES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Недопустимый выбор. Доступные варианты: {', '.join(FOOD_CHOICES)}"
        )
    
    await preferences_service.set_food_preference(
        current_user["uuid"],
        request.food_choice
    )
    
    return FoodPreferenceResponse(
        success=True,
        message="Предпочтение по еде сохранено",
        food_choice=request.food_choice
    )


@router.post(
    "/alcohol",
    response_model=AlcoholPreferenceResponse,
    status_code=status.HTTP_200_OK,
    summary="Сохранить предпочтения по алкоголю",
    description="Сохраняет или обновляет предпочтения по алкоголю для текущего гостя (1-3 вида)"
)
async def set_alcohol_preferences(
    request: AlcoholPreferenceRequest,
    current_user: dict = Depends(get_current_user),
    redis_client: RedisDep = None
) -> AlcoholPreferenceResponse:
    """Сохраняет предпочтения по алкоголю"""
    # Проверяем что все выбранные варианты допустимы
    invalid_choices = [choice for choice in request.alcohol_choices if choice not in ALCOHOL_CHOICES]
    if invalid_choices:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Недопустимые варианты: {', '.join(invalid_choices)}"
        )
    
    await preferences_service.set_alcohol_preferences(
        current_user["uuid"],
        request.alcohol_choices
    )
    
    return AlcoholPreferenceResponse(
        success=True,
        message="Предпочтения по алкоголю сохранены",
        alcohol_choices=request.alcohol_choices
    )


@router.post(
    "/allergies",
    response_model=AllergyResponse,
    status_code=status.HTTP_200_OK,
    summary="Добавить аллергию",
    description="Добавляет аллергию для текущего гостя"
)
async def add_allergy(
    request: AllergyRequest,
    current_user: dict = Depends(get_current_user),
    redis_client: RedisDep = None
) -> AllergyResponse:
    """Добавляет аллергию"""
    # Проверяем что такой аллергии еще нет
    existing_allergies = await preferences_service.get_allergies(current_user["uuid"])
    if request.allergen in existing_allergies:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Такая аллергия уже добавлена"
        )
    
    await preferences_service.add_allergy(
        current_user["uuid"],
        request.allergen
    )
    
    return AllergyResponse(
        success=True,
        message="Аллергия добавлена",
        allergen=request.allergen
    )


@router.delete(
    "/allergies",
    response_model=AllergyResponse,
    status_code=status.HTTP_200_OK,
    summary="Удалить аллергию",
    description="Удаляет аллергию для текущего гостя"
)
async def delete_allergy(
    request: AllergyRequest,
    current_user: dict = Depends(get_current_user),
    redis_client: RedisDep = None
) -> AllergyResponse:
    """Удаляет аллергию"""
    await preferences_service.delete_allergy(
        current_user["uuid"],
        request.allergen
    )
    
    return AllergyResponse(
        success=True,
        message="Аллергия удалена",
        allergen=request.allergen
    )

