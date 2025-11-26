import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { logout } = useAuth();
  const location = useLocation();

  return (
    <div className="layout">
      <nav className="top-nav">
        <div className="nav-container">
          <Link to="/event" className="nav-logo">
            <span className="logo-hearts">💕</span>
            <span className="logo-text">Иван & Алина</span>
          </Link>
          <div className="nav-links">
            <Link 
              to="/event" 
              className={`nav-link ${location.pathname === '/event' ? 'active' : ''}`}
            >
              Событие
            </Link>
            <Link 
              to="/preferences" 
              className={`nav-link ${location.pathname === '/preferences' ? 'active' : ''}`}
            >
              Пожелания
            </Link>
            <Link 
              to="/wishlist" 
              className={`nav-link ${location.pathname === '/wishlist' ? 'active' : ''}`}
            >
              Вишлист
            </Link>
            <button onClick={logout} className="logout-btn">
              Выйти
            </button>
          </div>
        </div>
      </nav>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;

