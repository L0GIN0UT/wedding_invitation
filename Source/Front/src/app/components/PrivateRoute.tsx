import React from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../context/AuthContext';

interface PrivateRouteProps {
  children: React.ReactNode;
  /** Требуется доступ к вишлисту (friend === true); иначе редирект на /event */
  requireFriend?: boolean;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, requireFriend = false }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-cream)' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" 
               style={{ borderColor: 'var(--color-lilac)', borderTopColor: 'transparent' }}></div>
          <p style={{ color: 'var(--color-text-light)' }}>Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireFriend && user?.friend !== true) {
    return <Navigate to="/event" replace />;
  }

  return <>{children}</>;
};
