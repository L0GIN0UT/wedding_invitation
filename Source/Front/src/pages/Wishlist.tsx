import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { apiRequest } from '../utils/api';
import './Wishlist.css';

interface WishlistItem {
  uuid: string;
  wish_id: string;
  item: string;
  owner_type: 'bride' | 'groom';
  user_uuid: string | null;
  created_at: string;
}

interface WishlistData {
  items: WishlistItem[];
  bride_items: WishlistItem[];
  groom_items: WishlistItem[];
}

const Wishlist: React.FC = () => {
  const { refreshAccessToken } = useAuth();
  const [wishlist, setWishlist] = useState<WishlistData | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadWishlist();
  }, [refreshAccessToken]);

  const loadWishlist = async () => {
    try {
      const response = await apiRequest('/wishlist/', {
        refreshTokenCallback: refreshAccessToken,
      });

      const data = await response.json();
      if (response.ok) {
        setWishlist(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки вишлиста:', error);
    }
  };

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleReserve = async (uuid: string) => {
    setLoading(true);
    try {
      const response = await apiRequest('/wishlist/reserve', {
        method: 'POST',
        body: JSON.stringify({ wishlist_uuid: uuid }),
        refreshTokenCallback: refreshAccessToken,
      });

      const data = await response.json();
      if (response.ok) {
        showMessage('Предмет успешно забронирован', 'success');
        loadWishlist();
      } else {
        showMessage(data.detail || 'Ошибка бронирования', 'error');
      }
    } catch (error) {
      showMessage('Ошибка соединения с сервером', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUnreserve = async (uuid: string) => {
    setLoading(true);
    try {
      const response = await apiRequest('/wishlist/unreserve', {
        method: 'POST',
        body: JSON.stringify({ wishlist_uuid: uuid }),
        refreshTokenCallback: refreshAccessToken,
      });

      const data = await response.json();
      if (response.ok) {
        showMessage('Бронирование отменено', 'success');
        loadWishlist();
      } else {
        showMessage(data.detail || 'Ошибка отмены бронирования', 'error');
      }
    } catch (error) {
      showMessage('Ошибка соединения с сервером', 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderItem = (item: WishlistItem, index: number) => {
    const isReserved = item.user_uuid !== null;
    const isReservedByMe = isReserved; // В реальном приложении нужно проверить текущего пользователя

    return (
      <motion.div 
        key={item.uuid} 
        className={`wishlist-item ${isReserved ? 'reserved' : ''}`}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        whileHover={{ scale: 1.02, y: -5 }}
      >
        <div className="item-content">
          <h3>{item.item}</h3>
          {isReserved && (
            <motion.p 
              className="reserved-badge"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              {isReservedByMe ? 'Забронировано вами' : 'Забронировано'}
            </motion.p>
          )}
        </div>
        <div className="item-actions">
          {isReserved ? (
            isReservedByMe ? (
              <motion.button
                className="btn btn-secondary"
                onClick={() => handleUnreserve(item.uuid)}
                disabled={loading}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <span>Отменить бронирование</span>
              </motion.button>
            ) : (
              <button className="btn btn-disabled" disabled>
                <span>Забронировано</span>
              </button>
            )
          ) : (
            <motion.button
              className="btn btn-primary"
              onClick={() => handleReserve(item.uuid)}
              disabled={loading}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <span>Забронировать</span>
            </motion.button>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <Layout>
      <div className="wishlist-page">
        <div className="wishlist-content">
        <h1>Вишлист</h1>

        {message && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        {wishlist && (
          <>
            <motion.section 
              className="wishlist-section"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <h2>Пожелания невесты</h2>
              <div className="elegant-divider"></div>
              {wishlist.bride_items.length > 0 ? (
                <div className="wishlist-grid">
                  {wishlist.bride_items.map((item, index) => renderItem(item, index))}
                </div>
              ) : (
                <p className="empty-message">Пока нет пожеланий</p>
              )}
            </motion.section>

            <motion.section 
              className="wishlist-section"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h2>Пожелания жениха</h2>
              <div className="elegant-divider"></div>
              {wishlist.groom_items.length > 0 ? (
                <div className="wishlist-grid">
                  {wishlist.groom_items.map((item, index) => renderItem(item, index))}
                </div>
              ) : (
                <p className="empty-message">Пока нет пожеланий</p>
              )}
            </motion.section>
          </>
        )}
        </div>
      </div>
    </Layout>
  );
};

export default Wishlist;

