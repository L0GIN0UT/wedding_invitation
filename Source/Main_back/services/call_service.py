"""
Сервис для отправки звонков с кодом через Zvonok.com
"""
import httpx
import logging
from typing import Optional
from conf.settings import settings

logger = logging.getLogger(__name__)


class CallService:
    """Сервис для отправки звонков с кодом верификации через Zvonok.com"""
    
    # Zvonok.com использует их базу номеров, нам не нужен свой номер
    ZVONOK_API_BASE = "https://zvonok.com/manager/cabapi_external/api/v1"
    
    async def send_verification_call(
        self,
        phone: str
    ) -> tuple[bool, str, str | None]:
        """
        Отправляет звонок с кодом верификации через Zvonok.com (Flash Call)
        
        Zvonok.com использует свою базу номеров для звонков и сам генерирует код.
        Flash Call: последние 4 цифры номера звонящего = код верификации
        
        API endpoint: /phones/flashcall/
        Формат: GET запрос с параметрами в URL
        
        Args:
            phone: Номер телефона получателя (формат: +79991234567)
            
        Returns:
            tuple[bool, str, str | None]: (success, message, pincode)
            pincode - код, сгенерированный Zvonok.com (None если ошибка)
        """
        try:
            # Zvonok.com ожидает номер в формате с + (например: +79277899017)
            # Оставляем номер как есть, только нормализуем пробелы и дефисы
            phone_normalized = phone.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
            
            # Если номер начинается с 8, заменяем на +7
            if phone_normalized.startswith('8') and len(phone_normalized) == 11:
                phone_normalized = '+7' + phone_normalized[1:]
            
            # Убеждаемся что номер начинается с +
            if not phone_normalized.startswith('+'):
                phone_normalized = '+' + phone_normalized
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Zvonok.com API для Flash Call
                # GET запрос с параметрами в URL
                # НЕ передаем pincode - Zvonok.com сам сгенерирует код
                response = await client.get(
                    f"{self.ZVONOK_API_BASE}/phones/flashcall/",
                    params={
                        "public_key": settings.ZVONOK_API_KEY,
                        "campaign_id": settings.ZVONOK_CAMPAIGN_ID,
                        "phone": phone_normalized
                        # pincode не передаем - Zvonok.com сам сгенерирует
                    }
                )
                
                if response.status_code == 200:
                    try:
                        data = response.json()
                        # Zvonok.com возвращает: {"status": "ok", "data": {"call_id": ..., "pincode": "4723", ...}}
                        if data.get("status") == "ok":
                            call_id = data.get("data", {}).get("call_id")
                            pincode = data.get("data", {}).get("pincode")
                            
                            if pincode:
                                logger.info(f"✅ Звонок с кодом отправлен на {phone}, call_id: {call_id}, pincode: {pincode}")
                                return True, "Звонок отправлен", pincode
                            else:
                                logger.warning(f"⚠️ Zvonok.com не вернул pincode для {phone}, call_id: {call_id}")
                                return False, "Zvonok.com не вернул код", None
                        else:
                            error_msg = data.get("message") or data.get("error") or "Неизвестная ошибка"
                            logger.error(f"❌ Ошибка отправки звонка на {phone}: {error_msg}")
                            return False, f"Ошибка отправки звонка: {error_msg}", None
                    except Exception as e:
                        logger.error(f"❌ Ошибка парсинга ответа Zvonok.com для {phone}: {e}, ответ: {response.text}")
                        return False, f"Ошибка обработки ответа: {str(e)}", None
                else:
                    error_text = response.text
                    logger.error(f"❌ Ошибка API Zvonok.com для {phone}: {response.status_code} - {error_text}")
                    return False, f"Ошибка API: {response.status_code} - {error_text}", None
                    
        except httpx.TimeoutException:
            logger.error(f"❌ Таймаут при отправке звонка на {phone}")
            return False, "Таймаут при отправке звонка", None
        except Exception as e:
            logger.error(f"❌ Ошибка отправки звонка на {phone}: {e}")
            return False, f"Ошибка отправки звонка: {str(e)}", None


# Экземпляр сервиса
call_service = CallService()

