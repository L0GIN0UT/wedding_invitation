import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { apiRequest } from '../../utils/api';

export interface AuthUser {
  phone: string | null;
  friend: boolean;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  login: (accessToken: string, refreshToken: string) => Promise<void>;
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
  const [user, setUser] = useState<AuthUser | null>(null);

  const setUserFromValidateResponse = (data: { valid?: boolean; phone?: string | null; friend?: boolean }) => {
    if (data.valid === true) {
      setUser({ phone: data.phone ?? null, friend: data.friend === true });
      setIsAuthenticated(true);
    } else {
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  useEffect(() => {
    const validateAuth = async () => {
      const accessToken = localStorage.getItem('access_token');
      
      if (!accessToken) {
        setUser(null);
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      try {
        const response = await apiRequest('/auth/validate', {
          method: 'POST',
          body: JSON.stringify({ access_token: accessToken }),
          skipAuth: true,
        });

        const data = await response.json();
        if (data.valid === true) {
          setUserFromValidateResponse(data);
        } else {
          const refreshed = await refreshAccessTokenFromStorage();
          if (!refreshed) {
            setUser(null);
            setIsAuthenticated(false);
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
          }
        }
      } catch (error) {
        console.error('Token validation failed:', error);
        setUser(null);
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
        const validateRes = await apiRequest('/auth/validate', {
          method: 'POST',
          body: JSON.stringify({ access_token: data.access_token }),
          skipAuth: true,
        });
        const validateData = await validateRes.json();
        setUserFromValidateResponse(validateData);
        return true;
      } else {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setUser(null);
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
        const validateRes = await apiRequest('/auth/validate', {
          method: 'POST',
          body: JSON.stringify({ access_token: data.access_token }),
          skipAuth: true,
        });
        const validateData = await validateRes.json();
        setUserFromValidateResponse(validateData);
        return true;
      } else {
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        return false;
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      return false;
    }
  }, []);

  const login = async (accessToken: string, refreshToken: string) => {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    try {
      const response = await apiRequest('/auth/validate', {
        method: 'POST',
        body: JSON.stringify({ access_token: accessToken }),
        skipAuth: true,
      });
      const data = await response.json();
      setUserFromValidateResponse(data);
    } catch {
      setUser(null);
      setIsAuthenticated(false);
    }
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
    
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('verification_phone');
    localStorage.removeItem('verification_code_sent');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, login, logout, refreshAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
};
