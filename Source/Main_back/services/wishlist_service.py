"""
Сервис для работы с вишлистом
"""
import asyncpg
from typing import List, Optional
from conf.settings import settings


class WishlistService:
    """Сервис для работы с вишлистом"""
    
    async def get_all_wishlist_items(
        self
    ) -> List[dict]:
        """Получает все предметы из вишлиста"""
        conn = await asyncpg.connect(
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            database=settings.DB_NAME
        )
        
        try:
            rows = await conn.fetch(
                """
                SELECT uuid, wish_id, item, link, owner_type, user_uuid, created_at
                FROM wishlist
                ORDER BY owner_type, wish_id
                """
            )
            
            items = []
            for row in rows:
                items.append({
                    "uuid": str(row["uuid"]),
                    "wish_id": row["wish_id"],
                    "item": row["item"],
                    "link": row["link"] if row["link"] else None,
                    "owner_type": row["owner_type"],
                    "user_uuid": str(row["user_uuid"]) if row["user_uuid"] else None,
                    "created_at": row["created_at"].isoformat() if row["created_at"] else None
                })
            
            return items
        finally:
            await conn.close()
    
    async def get_wishlist_item_by_uuid(
        self,
        item_uuid: str
    ) -> Optional[dict]:
        """Получает предмет вишлиста по UUID"""
        conn = await asyncpg.connect(
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            database=settings.DB_NAME
        )
        
        try:
            row = await conn.fetchrow(
                """
                SELECT uuid, wish_id, item, link, owner_type, user_uuid, created_at
                FROM wishlist
                WHERE uuid = $1
                """,
                item_uuid
            )
            
            if not row:
                return None
            
            return {
                "uuid": str(row["uuid"]),
                "wish_id": row["wish_id"],
                "item": row["item"],
                "link": row["link"] if row["link"] else None,
                "owner_type": row["owner_type"],
                "user_uuid": str(row["user_uuid"]) if row["user_uuid"] else None,
                "created_at": row["created_at"].isoformat() if row["created_at"] else None
            }
        finally:
            await conn.close()
    
    async def reserve_item(
        self,
        item_uuid: str,
        guest_uuid: str
    ) -> dict:
        """Бронирует предмет из вишлиста за гостем"""
        conn = await asyncpg.connect(
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            database=settings.DB_NAME
        )
        
        try:
            # Проверяем что предмет существует и не забронирован
            item = await self.get_wishlist_item_by_uuid(item_uuid)
            
            if not item:
                raise ValueError("Предмет не найден")
            
            if item["user_uuid"]:
                raise ValueError("Предмет уже забронирован другим гостем")
            
            # Бронируем предмет
            await conn.execute(
                "UPDATE wishlist SET user_uuid = $1 WHERE uuid = $2",
                guest_uuid,
                item_uuid
            )
            
            # Получаем обновленный предмет
            return await self.get_wishlist_item_by_uuid(item_uuid)
        finally:
            await conn.close()
    
    async def unreserve_item(
        self,
        item_uuid: str,
        guest_uuid: str
    ) -> None:
        """Отменяет бронирование предмета (только если забронирован текущим гостем)"""
        conn = await asyncpg.connect(
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            database=settings.DB_NAME
        )
        
        try:
            # Проверяем что предмет забронирован именно этим гостем
            item = await self.get_wishlist_item_by_uuid(item_uuid)
            
            if not item:
                raise ValueError("Предмет не найден")
            
            if not item["user_uuid"]:
                raise ValueError("Предмет не забронирован")
            
            if item["user_uuid"] != guest_uuid:
                raise ValueError("Вы не можете отменить бронирование чужого предмета")
            
            # Отменяем бронирование
            await conn.execute(
                "UPDATE wishlist SET user_uuid = NULL WHERE uuid = $1",
                item_uuid
            )
        finally:
            await conn.close()


# Экземпляр сервиса
wishlist_service = WishlistService()

