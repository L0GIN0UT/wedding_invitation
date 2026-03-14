#!/usr/bin/env python3
"""
Скрипт для импорта вишлиста из wishlist.json в базу данных PostgreSQL
"""
import json
import sys
import psycopg2
from pathlib import Path

from conf.settings import settings

# Путь к файлу wishlist.json в /app
WISHLIST_JSON_PATH = Path("/app/data/wishlist.json")


def get_db_connection():
    """Подключение к БД по TCP (работает из контейнера postgres и из API/микросервисов)."""
    return psycopg2.connect(
        host=settings.DB_HOST,
        port=settings.DB_PORT,
        user=settings.DB_USER,
        password=settings.DB_PASSWORD,
        database=settings.DB_NAME
    )


def load_wishlist_from_json():
    """Загружает вишлист из JSON файла"""
    if not WISHLIST_JSON_PATH.exists():
        print(f"❌ Файл {WISHLIST_JSON_PATH} не найден!")
        sys.exit(1)
    
    with open(WISHLIST_JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    return data


def _collect_valid_pairs(wishlist_data):
    """Собирает множество (wish_id, owner_type), присутствующих в JSON."""
    valid = []
    if "bride" in wishlist_data:
        for wish_id in wishlist_data["bride"]:
            valid.append((wish_id, "bride"))
    if "groom" in wishlist_data:
        for wish_id in wishlist_data["groom"]:
            valid.append((wish_id, "groom"))
    return valid


def import_wishlist():
    """Импортирует вишлист в базу данных (полная синхронизация: добавление, обновление, удаление)."""
    print("🔄 Начинаю импорт вишлиста...")
    
    # Загружаем данные из JSON
    wishlist_data = load_wishlist_from_json()
    valid_pairs = _collect_valid_pairs(wishlist_data)
    print(f"📄 Загружен вишлист из JSON")
    
    # Подключаемся к БД
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        print("✅ Подключение к базе данных установлено")
    except Exception as e:
        print(f"❌ Ошибка подключения к БД: {e}")
        sys.exit(1)
    
    inserted_count = 0
    updated_count = 0
    deleted_count = 0

    try:
        # Обрабатываем вишлист невесты
        if "bride" in wishlist_data:
            bride_wishes = wishlist_data["bride"]
            for wish_id, item_data in bride_wishes.items():
                # Поддерживаем старый формат (строка) и новый формат (объект)
                if isinstance(item_data, str):
                    item_title = item_data
                    item_link = None
                    item_is_donation = False
                elif isinstance(item_data, dict):
                    item_title = item_data.get("title", "")
                    item_link = item_data.get("link") or None
                    item_is_donation = item_data.get("is_donation", False)
                else:
                    item_title = str(item_data)
                    item_link = None
                    item_is_donation = False

                # Используем INSERT ... ON CONFLICT для UPSERT
                # Не обновляем user_uuid если он уже установлен (когда гость выбрал предмет)
                upsert_query = """
                    INSERT INTO wishlist (wish_id, owner_type, item, link, is_donation, user_uuid)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (wish_id, owner_type)
                    DO UPDATE SET
                        item = EXCLUDED.item,
                        link = EXCLUDED.link,
                        is_donation = EXCLUDED.is_donation,
                        user_uuid = COALESCE(wishlist.user_uuid, EXCLUDED.user_uuid)
                    RETURNING (xmax = 0) AS inserted
                """

                cursor.execute(
                    upsert_query,
                    (wish_id, "bride", item_title, item_link, item_is_donation, None)  # user_uuid = NULL изначально
                )
                
                # Проверяем была ли вставка или обновление
                result = cursor.fetchone()
                if result and result[0]:
                    inserted_count += 1
                else:
                    updated_count += 1
        
        # Обрабатываем вишлист жениха
        if "groom" in wishlist_data:
            groom_wishes = wishlist_data["groom"]
            for wish_id, item_data in groom_wishes.items():
                # Поддерживаем старый формат (строка) и новый формат (объект)
                if isinstance(item_data, str):
                    item_title = item_data
                    item_link = None
                    item_is_donation = False
                elif isinstance(item_data, dict):
                    item_title = item_data.get("title", "")
                    item_link = item_data.get("link") or None
                    item_is_donation = item_data.get("is_donation", False)
                else:
                    item_title = str(item_data)
                    item_link = None
                    item_is_donation = False

                # Используем INSERT ... ON CONFLICT для UPSERT
                # Не обновляем user_uuid если он уже установлен (когда гость выбрал предмет)
                upsert_query = """
                    INSERT INTO wishlist (wish_id, owner_type, item, link, is_donation, user_uuid)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (wish_id, owner_type)
                    DO UPDATE SET
                        item = EXCLUDED.item,
                        link = EXCLUDED.link,
                        is_donation = EXCLUDED.is_donation,
                        user_uuid = COALESCE(wishlist.user_uuid, EXCLUDED.user_uuid)
                    RETURNING (xmax = 0) AS inserted
                """

                cursor.execute(
                    upsert_query,
                    (wish_id, "groom", item_title, item_link, item_is_donation, None)  # user_uuid = NULL изначально
                )
                
                # Проверяем была ли вставка или обновление
                result = cursor.fetchone()
                if result and result[0]:
                    inserted_count += 1
                else:
                    updated_count += 1

        # Удаляем из БД пункты, которых нет в JSON (полная синхронизация)
        if valid_pairs:
            cursor.execute(
                "DELETE FROM wishlist WHERE (wish_id, owner_type) NOT IN %s",
                (tuple(valid_pairs),)
            )
            deleted_count = cursor.rowcount
        else:
            cursor.execute("DELETE FROM wishlist")
            deleted_count = cursor.rowcount

        conn.commit()
        print(f"✅ Добавлено новых предметов: {inserted_count}")
        print(f"✅ Обновлено существующих предметов: {updated_count}")
        if deleted_count > 0:
            print(f"✅ Удалено предметов (нет в JSON): {deleted_count}")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Ошибка при импорте: {e}")
        cursor.close()
        conn.close()
        sys.exit(1)
    finally:
        cursor.close()
        conn.close()
    
    print("🎉 Импорт вишлиста завершен успешно!")


if __name__ == "__main__":
    import_wishlist()

