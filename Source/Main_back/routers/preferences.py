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
    HaveAllergiesRequest,
    PreferencesResponse,
    FOOD_CHOICES,
    ALCOHOL_CHOICES
)
from services.preferences import preferences_service
from services.guest import guest_service

router = APIRouter(prefix="/preferences", tags=["Пожелания"])


def _target_guest_uuid(current_user: dict, for_guest_uuid: str | None) -> str:
    """Возвращает UUID гостя, для которого выполняем операцию. Проверяет доступ по famili_prefer_forms."""
    if not for_guest_uuid:
        return current_user["uuid"]
    allowed = current_user.get("famili_prefer_forms") or []
    if for_guest_uuid not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нельзя изменять предпочтения этого гостя",
        )
    return for_guest_uuid


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
    description="Возвращает все пожелания гостя (текущего или for_guest_uuid из famili_prefer_forms)"
)
async def get_preferences(
    for_guest_uuid: str | None = None,
    current_user: dict = Depends(get_current_user),
    redis_client: RedisDep = None
) -> PreferencesResponse:
    """Получает все пожелания гостя (свои или за другого по for_guest_uuid)."""
    target = _target_guest_uuid(current_user, for_guest_uuid)
    preferences = await preferences_service.get_all_preferences(target)
    
    return PreferencesResponse(
        food_preference=preferences["food_preference"],
        alcohol_preferences=preferences["alcohol_preferences"],
        allergies=preferences["allergies"],
        have_allergies=preferences.get("have_allergies")
    )


@router.patch(
    "/have-allergies",
    response_model=PreferencesResponse,
    status_code=status.HTTP_200_OK,
    summary="Установить «есть ли аллергии»",
    description="Сохраняет выбор Да/Нет по наличию аллергий (для себя или for_guest_uuid)"
)
async def set_have_allergies(
    request: HaveAllergiesRequest,
    for_guest_uuid: str | None = None,
    current_user: dict = Depends(get_current_user),
    redis_client: RedisDep = None
) -> PreferencesResponse:
    """Устанавливает флаг have_allergies для гостя (своего или из famili_prefer_forms)."""
    target = _target_guest_uuid(current_user, for_guest_uuid)
    await guest_service.set_have_allergies(target, request.have_allergies)
    preferences = await preferences_service.get_all_preferences(target)
    return PreferencesResponse(
        food_preference=preferences["food_preference"],
        alcohol_preferences=preferences["alcohol_preferences"],
        allergies=preferences["allergies"],
        have_allergies=preferences.get("have_allergies")
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
    for_guest_uuid: str | None = None,
    current_user: dict = Depends(get_current_user),
    redis_client: RedisDep = None
) -> FoodPreferenceResponse:
    """Сохраняет предпочтение по еде (для себя или for_guest_uuid)."""
    if request.food_choice not in FOOD_CHOICES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Недопустимый выбор. Доступные варианты: {', '.join(FOOD_CHOICES)}"
        )
    target = _target_guest_uuid(current_user, for_guest_uuid)
    await preferences_service.set_food_preference(target, request.food_choice)
    
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
    for_guest_uuid: str | None = None,
    current_user: dict = Depends(get_current_user),
    redis_client: RedisDep = None
) -> AlcoholPreferenceResponse:
    """Сохраняет предпочтения по алкоголю (для себя или for_guest_uuid)."""
    invalid_choices = [choice for choice in request.alcohol_choices if choice not in ALCOHOL_CHOICES]
    if invalid_choices:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Недопустимые варианты: {', '.join(invalid_choices)}"
        )
    target = _target_guest_uuid(current_user, for_guest_uuid)
    await preferences_service.set_alcohol_preferences(target, request.alcohol_choices)
    
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
    for_guest_uuid: str | None = None,
    current_user: dict = Depends(get_current_user),
    redis_client: RedisDep = None
) -> AllergyResponse:
    """Добавляет аллергию (для себя или for_guest_uuid)."""
    target = _target_guest_uuid(current_user, for_guest_uuid)
    existing_allergies = await preferences_service.get_allergies(target)
    if request.allergen in existing_allergies:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Такая аллергия уже добавлена"
        )
    await preferences_service.add_allergy(target, request.allergen)
    
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
    for_guest_uuid: str | None = None,
    current_user: dict = Depends(get_current_user),
    redis_client: RedisDep = None
) -> AllergyResponse:
    """Удаляет аллергию (для себя или for_guest_uuid)."""
    target = _target_guest_uuid(current_user, for_guest_uuid)
    await preferences_service.delete_allergy(target, request.allergen)
    
    return AllergyResponse(
        success=True,
        message="Аллергия удалена",
        allergen=request.allergen
    )

