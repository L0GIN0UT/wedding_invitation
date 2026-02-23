import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { apiRequest } from '../../utils/api';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  refreshAccessToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const validateAuth = async () => {
      const accessToken = localStorage.getItem('access_token');
      
      if (!accessToken) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      try {
        // Проверяем валидность токена на бэкенде
        const response = await apiRequest('/auth/validate', {
          method: 'POST',
          body: JSON.stringify({ access_token: accessToken }),
          skipAuth: true,
        });

        const data = await response.json();
        if (data.valid === true) {
          setIsAuthenticated(true);
        } else {
          // Токен невалиден, пытаемся обновить
          const refreshed = await refreshAccessTokenFromStorage();
          if (!refreshed) {
            setIsAuthenticated(false);
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
          }
        }
      } catch (error) {
        console.error('Token validation failed:', error);
        setIsAuthenticated(false);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      } finally {
        setIsLoading(false);
      }
    };

    validateAuth();
  }, []);

  const refreshAccessTokenFromStorage = async (): Promise<boolean> => {
    const savedRefreshToken = localStorage.getItem('refresh_token');
    
    if (!savedRefreshToken) {
      return false;
    }

    try {
      const response = await apiRequest('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: savedRefreshToken }),
        skipAuth: true,
      });

      const data = await response.json();

      if (response.ok && data.access_token && data.refresh_token) {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        setIsAuthenticated(true);
        return true;
      } else {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setIsAuthenticated(false);
        return false;
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      return false;
    }
  };

  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    const currentRefreshToken = localStorage.getItem('refresh_token');
    
    if (!currentRefreshToken) {
      return false;
    }

    try {
      const response = await apiRequest('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: currentRefreshToken }),
        skipAuth: true,
      });

      const data = await response.json();

      if (response.ok && data.access_token && data.refresh_token) {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        setIsAuthenticated(true);
        return true;
      } else {
        setIsAuthenticated(false);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        return false;
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      setIsAuthenticated(false);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      return false;
    }
  }, []);

  const login = (accessToken: string, refreshToken: string) => {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    const currentRefreshToken = localStorage.getItem('refresh_token');
    
    if (currentRefreshToken) {
      try {
        await apiRequest('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refresh_token: currentRefreshToken }),
          skipAuth: true,
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    
    setIsAuthenticated(false);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('verification_phone');
    localStorage.removeItem('verification_code_sent');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout, refreshAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
};
