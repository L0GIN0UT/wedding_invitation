"""
Роутер для работы со списком гостей и famili_prefer_forms
"""
from fastapi import APIRouter, HTTPException, status, Depends
from dependencies.auth import get_current_user
from dependencies.redis import RedisDep
from schemas.guests import (
    GuestListItem,
    GuestListResponse,
    AddFamiliPreferFormRequest,
    FamiliPreferFormItem,
    FamiliPreferFormsResponse,
)
from services.guest import guest_service
from services.preferences import preferences_service

router = APIRouter(prefix="/guests", tags=["Гости"])


@router.get(
    "",
    response_model=GuestListResponse,
    status_code=status.HTTP_200_OK,
    summary="Список гостей",
    description="Возвращает список гостей с сортировкой (sort_by: last_name, first_name, patronomic, phone)",
)
async def list_guests(
    sort_by: str = "last_name",
    current_user: dict = Depends(get_current_user),
    redis_client: RedisDep = None,
) -> GuestListResponse:
    """Список гостей для авторизованного пользователя."""
    guests = await guest_service.list_guests(sort_by=sort_by)
    return GuestListResponse(
        guests=[GuestListItem(**g) for g in guests]
    )


@router.post(
    "/famili-prefer-forms",
    status_code=status.HTTP_200_OK,
    summary="Добавить гостя в famili_prefer_forms",
    description="Добавляет гостя в список «за кого можно заполнять предпочтения»",
)
async def add_to_famili_prefer_forms(
    request: AddFamiliPreferFormRequest,
    current_user: dict = Depends(get_current_user),
    redis_client: RedisDep = None,
):
    """Добавляет UUID гостя в famili_prefer_forms текущего пользователя."""
    try:
        await guest_service.add_to_famili_prefer_forms(
            current_user["uuid"],
            str(request.guest_uuid),
        )
        return {"success": True, "message": "Гость добавлен"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.delete(
    "/famili-prefer-forms",
    status_code=status.HTTP_200_OK,
    summary="Удалить гостя из famili_prefer_forms",
    description="Удаляет гостя из списка «за кого можно заполнять предпочтения»",
)
async def remove_from_famili_prefer_forms(
    request: AddFamiliPreferFormRequest,
    current_user: dict = Depends(get_current_user),
    redis_client: RedisDep = None,
):
    """Удаляет UUID гостя из famili_prefer_forms текущего пользователя."""
    await guest_service.remove_from_famili_prefer_forms(
        current_user["uuid"],
        str(request.guest_uuid),
    )
    return {"success": True, "message": "Гость удалён"}


@router.get(
    "/famili-prefer-forms",
    response_model=FamiliPreferFormsResponse,
    status_code=status.HTTP_200_OK,
    summary="Предпочтения за людей из famili_prefer_forms",
    description="Возвращает список гостей из famili_prefer_forms с их предпочтениями",
)
async def get_famili_prefer_forms(
    current_user: dict = Depends(get_current_user),
    redis_client: RedisDep = None,
) -> FamiliPreferFormsResponse:
    """Список гостей, за которых можно заполнять формы, с их предпочтениями."""
    uuids = await guest_service.get_famili_prefer_forms(current_user["uuid"])
    items = []
    for uid in uuids:
        guest = await guest_service.get_guest_by_uuid(uid)
        if not guest:
            continue
        prefs = await preferences_service.get_all_preferences(uid)
        items.append(
            FamiliPreferFormItem(
                guest_uuid=uid,
                last_name=guest.get("last_name"),
                first_name=guest.get("first_name") or "",
                patronomic=guest.get("patronomic"),
                food_preference=prefs.get("food_preference"),
                alcohol_preferences=prefs.get("alcohol_preferences") or [],
                allergies=prefs.get("allergies") or [],
                have_allergies=prefs.get("have_allergies"),
            )
        )
    return FamiliPreferFormsResponse(items=items)
