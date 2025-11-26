# Wedding Invitation System

Система приглашений на свадьбу с поддержкой множественных способов авторизации.

## Структура проекта

```
Source/
├── Main_back/          # FastAPI backend
├── Notifications/      # Модуль уведомлений (зарезервировано на будущее)
├── DataBase/          # База данных и миграции
├── Front/             # Frontend (будущее)
└── conf/              # Общие настройки
```

## Способы авторизации

1. **По телефону** (`/auth/send-code`, `/auth/verify-code`)
   - Верификация через звонок (Flash Call) через Zvonok.com
   - Последние 4 цифры номера звонящего - это код верификации

2. **OAuth2** (`/auth/oauth/login`)
   - VK ID
   - Яндекс ID

## Запуск

```bash
docker-compose up -d
```

## Настройка

Создайте `.env` файл с настройками (см. пример в `.env.example`)

## Модули

- **Main_back**: FastAPI приложение, роутеры, сервисы
- **Notifications**: Модуль уведомлений (зарезервировано на будущее)
- **DataBase**: PostgreSQL, миграции, импорт данных
