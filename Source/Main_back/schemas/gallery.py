from pydantic import BaseModel


class StreamUrlResponse(BaseModel):
    url: str


class StreamUrlItem(BaseModel):
    path: str
    url: str


class StreamUrlsBatchResponse(BaseModel):
    """Массив путей и stream-URL для папки (один запрос вместо N)."""
    items: list[StreamUrlItem]


class FileListResponse(BaseModel):
    folder: str
    paths: list[str]


class GalleryStatusResponse(BaseModel):
    """Доступность контента галереи (видео/фото)."""
    content_enabled: bool
