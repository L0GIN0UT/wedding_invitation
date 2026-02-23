import React from 'react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Heart, LogOut, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Navigation: React.FC = () => {
  const location = useLocation();
  const { logout, user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const baseNavItems = [
    { path: '/event', label: 'Событие' },
    { path: '/gallery', label: 'Галерея' },
    { path: '/preferences', label: 'Предпочтения' },
    { path: '/wishlist', label: 'Вишлист' }
  ];
  const navItems = user?.friend === true
    ? baseNavItems
    : baseNavItems.filter((item) => item.path !== '/wishlist');

  const handleLogout = () => {
    logout();
  };

  return (
    <nav className="sticky top-0 z-50 glass-card border-b relative" style={{ borderColor: 'var(--color-border)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/event" className="flex items-center gap-2 group">
            <Heart className="w-6 h-6 text-[var(--color-lilac)] group-hover:scale-110 transition-transform" fill="var(--color-lilac)" />
            <span className="gradient-text text-xl font-serif font-semibold hidden sm:block">
              Иван & Алина
            </span>
            <span className="gradient-text text-xl font-serif font-semibold sm:hidden">
              И & А
            </span>
          </Link>

          {/* Desktop Navigation — lg и выше, чтобы на больших телефонах в альбомной (например iPhone 14 Pro Max) не обрезалось меню */}
          <div className="hidden lg:flex items-center gap-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-4 py-2 rounded-full transition-all ${
                  location.pathname === item.path
                    ? 'font-semibold shadow-md'
                    : 'text-[var(--color-text-light)] hover:text-[var(--color-text)]'
                }`}
                style={
                  location.pathname === item.path
                    ? { 
                        background: 'linear-gradient(135deg, rgba(184, 162, 200, 0.2), rgba(144, 198, 149, 0.2))',
                        boxShadow: '0 2px 8px rgba(184, 162, 200, 0.3)',
                        color: 'var(--color-text)'
                      }
                    : {}
                }
              >
                {item.label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="ml-4 px-4 py-2 rounded-full flex items-center gap-2 text-[var(--color-text-light)] hover:text-[var(--color-text)] transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Выйти</span>
            </button>
          </div>

          {/* Mobile Menu Button — показываем до lg, чтобы на больших телефонах в альбомной был гамбургер */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-[var(--color-cream)] transition-colors"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-[var(--color-text)]" />
            ) : (
              <Menu className="w-6 h-6 text-[var(--color-text)]" />
            )}
          </button>
        </div>

        {/* Mobile Navigation — absolute, чтобы не сдвигать контент страницы при открытии */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden overflow-hidden absolute left-0 right-0 top-full mt-0 shadow-lg rounded-b-xl border-b border-x"
              style={{ backgroundColor: 'var(--color-cream)', borderColor: 'var(--color-border)' }}
            >
              <div className="py-4 space-y-2 px-4 sm:px-6 lg:px-8">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-4 py-3 rounded-lg transition-all ${
                      location.pathname === item.path
                        ? 'gradient-text font-semibold bg-gradient-to-r from-[rgba(184,162,200,0.1)] to-[rgba(144,198,149,0.1)]'
                        : 'text-[var(--color-text-light)]'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-2 text-[var(--color-text-light)] hover:bg-[var(--color-cream)] transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Выйти</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};
