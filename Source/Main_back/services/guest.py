"""
Сервис для работы с гостями
"""
import asyncpg
from typing import Optional
from conf.settings import settings


class GuestService:
    """Сервис для работы с гостями в базе данных"""
    
    async def get_guest_by_phone(
        self,
        phone: str
    ) -> Optional[dict]:
        """
        Получает гостя по номеру телефона
        """
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
                SELECT uuid, guest_id, last_name, first_name, patronomic, phone
                FROM guests
                WHERE phone = $1
                """,
                phone
            )
            
            if row is None:
                return None
            
            return {
                "uuid": str(row["uuid"]),
                "guest_id": row["guest_id"],
                "last_name": row["last_name"],
                "first_name": row["first_name"],
                "patronomic": row["patronomic"],
                "phone": row["phone"],
            }
        finally:
            await conn.close()
    


# Экземпляр сервиса
guest_service = GuestService()

