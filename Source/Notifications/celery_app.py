"""
Celery приложение для асинхронных задач
"""
import sys
from pathlib import Path
from celery import Celery

# Добавляем корневую папку в путь
sys.path.insert(0, str(Path(__file__).parent.parent))

from conf.settings import settings

# Создаем Celery приложение
celery_app = Celery(
    "wedding_notifications",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend_url,
    include=["Notifications.tasks.call_tasks"]  # Задачи для отправки звонков
)

# Настройки Celery из settings
celery_app.conf.update(
    task_serializer=settings.CELERY_TASK_SERIALIZER,
    accept_content=settings.CELERY_ACCEPT_CONTENT,
    result_serializer=settings.CELERY_RESULT_SERIALIZER,
    timezone=settings.CELERY_TIMEZONE,
    enable_utc=settings.CELERY_ENABLE_UTC,
    task_track_started=settings.CELERY_TASK_TRACK_STARTED,
    task_time_limit=settings.CELERY_TASK_TIME_LIMIT,
    task_soft_time_limit=settings.CELERY_TASK_SOFT_TIME_LIMIT,
)

