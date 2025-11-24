#!/usr/bin/env python3
"""
Скрипт для импорта гостей из guests.json в базу данных PostgreSQL
"""
import json
import sys
import psycopg2
from pathlib import Path

from conf.settings import settings

# Путь к файлу guests.json в /app
GUESTS_JSON_PATH = Path("/app/data/guests.json")


def get_db_connection():
    """Получает подключение к базе данных через Unix socket"""
    # Внутри контейнера PostgreSQL используем Unix socket для подключения
    # Это работает даже когда TCP/IP еще не готов
    return psycopg2.connect(
        host="/var/run/postgresql",  # Unix socket
        user=settings.DB_USER,
        password=settings.DB_PASSWORD,
        database=settings.DB_NAME
    )


def get_sex_uuids(cursor):
    """Получает UUID для male и female из таблицы Sex"""
    cursor.execute("SELECT uuid, sex FROM sex")
    sex_map = {row[1]: row[0] for row in cursor.fetchall()}
    return sex_map


def load_guests_from_json():
    """Загружает гостей из JSON файла"""
    if not GUESTS_JSON_PATH.exists():
        print(f"❌ Файл {GUESTS_JSON_PATH} не найден!")
        sys.exit(1)
    
    with open(GUESTS_JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    return data


def import_guests():
    """Импортирует гостей в базу данных"""
    print("🔄 Начинаю импорт гостей...")
    
    # Загружаем данные из JSON
    guests_data = load_guests_from_json()
    print(f"📄 Загружено {len(guests_data)} гостей из JSON")
    
    # Подключаемся к БД
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        print("✅ Подключение к базе данных установлено")
    except Exception as e:
        print(f"❌ Ошибка подключения к БД: {e}")
        sys.exit(1)
    
    # Получаем UUID для полов
    sex_map = get_sex_uuids(cursor)
    print(f"👥 Получены UUID полов: {sex_map}")
    
    # Подготавливаем данные и выполняем UPSERT
    inserted_count = 0
    updated_count = 0
    skipped = 0
    
    try:
        for guest_id, guest_info in guests_data.items():
            # Пропускаем если нет имени (обязательное поле)
            if not guest_info.get("first_name"):
                skipped += 1
                print(f"⚠️  Пропущен {guest_id}: нет имени")
                continue
            
            # Получаем UUID пола
            sex_value = guest_info.get("sex")
            sex_uuid = sex_map.get(sex_value) if sex_value else None
            
            # Используем INSERT ... ON CONFLICT для UPSERT
            # Если guest_id уже существует - обновляем данные
            # Если нет - добавляем нового гостя
            upsert_query = """
                INSERT INTO guests (guest_id, last_name, first_name, patronomic, phone, sex_uuid)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (guest_id) 
                DO UPDATE SET
                    last_name = EXCLUDED.last_name,
                    first_name = EXCLUDED.first_name,
                    patronomic = EXCLUDED.patronomic,
                    phone = EXCLUDED.phone,
                    sex_uuid = EXCLUDED.sex_uuid,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING (xmax = 0) AS inserted
            """
            
            cursor.execute(
                upsert_query,
                (
                    guest_id,
                    guest_info.get("last_name") or None,
                    guest_info.get("first_name"),
                    guest_info.get("patronomic") or None,
                    guest_info.get("phone") or None,
                    sex_uuid
                )
            )
            
            # Проверяем была ли вставка или обновление
            result = cursor.fetchone()
            if result and result[0]:
                inserted_count += 1
            else:
                updated_count += 1
        
        conn.commit()
        print(f"✅ Добавлено новых гостей: {inserted_count}")
        print(f"✅ Обновлено существующих гостей: {updated_count}")
        if skipped > 0:
            print(f"⚠️  Пропущено {skipped} записей (нет имени)")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Ошибка при импорте: {e}")
        cursor.close()
        conn.close()
        sys.exit(1)
    finally:
        cursor.close()
        conn.close()
    
    print("🎉 Импорт завершен успешно!")


if __name__ == "__main__":
    import_guests()
