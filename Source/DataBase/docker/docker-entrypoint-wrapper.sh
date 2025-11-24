#!/bin/bash
set -e

# Запускаем стандартный entrypoint PostgreSQL в фоне
docker-entrypoint.sh postgres &
POSTGRES_PID=$!

# Ждем готовности PostgreSQL
echo "⏳ Ожидание готовности PostgreSQL..."
until pg_isready -h /var/run/postgresql -U "$POSTGRES_USER" -d "$POSTGRES_DB" 2>/dev/null; do
  sleep 1
done

echo "✅ PostgreSQL готов"

# Запускаем скрипт импорта гостей
echo "🔄 Запуск импорта гостей..."
cd /app && python3 scripts/import_guests.py

# Запускаем скрипт импорта вишлиста
echo "🔄 Запуск импорта вишлиста..."
cd /app && python3 scripts/import_wishlist.py

# Ждем завершения процесса PostgreSQL
wait $POSTGRES_PID

