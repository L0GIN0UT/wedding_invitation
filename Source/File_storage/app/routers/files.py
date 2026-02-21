"""
Эндпоинты: список файлов, stream (с Range), download, archive.
Роутер только координирует запрос/ответ, логика — в сервисе.
"""
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import FileResponse, StreamingResponse

from app.dependencies import verify_media_token
from app.models import ArchiveType, DataFolder, FileListResponse
from app.services.storage_service import StorageError, storage_service

router = APIRouter(prefix="", tags=["Файлы"])


def _handle_storage_error(exc: StorageError):
    raise HTTPException(status_code=exc.status_code, detail=exc.message)


@router.get("/list", response_model=FileListResponse)
async def list_files(
    folder: DataFolder = Query(...),
    token_payload: dict = Depends(verify_media_token),
):
    """Список относительных путей файлов в папке (сортировка по имени)."""
    try:
        paths = storage_service.list_files(folder)
    except StorageError as e:
        _handle_storage_error(e)
    return FileListResponse(folder=folder.value, paths=paths)


def _build_file_response(request: Request, file_path: Path, as_attachment: bool = False):
    """Строит FileResponse или StreamingResponse с поддержкой Range (206)."""
    path = file_path
    size = path.stat().st_size
    content_type = storage_service.get_content_type(path)
    range_header = request.headers.get("range") if request else None

    try:
        range_tuple = storage_service.parse_range_header(range_header, size)
    except ValueError:
        raise HTTPException(status_code=416, detail="Requested Range Not Satisfiable")

    if range_tuple is None:
        headers = {}
        if as_attachment:
            headers["Content-Disposition"] = f'attachment; filename="{path.name}"'
        return FileResponse(
            path=path,
            media_type=content_type,
            headers=headers,
        )

    start, end = range_tuple
    length = end - start + 1
    headers = {
        "Content-Range": f"bytes {start}-{end}/{size}",
        "Accept-Ranges": "bytes",
        "Content-Length": str(length),
        "Content-Type": content_type,
    }
    if as_attachment:
        headers["Content-Disposition"] = f'attachment; filename="{path.name}"'
    return StreamingResponse(
        storage_service.iter_file_range(path, start, end),
        status_code=status.HTTP_206_PARTIAL_CONTENT,
        media_type=content_type,
        headers=headers,
    )


@router.get("/stream")
async def stream_file(
    request: Request,
    path: str = Query(..., description="Относительный путь, например wedding_day_video/main.mp4"),
    token_payload: dict = Depends(verify_media_token),
):
    """Получить файл для просмотра (inline), с поддержкой Range для видео."""
    try:
        file_path = storage_service.resolve_path(path)
    except StorageError as e:
        _handle_storage_error(e)
    return _build_file_response(request, file_path, as_attachment=False)


@router.get("/download")
async def download_file(
    request: Request,
    path: str = Query(...),
    token_payload: dict = Depends(verify_media_token),
):
    """Скачать файл (attachment). Разрешено только для wedding_day_all_photos и wedding_day_video."""
    if not storage_service.is_download_allowed(path):
        raise HTTPException(
            status_code=403,
            detail="Скачивание разрешено только для папок wedding_day_all_photos и wedding_day_video",
        )
    try:
        file_path = storage_service.resolve_path(path)
    except StorageError as e:
        _handle_storage_error(e)
    return _build_file_response(request, file_path, as_attachment=True)


@router.get("/archive")
async def download_archive(
    request: Request,
    type: ArchiveType = Query(..., alias="type"),
    token_payload: dict = Depends(verify_media_token),
):
    """Скачать готовый zip: wedding_photos.zip, wedding_video.zip или wedding_best_moments.zip."""
    try:
        zip_path = storage_service.get_archive_path(type)
    except StorageError as e:
        _handle_storage_error(e)
    return _build_file_response(request, zip_path, as_attachment=True)
