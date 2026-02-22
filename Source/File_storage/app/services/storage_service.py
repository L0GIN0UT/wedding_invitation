"""
Сервис файлового хранилища: работа с путями, список файлов, чтение с Range.
"""
import mimetypes
from pathlib import Path

try:
    from conf.settings import settings
except ImportError:
    settings = None

from app.models.enums import ArchiveType, DataFolder


class StorageError(Exception):
    """Ошибка доступа к хранилищу"""
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


# Разрешённые папки для скачивания (attachment)
DOWNLOAD_ALLOWED_FOLDERS = {DataFolder.wedding_day_all_photos, DataFolder.wedding_day_video}

# Имена zip-файлов в data/zip/
ARCHIVE_FILES = {
    ArchiveType.wedding_day_all_photos: "wedding_photos.zip",
    ArchiveType.wedding_day_video: "wedding_video.zip",
    ArchiveType.wedding_best_moments: "wedding_best_moments.zip",
}


class StorageService:
    def get_data_root(self) -> Path:
        if settings is None:
            raise StorageError("Настройки не загружены", status_code=500)
        return settings.file_storage_data_root

    def list_files(self, folder: DataFolder) -> list[str]:
        """Список относительных путей файлов в папке (сортировка по имени)."""
        root = self.get_data_root()
        dir_path = root / folder.value
        if not dir_path.is_dir():
            return []
        paths = []
        for f in sorted(dir_path.iterdir()):
            if f.is_file():
                paths.append(f"{folder.value}/{f.name}")
        return paths

    def resolve_path(self, relative_path: str) -> Path:
        """Проверяет path traversal и возвращает Path внутри data. При ошибке — StorageError."""
        root = self.get_data_root().resolve()
        clean = relative_path.replace("\\", "/").strip("/")
        if not clean or ".." in clean:
            raise StorageError("Недопустимый путь", status_code=400)
        full = (root / clean).resolve()
        try:
            full.relative_to(root)
        except ValueError:
            raise StorageError("Недопустимый путь", status_code=400)
        if not full.exists():
            raise StorageError("Файл не найден", status_code=404)
        if not full.is_file():
            raise StorageError("Не файл", status_code=400)
        return full

    def folder_for_path(self, relative_path: str) -> DataFolder | None:
        parts = relative_path.replace("\\", "/").strip("/").split("/")
        if not parts:
            return None
        try:
            return DataFolder(parts[0])
        except ValueError:
            return None

    def is_download_allowed(self, relative_path: str) -> bool:
        folder = self.folder_for_path(relative_path)
        return folder in DOWNLOAD_ALLOWED_FOLDERS

    def get_archive_path(self, archive_type: ArchiveType) -> Path:
        """Путь к готовому zip-файлу. StorageError если архив не найден."""
        root = self.get_data_root()
        zip_name = ARCHIVE_FILES.get(archive_type)
        if not zip_name:
            raise StorageError("Неизвестный тип архива", status_code=400)
        zip_path = root / "zip" / zip_name
        if not zip_path.is_file():
            raise StorageError("Архив не найден", status_code=404)
        return zip_path

    @staticmethod
    def get_content_type(file_path: Path) -> str:
        content_type, _ = mimetypes.guess_type(str(file_path)) or ("application/octet-stream", None)
        return content_type

    @staticmethod
    def parse_range_header(range_header: str | None, size: int) -> tuple[int, int] | None:
        """Парсит Range. Возвращает (start, end) или None если без range. ValueError при неверном range."""
        if not range_header or not range_header.startswith("bytes="):
            return None
        range_spec = range_header.replace("bytes=", "").strip()
        if "-" in range_spec:
            start_s, end_s = range_spec.split("-", 1)
            start = int(start_s) if start_s else 0
            end = int(end_s) if end_s else size - 1
        else:
            start = 0
            end = size - 1
        end = min(end, size - 1)
        if start > end or start < 0:
            raise ValueError("Invalid range")
        return start, end

    @staticmethod
    def iter_file_range(file_path: Path, start: int, end: int, chunk_size: int = 8192):
        """Итератор байтов файла с start по end включительно."""
        length = end - start + 1
        with open(file_path, "rb") as f:
            f.seek(start)
            remaining = length
            while remaining > 0:
                read_size = min(chunk_size, remaining)
                data = f.read(read_size)
                if not data:
                    break
                remaining -= len(data)
                yield data


storage_service = StorageService()
