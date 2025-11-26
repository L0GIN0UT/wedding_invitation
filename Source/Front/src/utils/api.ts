/**
 * Утилита для API запросов с автоматическим обновлением токенов
 */

const API_URL = window.location.origin + '/api';

interface ApiOptions extends RequestInit {
  skipAuth?: boolean;
  refreshTokenCallback?: () => Promise<boolean>;
}

/**
 * Выполняет API запрос с автоматическим обновлением токенов при 401 ошибке
 */
export async function apiRequest(
  endpoint: string,
  options: ApiOptions = {}
): Promise<Response> {
  const { skipAuth = false, headers = {}, refreshTokenCallback, ...restOptions } = options;

  // Получаем access токен
  const accessToken = localStorage.getItem('access_token');
  
  // Формируем заголовки
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  // Добавляем Authorization заголовок если нужна авторизация
  if (!skipAuth && accessToken) {
    requestHeaders['Authorization'] = `Bearer ${accessToken}`;
  }

  // Выполняем запрос
  let response = await fetch(`${API_URL}${endpoint}`, {
    ...restOptions,
    headers: requestHeaders,
  });

  // Если получили 401 и есть refresh токен, пытаемся обновить токены
  if (response.status === 401 && !skipAuth && refreshTokenCallback) {
    const refreshed = await refreshTokenCallback();
    
    if (refreshed) {
      // Повторяем запрос с новым токеном
      const newAccessToken = localStorage.getItem('access_token');
      if (newAccessToken) {
        requestHeaders['Authorization'] = `Bearer ${newAccessToken}`;
        response = await fetch(`${API_URL}${endpoint}`, {
          ...restOptions,
          headers: requestHeaders as HeadersInit,
        });
      }
    }
  }

  return response;
}

