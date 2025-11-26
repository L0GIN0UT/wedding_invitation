import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

const API_URL = window.location.origin + '/api';

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  login: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  refreshAccessToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Проверяем и восстанавливаем токены при загрузке
    const initializeAuth = async () => {
      const savedAccessToken = localStorage.getItem('access_token');
      const savedRefreshToken = localStorage.getItem('refresh_token');
      
      if (savedAccessToken && savedRefreshToken) {
        // Сначала быстрая проверка exp на фронтенде
        const isTokenExpired = !checkTokenValidity(savedAccessToken);
        
        if (isTokenExpired) {
          // Access токен истек, пытаемся обновить через refresh токен
          const refreshed = await refreshAccessTokenFromStorage();
          if (!refreshed) {
            // Refresh токен тоже невалиден, очищаем
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            setIsLoading(false);
            return;
          }
        } else {
          // Токен не истек по exp, но проверяем подпись на бэкенде
          // Это более надежно, но добавляет один запрос при загрузке
          const isValid = await validateTokenOnBackend(savedAccessToken);
          
          if (isValid) {
            // Токен валиден, используем его
            setToken(savedAccessToken);
            setRefreshToken(savedRefreshToken);
          } else {
            // Токен невалиден (подпись неверна или отозван), пытаемся обновить
            const refreshed = await refreshAccessTokenFromStorage();
            if (!refreshed) {
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
            }
          }
        }
      }
      setIsLoading(false);
    };
    
    initializeAuth();
  }, []);

  // Проверяет валидность JWT токена (не истек ли) - быстрая проверка exp
  const checkTokenValidity = (token: string): boolean => {
    try {
      // Декодируем JWT без проверки подписи (только для проверки exp)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp;
      
      if (!exp) {
        return false;
      }
      
      // Проверяем, не истек ли токен (с запасом в 60 секунд)
      const currentTime = Math.floor(Date.now() / 1000);
      return exp > (currentTime + 60); // 60 секунд запас
    } catch (error) {
      return false;
    }
  };

  // Проверяет валидность токена на бэкенде (с проверкой подписи)
  const validateTokenOnBackend = async (token: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/auth/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: token }),
      });

      const data = await response.json();
      return data.valid === true;
    } catch (error) {
      console.error('Ошибка проверки токена на бэкенде:', error);
      return false;
    }
  };

  // Обновляет токены из localStorage
  const refreshAccessTokenFromStorage = async (): Promise<boolean> => {
    const savedRefreshToken = localStorage.getItem('refresh_token');
    
    if (!savedRefreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: savedRefreshToken }),
      });

      const data = await response.json();

      if (response.ok && data.access_token && data.refresh_token) {
        setToken(data.access_token);
        setRefreshToken(data.refresh_token);
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        return true;
      } else {
        // Refresh токен невалиден
        setToken(null);
        setRefreshToken(null);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        return false;
      }
    } catch (error) {
      console.error('Ошибка обновления токена при загрузке:', error);
      return false;
    }
  };

  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    const currentRefreshToken = refreshToken || localStorage.getItem('refresh_token');
    
    if (!currentRefreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: currentRefreshToken }),
      });

      const data = await response.json();

      if (response.ok && data.access_token && data.refresh_token) {
        setToken(data.access_token);
        setRefreshToken(data.refresh_token);
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        return true;
      } else {
        // Refresh токен невалиден, выходим
        setToken(null);
        setRefreshToken(null);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        return false;
      }
    } catch (error) {
      console.error('Ошибка обновления токена:', error);
      return false;
    }
  }, [refreshToken]);

  const login = (accessToken: string, newRefreshToken: string) => {
    setToken(accessToken);
    setRefreshToken(newRefreshToken);
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', newRefreshToken);
  };

  const logout = async () => {
    const currentRefreshToken = refreshToken || localStorage.getItem('refresh_token');
    
    // Отправляем запрос на сервер для удаления refresh токена
    if (currentRefreshToken) {
      try {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: currentRefreshToken }),
        });
      } catch (error) {
        console.error('Ошибка при выходе:', error);
      }
    }
    
    setToken(null);
    setRefreshToken(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  };

  // Показываем загрузку только при первой инициализации
  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Загрузка...</div>;
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        isAuthenticated: !!token,
        login,
        logout,
        refreshAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

