"""
Сервис для работы с гостями
"""
import asyncpg
from typing import Optional, List
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
                SELECT uuid, guest_id, last_name, first_name, patronomic, phone,
                       have_allergies, famili_prefer_forms
                FROM guests
                WHERE phone = $1
                """,
                phone
            )
            
            if row is None:
                return None
            fp = row.get("famili_prefer_forms") or []
            return {
                "uuid": str(row["uuid"]),
                "guest_id": row["guest_id"],
                "last_name": row["last_name"],
                "first_name": row["first_name"],
                "patronomic": row["patronomic"],
                "phone": row["phone"],
                "have_allergies": row.get("have_allergies"),
                "famili_prefer_forms": [str(u) for u in fp],
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

    async def get_guest_by_uuid(self, guest_uuid: str) -> Optional[dict]:
        """Получает гостя по UUID."""
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
                SELECT uuid, guest_id, last_name, first_name, patronomic, phone,
                       have_allergies, famili_prefer_forms
                FROM guests
                WHERE uuid = $1
                """,
                guest_uuid
            )
            if row is None:
                return None
            fp = row.get("famili_prefer_forms") or []
            return {
                "uuid": str(row["uuid"]),
                "guest_id": row["guest_id"],
                "last_name": row["last_name"],
                "first_name": row["first_name"],
                "patronomic": row["patronomic"],
                "phone": row["phone"],
                "have_allergies": row.get("have_allergies"),
                "famili_prefer_forms": [str(u) for u in fp],
            }
        finally:
            await conn.close()

    async def list_guests(self, sort_by: str = "last_name") -> List[dict]:
        """Список гостей с сортировкой. sort_by: last_name, first_name, patronomic, phone."""
        allowed = {"last_name", "first_name", "patronomic", "phone"}
        order_col = sort_by if sort_by in allowed else "last_name"
        conn = await asyncpg.connect(
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            database=settings.DB_NAME
        )
        try:
            rows = await conn.fetch(
                f"""
                SELECT uuid, last_name, first_name, patronomic, phone
                FROM guests
                ORDER BY {order_col} NULLS LAST, first_name NULLS LAST, patronomic NULLS LAST
                """
            )
            return [
                {
                    "uuid": str(r["uuid"]),
                    "phone": r["phone"],
                    "last_name": r["last_name"],
                    "first_name": r["first_name"],
                    "patronomic": r["patronomic"],
                }
                for r in rows
            ]
        finally:
            await conn.close()

    async def get_famili_prefer_forms(self, guest_uuid: str) -> List[str]:
        """Возвращает массив UUID из famili_prefer_forms для гостя."""
        conn = await asyncpg.connect(
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            database=settings.DB_NAME
        )
        try:
            row = await conn.fetchrow(
                "SELECT famili_prefer_forms FROM guests WHERE uuid = $1",
                guest_uuid
            )
            if row is None or not row["famili_prefer_forms"]:
                return []
            return [str(u) for u in row["famili_prefer_forms"]]
        finally:
            await conn.close()

    async def add_to_famili_prefer_forms(
        self, owner_uuid: str, guest_uuid_to_add: str
    ) -> None:
        """Добавляет guest_uuid_to_add в famili_prefer_forms владельца owner_uuid.
        Не добавляет дубликат. Проверяет, что добавляемый гость существует.
        """
        conn = await asyncpg.connect(
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            database=settings.DB_NAME
        )
        try:
            # Проверяем, что гость для добавления существует
            target = await conn.fetchrow(
                "SELECT uuid FROM guests WHERE uuid = $1",
                guest_uuid_to_add
            )
            if target is None:
                raise ValueError("Гость не найден")
            if owner_uuid == guest_uuid_to_add:
                raise ValueError("Нельзя добавить себя")
            await conn.execute(
                """
                UPDATE guests
                SET famili_prefer_forms = CASE
                    WHEN $2::uuid = ANY(COALESCE(famili_prefer_forms, '{}')) THEN famili_prefer_forms
                    ELSE array_append(COALESCE(famili_prefer_forms, '{}'), $2::uuid)
                END,
                updated_at = CURRENT_TIMESTAMP
                WHERE uuid = $1
                """,
                owner_uuid,
                guest_uuid_to_add
            )
        finally:
            await conn.close()

    async def remove_from_famili_prefer_forms(
        self, owner_uuid: str, guest_uuid_to_remove: str
    ) -> None:
        """Удаляет guest_uuid_to_remove из famili_prefer_forms владельца owner_uuid."""
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
                SET famili_prefer_forms = array_remove(COALESCE(famili_prefer_forms, '{}'), $2::uuid),
                    updated_at = CURRENT_TIMESTAMP
                WHERE uuid = $1
                """,
                owner_uuid,
                guest_uuid_to_remove
            )
        finally:
            await conn.close()

    async def get_have_allergies(self, guest_uuid: str) -> Optional[bool]:
        """Получает флаг «есть ли аллергии» для гостя."""
        conn = await asyncpg.connect(
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            database=settings.DB_NAME
        )
        try:
            row = await conn.fetchrow(
                "SELECT have_allergies FROM guests WHERE uuid = $1",
                guest_uuid
            )
            return row["have_allergies"] if row is not None else None
        finally:
            await conn.close()

    async def set_have_allergies(self, guest_uuid: str, have_allergies: bool) -> None:
        """Устанавливает флаг «есть ли аллергии» для гостя."""
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
                SET have_allergies = $1, updated_at = CURRENT_TIMESTAMP
                WHERE uuid = $2
                """,
                have_allergies,
                guest_uuid
            )
        finally:
            await conn.close()


# Экземпляр сервиса
guest_service = GuestService()

