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

# Ждём, пока стандартный entrypoint выполнит 01-init.sql (создание таблиц)
# иначе import_guests может упасть с "relation guests does not exist"
echo "⏳ Ожидание готовности схемы БД..."
for i in $(seq 1 60); do
  if python3 -c "
import sys
import psycopg2
from os import environ
try:
    c = psycopg2.connect(
        host='/var/run/postgresql',
        user=environ.get('POSTGRES_USER'),
        password=environ.get('POSTGRES_PASSWORD'),
        dbname=environ.get('POSTGRES_DB'),
        connect_timeout=2
    )
    cur = c.cursor()
    cur.execute(\"SELECT 1 FROM information_schema.tables WHERE table_name = 'guests' LIMIT 1\")
    if cur.fetchone():
        sys.exit(0)
    sys.exit(1)
except Exception:
    sys.exit(1)
" 2>/dev/null; then
    echo "✅ Схема БД готова"
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "⚠️ Таймаут ожидания схемы БД, продолжаем импорт..."
  fi
  sleep 1
done

# Запускаем скрипт импорта гостей
echo "🔄 Запуск импорта гостей..."
cd /app && python3 scripts/import_guests.py

# Запускаем скрипт импорта вишлиста
echo "🔄 Запуск импорта вишлиста..."
cd /app && python3 scripts/import_wishlist.py

# Ждем завершения процесса PostgreSQL
wait $POSTGRES_PID

