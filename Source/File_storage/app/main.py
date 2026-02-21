"""
Файловое хранилище: отдача файлов по медиа-токену, поддержка Range для видео.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import files

try:
    from conf.settings import settings
except ImportError:
    settings = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """При старте создаём структуру папок в data/."""
    if settings is not None:
        for name, path in settings.file_storage_data_paths.items():
            path.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(
    title="File Storage",
    description="Хранилище файлов галереи (фото, видео, архивы)",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(files.router)


@app.get("/health", tags=["Общее"])
async def health():
    return {"status": "ok"}
