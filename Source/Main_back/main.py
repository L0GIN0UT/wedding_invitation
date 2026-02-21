"""
Главный файл FastAPI приложения
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import auth, oauth, preferences, wishlist, rsvp, gallery

app = FastAPI(
    title="Wedding Invitation API",
    description="API для системы приглашений на свадьбу",
    version="1.0.0"
)

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшене указать конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключение роутеров
app.include_router(auth.router)  # Авторизация по телефону
app.include_router(oauth.router)  # OAuth2 авторизация
app.include_router(preferences.router)  # Пожелания гостей
app.include_router(wishlist.router)  # Вишлист
app.include_router(rsvp.router)  # RSVP (подтверждение присутствия)
app.include_router(gallery.router)  # Галерея (URL с медиа-токеном для файлового хранилища)


@app.get("/", tags=["Общее"])
async def root():
    """Корневой эндпоинт"""
    return {
        "message": "Wedding Invitation API",
        "version": "1.0.0"
    }


@app.get("/health", tags=["Общее"])
async def health_check():
    """Проверка здоровья приложения"""
    return {"status": "ok"}


@app.get("/config", tags=["Общее"])
async def get_public_config():
    """
    Получить публичную конфигурацию для фронтенда
    Возвращает только публичные настройки (CLIENT_ID), без секретов
    """
    from conf.settings import settings
    from schemas.config import PublicConfigResponse
    
    return PublicConfigResponse(
        vk_client_id=settings.VK_CLIENT_ID,
        yandex_client_id=settings.YANDEX_CLIENT_ID
    )

