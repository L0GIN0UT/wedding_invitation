import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { apiRequest } from '../utils/api';
import './Preferences.css';

interface FormOptions {
  food_choices: string[];
  alcohol_choices: string[];
}

const Preferences: React.FC = () => {
  const { refreshAccessToken } = useAuth();
  const [formOptions, setFormOptions] = useState<FormOptions | null>(null);
  const [foodChoice, setFoodChoice] = useState('');
  const [alcoholChoices, setAlcoholChoices] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [newAllergy, setNewAllergy] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    // Загружаем варианты для форм
    apiRequest('/preferences/form-options', {
      refreshTokenCallback: refreshAccessToken,
    })
      .then(res => res.json())
      .then(data => {
        setFormOptions(data);
      })
      .catch(err => console.error('Ошибка загрузки вариантов:', err));

    // Загружаем текущие пожелания
    apiRequest('/preferences/', {
      refreshTokenCallback: refreshAccessToken,
    })
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        if (data.food_preference) setFoodChoice(data.food_preference);
        if (data.alcohol_preferences) setAlcoholChoices(data.alcohol_preferences);
        if (data.allergies) setAllergies(data.allergies);
      })
      .catch(err => console.error('Ошибка загрузки пожеланий:', err));
  }, [refreshAccessToken]);

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleFoodSubmit = async () => {
    if (!foodChoice) {
      showMessage('Выберите предпочтение по еде', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest('/preferences/food', {
        method: 'POST',
        body: JSON.stringify({ food_choice: foodChoice }),
        refreshTokenCallback: refreshAccessToken,
      });

      const data = await response.json();
      if (response.ok) {
        showMessage('Предпочтение по еде сохранено', 'success');
      } else {
        showMessage(data.detail || 'Ошибка сохранения', 'error');
      }
    } catch (error) {
      showMessage('Ошибка соединения с сервером', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAlcoholSubmit = async () => {
    if (alcoholChoices.length === 0 || alcoholChoices.length > 3) {
      showMessage('Выберите от 1 до 3 видов алкоголя', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest('/preferences/alcohol', {
        method: 'POST',
        body: JSON.stringify({ alcohol_choices: alcoholChoices }),
        refreshTokenCallback: refreshAccessToken,
      });

      const data = await response.json();
      if (response.ok) {
        showMessage('Предпочтения по алкоголю сохранены', 'success');
      } else {
        showMessage(data.detail || 'Ошибка сохранения', 'error');
      }
    } catch (error) {
      showMessage('Ошибка соединения с сервером', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAlcoholToggle = (choice: string) => {
    if (alcoholChoices.includes(choice)) {
      setAlcoholChoices(alcoholChoices.filter(c => c !== choice));
    } else {
      if (alcoholChoices.length < 3) {
        setAlcoholChoices([...alcoholChoices, choice]);
      } else {
        showMessage('Можно выбрать не более 3 видов алкоголя', 'error');
      }
    }
  };

  const handleAddAllergy = async () => {
    if (!newAllergy.trim()) {
      showMessage('Введите название аллергии', 'error');
      return;
    }

    if (allergies.includes(newAllergy.trim())) {
      showMessage('Такая аллергия уже добавлена', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest('/preferences/allergies', {
        method: 'POST',
        body: JSON.stringify({ allergen: newAllergy.trim() }),
        refreshTokenCallback: refreshAccessToken,
      });

      const data = await response.json();
      if (response.ok) {
        setAllergies([...allergies, newAllergy.trim()]);
        setNewAllergy('');
        showMessage('Аллергия добавлена', 'success');
      } else {
        showMessage(data.detail || 'Ошибка добавления', 'error');
      }
    } catch (error) {
      showMessage('Ошибка соединения с сервером', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllergy = async (allergen: string) => {
    setLoading(true);
    try {
      const response = await apiRequest('/preferences/allergies', {
        method: 'DELETE',
        body: JSON.stringify({ allergen }),
        refreshTokenCallback: refreshAccessToken,
      });

      const data = await response.json();
      if (response.ok) {
        setAllergies(allergies.filter(a => a !== allergen));
        showMessage('Аллергия удалена', 'success');
      } else {
        showMessage(data.detail || 'Ошибка удаления', 'error');
      }
    } catch (error) {
      showMessage('Ошибка соединения с сервером', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="preferences-page">
        <div className="preferences-content">
        <h1>Ваши пожелания</h1>

        {message && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <motion.section 
          className="preference-section"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <h2>Предпочтение по еде</h2>
          <div className="elegant-divider"></div>
          {formOptions && (
            <div className="food-choices">
              {formOptions.food_choices.map((choice, index) => (
                <motion.label 
                  key={choice} 
                  className="radio-label"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 + index * 0.05 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                >
                  <input
                    type="radio"
                    name="food-choice"
                    value={choice}
                    checked={foodChoice === choice}
                    onChange={(e) => setFoodChoice(e.target.value)}
                    disabled={loading}
                  />
                  <span>{choice}</span>
                </motion.label>
              ))}
              <motion.button
                className="btn btn-primary"
                onClick={handleFoodSubmit}
                disabled={loading || !foodChoice}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <span>Сохранить</span>
              </motion.button>
            </div>
          )}
        </motion.section>

        <motion.section 
          className="preference-section"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h2>Предпочтения по алкоголю (1-3 вида)</h2>
          <div className="elegant-divider"></div>
          {formOptions && (
            <div className="alcohol-choices">
              {formOptions.alcohol_choices.map((choice, index) => (
                <motion.label 
                  key={choice} 
                  className="checkbox-label"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 + index * 0.05 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                >
                  <input
                    type="checkbox"
                    checked={alcoholChoices.includes(choice)}
                    onChange={() => handleAlcoholToggle(choice)}
                    disabled={loading}
                  />
                  <span>{choice}</span>
                </motion.label>
              ))}
              <motion.button
                className="btn btn-primary"
                onClick={handleAlcoholSubmit}
                disabled={loading || alcoholChoices.length === 0 || alcoholChoices.length > 3}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <span>Сохранить</span>
              </motion.button>
            </div>
          )}
        </motion.section>

        <motion.section 
          className="preference-section"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <h2>Аллергии</h2>
          <div className="elegant-divider"></div>
          <div className="allergy-input">
            <input
              type="text"
              value={newAllergy}
              onChange={(e) => setNewAllergy(e.target.value)}
              placeholder="Введите название аллергии"
              className="text-input"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddAllergy();
                }
              }}
            />
            <motion.button
              className="btn btn-primary"
              onClick={handleAddAllergy}
              disabled={loading || !newAllergy.trim()}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <span>Добавить</span>
            </motion.button>
          </div>
          {allergies.length > 0 && (
            <motion.div 
              className="allergies-list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ staggerChildren: 0.1 }}
            >
              {allergies.map((allergen, index) => (
                <motion.div 
                  key={index} 
                  className="allergy-item"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                >
                  <span>{allergen}</span>
                  <motion.button
                    className="btn-delete"
                    onClick={() => handleDeleteAllergy(allergen)}
                    disabled={loading}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "linear", duration: 0.2 }}
                  >
                    <img 
                      src={`${process.env.PUBLIC_URL || ''}/images/close-icon.svg`} 
                      alt="Удалить" 
                      className="close-icon"
                    />
                  </motion.button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.section>
        </div>
      </div>
    </Layout>
  );
};

export default Preferences;

