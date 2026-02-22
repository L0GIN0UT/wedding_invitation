from pydantic import BaseModel


class FileListResponse(BaseModel):
    """Список относительных путей файлов в папке"""
    folder: str
    paths: list[str]
