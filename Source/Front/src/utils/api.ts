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
  if (response.status === 401 && !skipAuth) {
    // Пытаемся получить refreshAccessToken из AuthContext
    try {
      const { useAuth } = await import('../app/context/AuthContext');
      // Для автоматического обновления токенов используем прямой вызов refresh
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          if (refreshData.access_token && refreshData.refresh_token) {
            localStorage.setItem('access_token', refreshData.access_token);
            localStorage.setItem('refresh_token', refreshData.refresh_token);
            requestHeaders['Authorization'] = `Bearer ${refreshData.access_token}`;
            // Повторяем запрос с новым токеном
            response = await fetch(`${API_URL}${endpoint}`, {
              ...restOptions,
              headers: requestHeaders as HeadersInit,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
    }
    
    // Также вызываем callback если он предоставлен
    if (refreshTokenCallback) {
      const refreshed = await refreshTokenCallback();
      if (refreshed) {
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
  }

  return response;
}

