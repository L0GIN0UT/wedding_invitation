import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { apiRequest } from '../utils/api';
import './Event.css';

// Координаты Sky-village
const LOCATION_COORDS = {
  lat: 53.339416,
  lng: 50.198036
};

const Event: React.FC = () => {
  const { refreshAccessToken } = useAuth();
  const [rsvp, setRsvp] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Загружаем статус RSVP
    apiRequest('/rsvp/', {
      refreshTokenCallback: refreshAccessToken,
    })
      .then(res => res.json())
      .then(data => {
        if (data.rsvp !== undefined) {
          setRsvp(data.rsvp);
        }
      })
      .catch(err => console.error('Ошибка загрузки RSVP:', err));
  }, [refreshAccessToken]);

  const handleRSVP = async (value: boolean) => {
    setLoading(true);
    try {
      const response = await apiRequest('/rsvp/', {
        method: 'POST',
        body: JSON.stringify({ rsvp: value }),
        refreshTokenCallback: refreshAccessToken,
      });

      const data = await response.json();
      if (response.ok) {
        setRsvp(value);
      } else {
        alert(data.detail || 'Ошибка сохранения');
      }
    } catch (error) {
      alert('Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.4, 0, 0.2, 1]
      }
    }
  };

  return (
    <Layout>
      <div className="event-page">
        <motion.div 
          className="event-hero"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <div className="hero-content">
            <motion.div className="hero-names" variants={itemVariants}>
              <motion.h1 
                className="hero-name"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                Иван
              </motion.h1>
              <motion.span 
                className="hero-ampersand decorative-font"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.5, type: "spring" }}
              >
                &
              </motion.span>
              <motion.h1 
                className="hero-name"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                Алина
              </motion.h1>
            </motion.div>
            <motion.p 
              className="hero-subtitle"
              variants={itemVariants}
            >
              Приглашаем вас разделить с нами самый важный день
            </motion.p>
            <motion.div 
              className="hero-date"
              variants={itemVariants}
            >
              <motion.div 
                className="date-card"
                whileHover={{ scale: 1.05, y: -5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <span className="date-label">Дата</span>
                <span className="date-value">22 мая</span>
              </motion.div>
              <motion.div 
                className="date-card"
                whileHover={{ scale: 1.05, y: -5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <span className="date-label">Время</span>
                <span className="date-value">16:00</span>
              </motion.div>
            </motion.div>
          </div>
          <div className="hero-decoration">
            <div className="decoration-circle circle-1"></div>
            <div className="decoration-circle circle-2"></div>
            <div className="decoration-circle circle-3"></div>
          </div>
        </motion.div>

        <div className="event-content">

        <motion.section 
          className="rsvp-section"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <h2>Подтверждение присутствия</h2>
          <div className="elegant-divider"></div>
          <div className="rsvp-buttons">
            <motion.button
              className={`rsvp-btn ${rsvp === true ? 'active' : ''}`}
              onClick={() => handleRSVP(true)}
              disabled={loading}
              whileHover={{ scale: 1.05, y: -3 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <span>Буду присутствовать</span>
            </motion.button>
            <motion.button
              className={`rsvp-btn ${rsvp === false ? 'active' : ''}`}
              onClick={() => handleRSVP(false)}
              disabled={loading}
              whileHover={{ scale: 1.05, y: -3 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <span>Не смогу прийти</span>
            </motion.button>
          </div>
          {rsvp !== null && (
            <motion.p 
              className="rsvp-status"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              {rsvp ? '✓ Вы подтвердили присутствие' : '✗ Вы отклонили приглашение'}
            </motion.p>
          )}
        </motion.section>

        <motion.section 
          className="event-info"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h2>О событии</h2>
          <div className="elegant-divider"></div>
          <p>
            Мы рады пригласить вас на нашу свадьбу! Это будет особенный день, 
            наполненный любовью, радостью и счастьем. Мы будем очень рады разделить 
            этот момент с вами.
          </p>
        </motion.section>

        <motion.section 
          className="dress-code"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <h2>Дресс-код</h2>
          <div className="elegant-divider"></div>
          <p className="dress-code-text">Black Tie</p>
          <p className="dress-code-description">
            Пожалуйста, соблюдайте дресс-код. Для мужчин: черный смокинг или темный костюм. 
            Для женщин: вечернее платье.
          </p>
        </motion.section>

        <motion.section 
          className="location"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <h2>Место проведения</h2>
          <div className="elegant-divider"></div>
          <p className="location-name">Sky-village</p>
          <p className="location-address">Самарская область</p>
          
          <motion.div 
            className="map-container"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.7 }}
          >
            <div className="map-wrapper">
              <iframe
                src={`https://yandex.ru/map-widget/v1/?ll=${LOCATION_COORDS.lng},${LOCATION_COORDS.lat}&z=15&pt=${LOCATION_COORDS.lng},${LOCATION_COORDS.lat},round`}
                width="100%"
                height="500"
                frameBorder="0"
                allowFullScreen
                title="Карта места проведения"
                style={{ borderRadius: '20px', border: 'none' }}
              ></iframe>
            </div>
          </motion.div>
        </motion.section>
        </div>
      </div>
    </Layout>
  );
};

export default Event;

