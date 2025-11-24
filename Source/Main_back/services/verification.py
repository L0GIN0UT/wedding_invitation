"""
Сервис для работы с кодами верификации
"""
import secrets
import redis.asyncio as redis
import logging
from typing import Literal
from conf.settings import settings

logger = logging.getLogger(__name__)

# DeliveryMethod больше не используется - только звонки


class VerificationService:
    """Сервис для генерации и проверки кодов верификации"""
    
    @staticmethod
    def generate_code() -> str:
        """
        Генерирует случайный код верификации
        """
        # Генерируем код из цифр
        code = ''.join([str(secrets.randbelow(10)) for _ in range(settings.VERIFICATION_CODE_LENGTH)])
        return code
    
    @staticmethod
    def get_verification_key(identifier: str) -> str:
        """
        Формирует ключ для хранения кода в Redis
        identifier - номер телефона
        """
        return f"verification_code:{identifier}"
    
    @staticmethod
    def get_attempts_key(identifier: str) -> str:
        """
        Формирует ключ для хранения счетчика попыток в Redis
        """
        return f"verification_attempts:{identifier}"
    
    @staticmethod
    def get_last_request_key(identifier: str) -> str:
        """
        Формирует ключ для хранения времени последнего запроса кода в Redis
        """
        return f"verification_last_request:{identifier}"
    
    @staticmethod
    def get_lock_key(identifier: str) -> str:
        """
        Формирует ключ для блокировки запроса кода (предотвращение race condition)
        """
        return f"verification_lock:{identifier}"
    
    async def acquire_lock(
        self,
        redis_client: redis.Redis,
        identifier: str,
        timeout: int = 10
    ) -> bool:
        """
        Пытается получить блокировку для запроса кода
        Возвращает True если блокировка получена, False если уже заблокировано
        timeout - время жизни блокировки в секундах
        """
        import time
        
        lock_key = self.get_lock_key(identifier)
        lock_value = str(int(time.time() * 1000))  # Используем миллисекунды для уникальности
        
        # Используем SET с NX (SET if Not eXists) для атомарной блокировки
        # Это предотвращает одновременные запросы от одного пользователя
        acquired = await redis_client.set(
            lock_key,
            lock_value,
            ex=timeout,
            nx=True  # SET if Not eXists - атомарная операция
        )
        
        return bool(acquired)
    
    async def release_lock(
        self,
        redis_client: redis.Redis,
        identifier: str
    ) -> None:
        """
        Освобождает блокировку для запроса кода
        """
        lock_key = self.get_lock_key(identifier)
        await redis_client.delete(lock_key)
    
    async def can_request_code(
        self,
        redis_client: redis.Redis,
        identifier: str  # номер телефона
    ) -> tuple[bool, int]:
        """
        Проверяет, можно ли запросить новый код
        Возвращает (can_request: bool, seconds_remaining: int)
        """
        import time
        
        last_request_key = self.get_last_request_key(identifier)
        last_request_time = await redis_client.get(last_request_key)
        
        if last_request_time is None:
            return True, 0
        
        # Получаем время последнего запроса
        last_time = int(last_request_time.decode() if isinstance(last_request_time, bytes) else last_request_time)
        current_time = int(time.time())
        
        elapsed = current_time - last_time
        cooldown = settings.VERIFICATION_REQUEST_COOLDOWN
        
        if elapsed < cooldown:
            remaining = cooldown - elapsed
            return False, remaining
        
        return True, 0
    
    async def store_code(
        self,
        redis_client: redis.Redis,
        identifier: str,  # номер телефона
        code: str
    ) -> None:
        """
        Сохраняет код верификации в Redis с TTL
        Также сбрасывает счетчик попыток и сохраняет время запроса
        """
        import time
        
        key = self.get_verification_key(identifier)
        attempts_key = self.get_attempts_key(identifier)
        last_request_key = self.get_last_request_key(identifier)
        
        # Сохраняем код
        await redis_client.setex(
            key,
            settings.VERIFICATION_CODE_TTL,
            code
        )
        
        # Сбрасываем счетчик попыток
        await redis_client.delete(attempts_key)
        
        # Сохраняем время последнего запроса
        current_time = int(time.time())
        await redis_client.setex(
            last_request_key,
            settings.VERIFICATION_REQUEST_COOLDOWN,
            str(current_time)
        )
    
    async def verify_code(
        self,
        redis_client: redis.Redis,
        identifier: str,  # номер телефона
        code: str
    ) -> tuple[bool, str]:
        """
        Проверяет код верификации
        Возвращает (success: bool, message: str)
        """
        key = self.get_verification_key(identifier)
        attempts_key = self.get_attempts_key(identifier)
        
        # Проверяем количество попыток
        attempts = await redis_client.get(attempts_key)
        if attempts:
            attempts_count = int(attempts.decode() if isinstance(attempts, bytes) else attempts)
        else:
            attempts_count = 0
        
        if attempts_count >= settings.VERIFICATION_MAX_ATTEMPTS:
            # Превышено количество попыток - удаляем код
            await redis_client.delete(key)
            await redis_client.delete(attempts_key)
            return False, "Превышено количество попыток. Запросите новый код."
        
        # Проверяем наличие кода
        stored_code = await redis_client.get(key)
        if stored_code is None:
            return False, "Код не найден или истек. Запросите новый код."
        
        # Проверяем код (Redis возвращает bytes, нужно декодировать)
        stored_code_str = stored_code.decode() if isinstance(stored_code, bytes) else stored_code
        if stored_code_str == code:
            # Код верный - удаляем код и счетчик попыток
            await redis_client.delete(key)
            await redis_client.delete(attempts_key)
            return True, "Код подтвержден"
        else:
            # Код неверный - увеличиваем счетчик попыток
            attempts_count += 1
            await redis_client.setex(
                attempts_key,
                settings.VERIFICATION_CODE_TTL,  # TTL такой же как у кода
                str(attempts_count)
            )
            
            remaining = settings.VERIFICATION_MAX_ATTEMPTS - attempts_count
            if remaining > 0:
                return False, f"Неверный код. Осталось попыток: {remaining}"
            else:
                # Последняя попытка использована - удаляем код
                await redis_client.delete(key)
                await redis_client.delete(attempts_key)
                return False, "Превышено количество попыток. Запросите новый код."
    
    async def send_code_to_phone(
        self,
        redis_client: redis.Redis,
        phone: str
    ) -> str:
        """
        Отправляет звонок с кодом верификации через Zvonok.com через Celery задачу
        Код генерирует сам Zvonok.com, мы сохраняем его в Redis
        При каждом вызове генерируется НОВЫЙ код (старый удаляется)
        Для звонков используется 4-значный код (последние 4 цифры номера звонящего)
        """
        import asyncio
        from Notifications.tasks.call_tasks import send_verification_call
        
        # Удаляем старый код и счетчик попыток если они есть (чтобы не было конфликтов)
        old_key = self.get_verification_key(phone)
        old_attempts_key = self.get_attempts_key(phone)
        await redis_client.delete(old_key)
        await redis_client.delete(old_attempts_key)
        
        # Создаем Celery задачу для отправки звонка
        task = send_verification_call.apply_async(args=[phone])
        logger.info(f"📞 Создана задача отправки звонка на {phone}, task_id: {task.id}")
        
        # Ждем результат задачи (с таймаутом 60 секунд)
        # Используем run_in_executor чтобы не блокировать event loop
        loop = asyncio.get_event_loop()
        try:
            result = await asyncio.wait_for(
                loop.run_in_executor(None, task.get, 60),
                timeout=65.0  # Немного больше чем таймаут get()
            )
        except asyncio.TimeoutError:
            logger.error(f"❌ Таймаут ожидания результата задачи для {phone}")
            raise Exception("Таймаут при отправке звонка")
        except Exception as e:
            logger.error(f"❌ Ошибка выполнения задачи для {phone}: {e}")
            raise Exception(f"Ошибка отправки звонка: {str(e)}")
        
        # Проверяем результат
        if not result or not isinstance(result, dict):
            logger.error(f"❌ Неверный формат результата задачи для {phone}: {result}")
            raise Exception("Неверный формат результата задачи")
        
        success = result.get("success", False)
        message = result.get("message", "Неизвестная ошибка")
        pincode = result.get("pincode")
        
        if not success or not pincode:
            # Если не удалось отправить звонок или получить код
            logger.warning(f"⚠️ Не удалось отправить звонок на {phone}: {message}")
            logger.error(f"❌ Не удалось получить код от Zvonok.com. Проверьте настройки API.")
            raise Exception(f"Ошибка отправки звонка: {message}")
        
        # Сохраняем код, полученный от Zvonok.com, в Redis
        # store_code также сбросит счетчик попыток
        await self.store_code(redis_client, phone, pincode)
        
        logger.info(f"✅ Звонок с кодом {pincode} отправлен на {phone}, код сохранен в Redis")
        
        return pincode


# Экземпляр сервиса
verification_service = VerificationService()

