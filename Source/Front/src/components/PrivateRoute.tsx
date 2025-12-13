import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface PrivateRouteProps {
  children: React.ReactElement;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();

  // Проверяем и контекст, и localStorage для надежности
  // Это предотвращает попадание на защищенные страницы после logout
  const hasTokens = localStorage.getItem('access_token') && localStorage.getItem('refresh_token');

  if (!isAuthenticated || !hasTokens) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default PrivateRoute;

