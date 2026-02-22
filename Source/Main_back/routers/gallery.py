"""
Галерея: выдача URL с медиа-токеном для доступа к файловому хранилищу.
Все эндпоинты только для авторизованных пользователей.
"""
from urllib.parse import quote

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status

from dependencies.auth import get_current_user
from schemas.gallery import FileListResponse, GalleryStatusResponse, StreamUrlResponse
from services.session import session_service
from conf.settings import settings

router = APIRouter(prefix="/gallery", tags=["Галерея"])

# Папки, для которых разрешено скачивание (attachment)
DOWNLOAD_ALLOWED = {"wedding_day_all_photos", "wedding_day_video"}
# Типы архивов для /archive-url
ARCHIVE_TYPES = {"wedding_day_all_photos", "wedding_day_video", "wedding_best_moments"}


@router.get("/status", response_model=GalleryStatusResponse)
async def gallery_status(current_user: dict = Depends(get_current_user)):
    """Флаг доступности контента галереи. Если False — на фронте показывать сообщение «скоро после мероприятия»."""
    return GalleryStatusResponse(content_enabled=settings.GALLERY_CONTENT_ENABLED)


def _media_url(path: str, endpoint: str, **params) -> str:
    """Формирует полный URL для доступа к файловому хранилищу с токеном."""
    token = session_service.generate_media_token(path=path)
    base = settings.file_storage_media_url_base.rstrip("/")
    params["token"] = token
    if path:
        params["path"] = path
    q = "&".join(f"{k}={quote(str(v))}" for k, v in params.items())
    return f"{base}/{endpoint}?{q}"


@router.get("/list", response_model=FileListResponse)
async def gallery_list(
    folder: str = Query(..., description="Имя папки: couple_photo, background_photo, dress_code, wedding_day_all_photos, wedding_day_video, zip"),
    current_user: dict = Depends(get_current_user),
):
    """Список файлов в папке. Только для авторизованных."""
    if folder not in settings.file_storage_folders:
        raise HTTPException(status_code=400, detail="Неизвестная папка")
    token = session_service.generate_media_token(scope="list")
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{settings.file_storage_internal_url}/list",
            params={"folder": folder, "token": token},
            timeout=10.0,
        )
    if r.status_code != 200:
        raise HTTPException(status_code=r.status_code, detail=r.text or "Ошибка файлового хранилища")
    return r.json()


@router.get("/stream-url", response_model=StreamUrlResponse)
async def get_stream_url(
    path: str = Query(..., description="Относительный путь, например wedding_day_video/main.mp4"),
    current_user: dict = Depends(get_current_user),
):
    """URL для просмотра файла (видео/фото). Подставить в <video src> или <img src>."""
    base = settings.file_storage_media_url_base.rstrip("/")
    token = session_service.generate_media_token(path=path)
    url = f"{base}/stream?path={quote(path)}&token={token}"
    return StreamUrlResponse(url=url)


@router.get("/download-url", response_model=StreamUrlResponse)
async def get_download_url(
    path: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    """URL для скачивания файла. Только для папок wedding_day_all_photos и wedding_day_video."""
    parts = path.replace("\\", "/").strip("/").split("/")
    if not parts or parts[0] not in DOWNLOAD_ALLOWED:
        raise HTTPException(
            status_code=403,
            detail="Скачивание разрешено только для файлов из wedding_day_all_photos и wedding_day_video",
        )
    base = settings.file_storage_media_url_base.rstrip("/")
    token = session_service.generate_media_token(path=path)
    url = f"{base}/download?path={quote(path)}&token={token}"
    return StreamUrlResponse(url=url)


@router.get("/archive-url", response_model=StreamUrlResponse)
async def get_archive_url(
    type: str = Query(..., description="wedding_day_all_photos, wedding_day_video или wedding_best_moments"),
    current_user: dict = Depends(get_current_user),
):
    """URL для скачивания архива (zip)."""
    if type not in ARCHIVE_TYPES:
        raise HTTPException(status_code=400, detail="type должен быть wedding_day_all_photos, wedding_day_video или wedding_best_moments")
    base = settings.file_storage_media_url_base.rstrip("/")
    token = session_service.generate_media_token(scope=f"archive:{type}")
    url = f"{base}/archive?type={quote(type)}&token={token}"
    return StreamUrlResponse(url=url)
