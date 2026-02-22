from enum import Enum


class DataFolder(str, Enum):
    """Папки в data/ файлового хранилища"""
    couple_photo = "couple_photo"
    background_photo = "background_photo"
    dress_code = "dress_code"
    wedding_day_all_photos = "wedding_day_all_photos"
    wedding_day_video = "wedding_day_video"
    zip = "zip"


class ArchiveType(str, Enum):
    """Тип архива для скачивания"""
    wedding_day_all_photos = "wedding_day_all_photos"
    wedding_day_video = "wedding_day_video"
    wedding_best_moments = "wedding_best_moments"


class GalleryVideo(str, Enum):
    """Фиксированные имена видео в папке wedding_day_video/"""
    wedding_video = "wedding_video.mp4"
    wedding_best_moments = "wedding_best_moments.mp4"
