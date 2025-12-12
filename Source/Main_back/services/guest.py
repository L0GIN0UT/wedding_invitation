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
        try:
            conn = await asyncpg.connect(
                host=settings.DB_HOST,
                port=settings.DB_PORT,
                user=settings.DB_USER,
                password=settings.DB_PASSWORD,
                database=settings.DB_NAME
            )
        except asyncpg.exceptions.InvalidPasswordError:
            import logging
            logger = logging.getLogger(__name__)
            logger.error("Ошибка подключения к БД: неверный пароль для пользователя %s", settings.DB_USER)
            raise Exception("Ошибка подключения к базе данных. Проверьте настройки подключения.")
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error("Ошибка подключения к БД: %s", str(e))
            raise Exception(f"Ошибка подключения к базе данных: {str(e)}")
        
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
    
    async def update_rsvp(
        self,
        user_uuid: str,
        rsvp: bool
    ) -> dict:
        """
        Обновляет статус RSVP для гостя
        """
        conn = await asyncpg.connect(
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            database=settings.DB_NAME
        )
        
        try:
            await conn.execute(
                """
                UPDATE guests
                SET rsvp = $1, updated_at = CURRENT_TIMESTAMP
                WHERE uuid = $2
                """,
                rsvp,
                user_uuid
            )
            
            return {"rsvp": rsvp}
        finally:
            await conn.close()
    
    async def get_rsvp(
        self,
        user_uuid: str
    ) -> Optional[bool]:
        """
        Получает статус RSVP для гостя
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
                SELECT rsvp
                FROM guests
                WHERE uuid = $1
                """,
                user_uuid
            )
            
            if row is None:
                return None
            
            return row["rsvp"]
        finally:
            await conn.close()


# Экземпляр сервиса
guest_service = GuestService()

