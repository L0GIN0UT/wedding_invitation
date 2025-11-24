"""
Celery задачи для отправки звонков
"""
import sys
import logging
from pathlib import Path
from Notifications.celery_app import celery_app
import httpx

# Добавляем корневую папку в путь
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from conf.settings import settings

logger = logging.getLogger(__name__)


@celery_app.task(
    name="send_verification_call",
    bind=True,
    max_retries=3,
    default_retry_delay=60  # Повтор через 60 секунд при ошибке
)
def send_verification_call(
    self,
    phone: str
) -> dict:
    """
    Асинхронная задача для отправки звонка с кодом верификации через Zvonok.com
    
    Args:
        phone: Номер телефона получателя (формат: +79991234567)
        
    Returns:
        dict: {"success": bool, "message": str, "pincode": str | None}
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
        
        # Zvonok.com API для Flash Call
        # GET запрос с параметрами в URL
        # НЕ передаем pincode - Zvonok.com сам сгенерирует код
        with httpx.Client(timeout=30.0) as client:
            response = client.get(
                f"https://zvonok.com/manager/cabapi_external/api/v1/phones/flashcall/",
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
                            return {
                                "success": True,
                                "message": "Звонок отправлен",
                                "pincode": pincode
                            }
                        else:
                            logger.warning(f"⚠️ Zvonok.com не вернул pincode для {phone}, call_id: {call_id}")
                            return {
                                "success": False,
                                "message": "Zvonok.com не вернул код",
                                "pincode": None
                            }
                    else:
                        error_msg = data.get("message") or data.get("error") or "Неизвестная ошибка"
                        logger.error(f"❌ Ошибка отправки звонка на {phone}: {error_msg}")
                        # Делаем ретрай при ошибке API
                        if self.request.retries < self.max_retries:
                            raise self.retry(exc=Exception(error_msg), countdown=60)
                        return {
                            "success": False,
                            "message": f"Ошибка отправки звонка: {error_msg}",
                            "pincode": None
                        }
                except Exception as e:
                    logger.error(f"❌ Ошибка парсинга ответа Zvonok.com для {phone}: {e}, ответ: {response.text}")
                    if self.request.retries < self.max_retries:
                        raise self.retry(exc=e, countdown=60)
                    return {
                        "success": False,
                        "message": f"Ошибка обработки ответа: {str(e)}",
                        "pincode": None
                    }
            else:
                error_text = response.text
                logger.error(f"❌ Ошибка API Zvonok.com для {phone}: {response.status_code} - {error_text}")
                if self.request.retries < self.max_retries:
                    raise self.retry(exc=Exception(f"API error: {response.status_code}"), countdown=60)
                return {
                    "success": False,
                    "message": f"Ошибка API: {response.status_code} - {error_text}",
                    "pincode": None
                }
                
    except httpx.TimeoutException as e:
        logger.error(f"❌ Таймаут при отправке звонка на {phone}")
        if self.request.retries < self.max_retries:
            raise self.retry(exc=e, countdown=60)
        return {
            "success": False,
            "message": "Таймаут при отправке звонка",
            "pincode": None
        }
    except Exception as e:
        logger.error(f"❌ Ошибка отправки звонка на {phone}: {e}")
        if self.request.retries < self.max_retries:
            raise self.retry(exc=e, countdown=60)
        return {
            "success": False,
            "message": f"Ошибка отправки звонка: {str(e)}",
            "pincode": None
        }

