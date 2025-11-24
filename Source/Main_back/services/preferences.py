"""
Сервис для работы с пожеланиями гостей
"""
import asyncpg
from typing import Optional, List
from conf.settings import settings


class PreferencesService:
    """Сервис для работы с пожеланиями гостей"""
    
    async def get_food_preference(
        self,
        guest_uuid: str
    ) -> Optional[str]:
        """Получает предпочтение по еде для гостя"""
        conn = await asyncpg.connect(
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            database=settings.DB_NAME
        )
        
        try:
            row = await conn.fetchrow(
                "SELECT food_choice FROM food_preferences WHERE user_uuid = $1",
                guest_uuid
            )
            return row["food_choice"] if row else None
        finally:
            await conn.close()
    
    async def set_food_preference(
        self,
        guest_uuid: str,
        food_choice: str
    ) -> None:
        """Устанавливает предпочтение по еде для гостя (UPSERT)"""
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
                INSERT INTO food_preferences (user_uuid, food_choice)
                VALUES ($1, $2)
                ON CONFLICT (user_uuid)
                DO UPDATE SET food_choice = EXCLUDED.food_choice, updated_at = CURRENT_TIMESTAMP
                """,
                guest_uuid,
                food_choice
            )
        finally:
            await conn.close()
    
    async def get_alcohol_preferences(
        self,
        guest_uuid: str
    ) -> Optional[List[str]]:
        """Получает предпочтения по алкоголю для гостя"""
        conn = await asyncpg.connect(
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            database=settings.DB_NAME
        )
        
        try:
            row = await conn.fetchrow(
                "SELECT alcohol_choice FROM alcohol_preferences WHERE user_uuid = $1",
                guest_uuid
            )
            if row:
                return row["alcohol_choice"]  # JSONB уже список
            return None
        finally:
            await conn.close()
    
    async def set_alcohol_preferences(
        self,
        guest_uuid: str,
        alcohol_choices: List[str]
    ) -> None:
        """Устанавливает предпочтения по алкоголю для гостя (UPSERT)"""
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
                INSERT INTO alcohol_preferences (user_uuid, alcohol_choice)
                VALUES ($1, $2::jsonb)
                ON CONFLICT (user_uuid)
                DO UPDATE SET alcohol_choice = EXCLUDED.alcohol_choice, updated_at = CURRENT_TIMESTAMP
                """,
                guest_uuid,
                alcohol_choices
            )
        finally:
            await conn.close()
    
    async def get_allergies(
        self,
        guest_uuid: str
    ) -> List[str]:
        """Получает список аллергий для гостя"""
        conn = await asyncpg.connect(
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            database=settings.DB_NAME
        )
        
        try:
            rows = await conn.fetch(
                "SELECT allergen FROM allergies WHERE user_uuid = $1 ORDER BY created_at",
                guest_uuid
            )
            return [row["allergen"] for row in rows]
        finally:
            await conn.close()
    
    async def add_allergy(
        self,
        guest_uuid: str,
        allergen: str
    ) -> None:
        """Добавляет аллергию для гостя"""
        conn = await asyncpg.connect(
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            database=settings.DB_NAME
        )
        
        try:
            await conn.execute(
                "INSERT INTO allergies (user_uuid, allergen) VALUES ($1, $2)",
                guest_uuid,
                allergen
            )
        finally:
            await conn.close()
    
    async def delete_allergy(
        self,
        guest_uuid: str,
        allergen: str
    ) -> None:
        """Удаляет аллергию для гостя"""
        conn = await asyncpg.connect(
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            database=settings.DB_NAME
        )
        
        try:
            await conn.execute(
                "DELETE FROM allergies WHERE user_uuid = $1 AND allergen = $2",
                guest_uuid,
                allergen
            )
        finally:
            await conn.close()
    
    async def get_all_preferences(
        self,
        guest_uuid: str
    ) -> dict:
        """Получает все пожелания гостя"""
        food = await self.get_food_preference(guest_uuid)
        alcohol = await self.get_alcohol_preferences(guest_uuid)
        allergies = await self.get_allergies(guest_uuid)
        
        return {
            "food_preference": food,
            "alcohol_preferences": alcohol,
            "allergies": allergies
        }


# Экземпляр сервиса
preferences_service = PreferencesService()

