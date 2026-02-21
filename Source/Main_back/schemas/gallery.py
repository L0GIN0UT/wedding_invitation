from pydantic import BaseModel


class StreamUrlResponse(BaseModel):
    url: str


class FileListResponse(BaseModel):
    folder: str
    paths: list[str]


class GalleryStatusResponse(BaseModel):
    """Доступность контента галереи (видео/фото)."""
    content_enabled: bool
