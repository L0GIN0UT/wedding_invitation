import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Utensils, Wine, AlertCircle, Plus, X as XIcon, Loader2, Check } from 'lucide-react';
import { Navigation } from '../components/Navigation';
import { preferencesAPI } from '../api/apiAdapter';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { APP_PHOTOS } from '../constants/appPhotos';

export const Preferences: React.FC = () => {
  const [foodChoices, setFoodChoices] = useState<string[]>([]);
  const [alcoholChoices, setAlcoholChoices] = useState<string[]>([]);
  const [selectedFood, setSelectedFood] = useState('');
  const [selectedAlcohol, setSelectedAlcohol] = useState<string[]>([]);
  const [savedAlcohol, setSavedAlcohol] = useState<string[]>([]); // с чем сравниваем для кнопки «Сохранить»
  const [allergens, setAllergens] = useState<string[]>([]);
  const [newAllergen, setNewAllergen] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingFood, setIsSavingFood] = useState(false);
  const [isSavingAlcohol, setIsSavingAlcohol] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [options, prefs] = await Promise.all([
          preferencesAPI.getFormOptions(),
          preferencesAPI.get()
        ]);

        console.log('Form options loaded:', options);
        console.log('Preferences loaded:', prefs);

        // Проверяем, что данные пришли
        if (options && options.food_choices) {
          setFoodChoices(options.food_choices);
        } else {
          console.error('Food choices not found in options:', options);
        }

        if (options && options.alcohol_choices) {
          setAlcoholChoices(options.alcohol_choices);
        } else {
          console.error('Alcohol choices not found in options:', options);
        }

        if (prefs) {
          setSelectedFood(prefs.food_choice || '');
          const alcohol = prefs.alcohol_choices || [];
          setSelectedAlcohol(alcohol);
          setSavedAlcohol(alcohol);
          setAllergens(prefs.allergens || []);
        }
      } catch (error) {
        console.error('Failed to load preferences:', error);
        setMessage('Ошибка загрузки данных. Пожалуйста, обновите страницу.');
        setTimeout(() => setMessage(''), 2000);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleFoodChange = async (choice: string) => {
    setSelectedFood(choice);
    setIsSavingFood(true);
    setMessage('');

    try {
      await preferencesAPI.saveFood(choice);
      // Уведомление для еды не показываем
    } catch (error: any) {
      setMessage(error.message || 'Ошибка сохранения');
      setTimeout(() => setMessage(''), 2000);
    } finally {
      setIsSavingFood(false);
    }
  };

  const handleAlcoholChange = (choice: string) => {
    let newSelection: string[];
    
    if (selectedAlcohol.includes(choice)) {
      newSelection = selectedAlcohol.filter(c => c !== choice);
    } else {
      if (selectedAlcohol.length >= 3) {
        setMessage('Можно выбрать максимум 3 варианта');
        setTimeout(() => setMessage(''), 2000);
        return;
      }
      newSelection = [...selectedAlcohol, choice];
    }

    setSelectedAlcohol(newSelection);
  };

  const handleSaveAlcohol = async () => {
    setIsSavingAlcohol(true);
    setMessage('');

    try {
      await preferencesAPI.saveAlcohol(selectedAlcohol);
      setSavedAlcohol(selectedAlcohol);
      setMessage('Предпочтения по алкоголю сохранены!');
      setTimeout(() => setMessage(''), 2000);
    } catch (error: any) {
      setMessage(error.message || 'Ошибка сохранения');
    } finally {
      setIsSavingAlcohol(false);
    }
  };

  const alcoholUnchanged =
    selectedAlcohol.length === savedAlcohol.length &&
    selectedAlcohol.every((c) => savedAlcohol.includes(c));

  const handleAddAllergen = async () => {
    const trimmed = newAllergen.trim();
    if (!trimmed) return;
    if (trimmed.length < 3) {
      setMessage('Минимум 3 символа');
      setTimeout(() => setMessage(''), 2000);
      return;
    }

    setIsSaving(true);
    setMessage('');

    try {
      const updated = await preferencesAPI.addAllergen(trimmed);
      setAllergens(updated.allergens);
      setNewAllergen('');
      // Уведомление не показываем — список аллергенов и так видно
    } catch (error: any) {
      setMessage(error.message || 'Ошибка добавления');
      setTimeout(() => setMessage(''), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveAllergen = async (allergen: string) => {
    setIsSaving(true);
    setMessage('');

    try {
      const updated = await preferencesAPI.removeAllergen(allergen);
      setAllergens(updated.allergens);
      // Уведомление не показываем — список и так видно
    } catch (error: any) {
      setMessage(error.message || 'Ошибка удаления');
      setTimeout(() => setMessage(''), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-cream)' }}>
        <Navigation />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-lilac)' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-cream)' }}>
      <Navigation />

      {/* Toast Notification - Fixed position, плавное появление и исчезновение */}
      <AnimatePresence mode="wait">
        {message && (
          <motion.div
            key={message}
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-xl shadow-2xl max-w-md"
            style={{
              background: 'linear-gradient(135deg, rgba(184, 162, 200, 0.95), rgba(144, 198, 149, 0.95))',
              color: 'white',
              backdropFilter: 'blur(10px)'
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
              <span className="font-medium">{message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Decorative Side Images - 4 фото (подарки/цветы) */}
      <div className="hidden lg:block fixed top-48 w-60 z-10" style={{ left: 'max(1rem, calc((100vw - 56rem) / 8))' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: -8 }}
          animate={{ opacity: 0.2, scale: 1, rotate: -5, y: [0, -10, 0] }}
          transition={{ duration: 0.8, y: { duration: 4, repeat: Infinity, ease: "easeInOut" } }}
          className="rounded-3xl overflow-hidden shadow-2xl transform hover:scale-105 hover:rotate-0 transition-all duration-300"
          style={{ border: '5px solid white' }}
        >
          <ImageWithFallback
            src={APP_PHOTOS.preferences.topLeft}
            alt="Подарок"
            className="w-full h-80 object-cover"
          />
        </motion.div>
      </div>

      <div className="hidden lg:block fixed bottom-40 w-56 z-10" style={{ left: 'max(1rem, calc((100vw - 56rem) / 8))' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: 8 }}
          animate={{ opacity: 0.2, scale: 1, rotate: 5, y: [0, 10, 0] }}
          transition={{ duration: 0.8, delay: 0.2, y: { duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 } }}
          className="rounded-3xl overflow-hidden shadow-2xl transform hover:scale-105 hover:rotate-0 transition-all duration-300"
          style={{ border: '5px solid white' }}
        >
          <ImageWithFallback
            src={APP_PHOTOS.preferences.topRight}
            alt="Цветы"
            className="w-full h-72 object-cover"
          />
        </motion.div>
      </div>

      <div className="hidden lg:block fixed top-56 w-56 z-10" style={{ right: 'max(1rem, calc((100vw - 56rem) / 8))' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: 8 }}
          animate={{ opacity: 0.2, scale: 1, rotate: 6, y: [0, -15, 0] }}
          transition={{ duration: 0.8, delay: 0.1, y: { duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 0.2 } }}
          className="rounded-3xl overflow-hidden shadow-2xl transform hover:scale-105 hover:rotate-0 transition-all duration-300"
          style={{ border: '5px solid white' }}
        >
          <ImageWithFallback
            src={APP_PHOTOS.preferences.bottomLeft}
            alt="Цветы"
            className="w-full h-72 object-cover"
          />
        </motion.div>
      </div>

      <div className="hidden lg:block fixed bottom-48 w-60 z-10" style={{ right: 'max(1rem, calc((100vw - 56rem) / 8))' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: -8 }}
          animate={{ opacity: 0.2, scale: 1, rotate: -6, y: [0, 12, 0] }}
          transition={{ duration: 0.8, delay: 0.3, y: { duration: 4.2, repeat: Infinity, ease: "easeInOut", delay: 0.8 } }}
          className="rounded-3xl overflow-hidden shadow-2xl transform hover:scale-105 hover:rotate-0 transition-all duration-300"
          style={{ border: '5px solid white' }}
        >
          <ImageWithFallback
            src={APP_PHOTOS.preferences.bottomRight}
            alt="Подарок"
            className="w-full h-80 object-cover"
          />
        </motion.div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-6 lg:px-8 py-8 md:py-10 lg:py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 md:mb-10 lg:mb-12"
        >
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif gradient-text mb-4">
            Ваши пожелания
          </h1>
          <p className="text-base md:text-lg" style={{ color: 'var(--color-text-light)' }}>
            Помогите нам сделать праздник идеальным для вас
          </p>
        </motion.div>

        {/* Food Preferences */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6 md:mb-8"
        >
          <div className="elegant-card p-5 md:p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-5 md:mb-6">
              <div className="flex-shrink-0 w-12 h-12 min-w-12 min-h-12 rounded-full flex items-center justify-center"
                   style={{ background: 'var(--gradient-main)' }}>
                <Utensils className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl md:text-2xl font-serif font-semibold min-w-0" style={{ color: 'var(--color-text)' }}>
                Предпочтение по еде
              </h2>
            </div>

            <div className="space-y-2 md:space-y-3">
              {foodChoices.length === 0 ? (
                <p className="text-center py-4" style={{ color: 'var(--color-text-lighter)' }}>
                  Загрузка вариантов...
                </p>
              ) : (
                foodChoices.map((choice) => (
                  <label
                    key={choice}
                    className="flex items-center p-3 md:p-4 rounded-xl cursor-pointer transition-all hover:shadow-md"
                    style={{
                      backgroundColor: selectedFood === choice ? 'rgba(184, 162, 200, 0.1)' : 'var(--color-cream-light)',
                      borderWidth: '2px',
                      borderColor: selectedFood === choice ? 'var(--color-lilac)' : 'transparent'
                    }}
                  >
                    <input
                      type="radio"
                      name="food"
                      value={choice}
                      checked={selectedFood === choice}
                      onChange={() => handleFoodChange(choice)}
                      className="w-5 h-5 mr-3"
                    />
                    <span className="text-base" style={{ color: 'var(--color-text)' }}>
                      {choice}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
        </motion.section>

        {/* Alcohol Preferences */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-6 md:mb-8"
        >
          <div className="elegant-card p-5 md:p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-shrink-0 w-12 h-12 min-w-12 min-h-12 rounded-full flex items-center justify-center"
                   style={{ background: 'var(--gradient-main)' }}>
                <Wine className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl md:text-2xl font-serif font-semibold min-w-0" style={{ color: 'var(--color-text)' }}>
                Предпочтения по алкоголю
              </h2>
            </div>
            <p className="text-sm mb-4 md:mb-6 ml-0 md:ml-15" style={{ color: 'var(--color-text-lighter)' }}>
              Выберите до 3 вариантов
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
              {alcoholChoices.length === 0 ? (
                <p className="text-center py-4 col-span-2" style={{ color: 'var(--color-text-lighter)' }}>
                  Загрузка вариантов...
                </p>
              ) : (
                alcoholChoices.map((choice) => (
                  <label
                    key={choice}
                    className="flex items-center p-3 md:p-4 rounded-xl cursor-pointer transition-all hover:shadow-md"
                    style={{
                      backgroundColor: selectedAlcohol.includes(choice) ? 'rgba(144, 198, 149, 0.1)' : 'var(--color-cream-light)',
                      borderWidth: '2px',
                      borderColor: selectedAlcohol.includes(choice) ? 'var(--color-green)' : 'transparent'
                    }}
                  >
                    <input
                      type="checkbox"
                      value={choice}
                      checked={selectedAlcohol.includes(choice)}
                      onChange={() => handleAlcoholChange(choice)}
                      className="w-5 h-5 mr-3 rounded"
                    />
                    <span className="text-sm" style={{ color: 'var(--color-text)' }}>
                      {choice}
                    </span>
                  </label>
                ))
              )}
            </div>
            <button
              onClick={handleSaveAlcohol}
              disabled={isSavingAlcohol || alcoholUnchanged}
              className="mt-4 w-full sm:w-auto px-6 md:px-8 py-3 rounded-xl text-white font-semibold transition-all hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'var(--gradient-main)' }}
            >
              {isSavingAlcohol ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Сохранение...</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>Сохранить предпочтения</span>
                </>
              )}
            </button>
          </div>
        </motion.section>

        {/* Allergies */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-6 md:mb-8"
        >
          <div className="elegant-card p-5 md:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5 md:mb-6">
              <div className="flex-shrink-0 w-12 h-12 min-w-12 min-h-12 rounded-full flex items-center justify-center self-start"
                   style={{ background: 'linear-gradient(135deg, #d4af37, #f4e4a6)' }}>
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl md:text-2xl font-serif font-semibold min-w-0" style={{ color: 'var(--color-text)' }}>
                Аллергии и ограничения
              </h2>
            </div>

            {/* Add Allergen: поле ввода и кнопка в одну строку (мобилка и десктоп) */}
            <div className="flex flex-row gap-2 mb-3 md:mb-4">
              <input
                type="text"
                value={newAllergen}
                onChange={(e) => setNewAllergen(e.target.value.slice(0, 12))}
                onKeyPress={(e) => e.key === 'Enter' && handleAddAllergen()}
                placeholder="Добавить аллерген"
                maxLength={12}
                className="w-full min-w-0 flex-1 px-3 sm:px-4 py-3 rounded-xl border-2 transition-all focus:outline-none focus:border-[var(--color-gold)]"
                style={{
                  backgroundColor: 'var(--color-white)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
              />
              <button
                onClick={handleAddAllergen}
                disabled={isSaving || !newAllergen.trim() || newAllergen.trim().length < 3}
                className="flex-shrink-0 px-4 sm:px-6 py-3 rounded-xl text-white font-semibold transition-all hover:shadow-lg disabled:opacity-50 inline-flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #d4af37, #f4e4a6)' }}
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs mt-1 mb-3" style={{ color: 'var(--color-text-lighter)' }}>
              От 3 до 12 символов
            </p>

            {/* Allergen List */}
            {allergens.length > 0 ? (
              <motion.div 
                className="flex flex-wrap gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ staggerChildren: 0.1 }}
              >
                {allergens.map((allergen, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.05, y: -2 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="flex items-center gap-2 px-4 py-2 rounded-full shadow-md"
                    style={{ 
                      background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1), rgba(244, 228, 166, 0.1))',
                      borderWidth: '2px',
                      borderColor: 'var(--color-gold)'
                    }}
                  >
                    <span style={{ color: 'var(--color-text)' }} className="font-medium max-w-[12rem] truncate" title={allergen}>{allergen}</span>
                    <motion.button
                      onClick={() => handleRemoveAllergen(allergen)}
                      disabled={isSaving}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-1 rounded-full hover:bg-red-100 transition-colors"
                    >
                      <XIcon className="w-4 h-4 text-red-500" />
                    </motion.button>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <p className="text-center py-4" style={{ color: 'var(--color-text-lighter)' }}>
                Нет добавленных аллергий
              </p>
            )}
          </div>
        </motion.section>
      </div>
    </div>
  );
};
