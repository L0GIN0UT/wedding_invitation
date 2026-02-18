import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Utensils, Wine, AlertCircle, Plus, X as XIcon, Loader2, Check } from 'lucide-react';
import { Navigation } from '../components/Navigation';
import { preferencesAPI } from '../api/apiAdapter';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

export const Preferences: React.FC = () => {
  const [foodChoices, setFoodChoices] = useState<string[]>([]);
  const [alcoholChoices, setAlcoholChoices] = useState<string[]>([]);
  const [selectedFood, setSelectedFood] = useState('');
  const [selectedAlcohol, setSelectedAlcohol] = useState<string[]>([]);
  const [allergens, setAllergens] = useState<string[]>([]);
  const [newAllergen, setNewAllergen] = useState('');
  const [isLoading, setIsLoading] = useState(true);
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
          setSelectedAlcohol(prefs.alcohol_choices || []);
          setAllergens(prefs.allergens || []);
        }
      } catch (error) {
        console.error('Failed to load preferences:', error);
        setMessage('Ошибка загрузки данных. Пожалуйста, обновите страницу.');
        setTimeout(() => setMessage(''), 5000);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleFoodChange = async (choice: string) => {
    setSelectedFood(choice);
    setIsSaving(true);
    setMessage('');

    try {
      await preferencesAPI.saveFood(choice);
      setMessage('Предпочтение по еде сохранено!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage(error.message || 'Ошибка сохранения');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAlcoholChange = (choice: string) => {
    let newSelection: string[];
    
    if (selectedAlcohol.includes(choice)) {
      newSelection = selectedAlcohol.filter(c => c !== choice);
    } else {
      if (selectedAlcohol.length >= 3) {
        setMessage('Можно выбрать максимум 3 варианта');
        setTimeout(() => setMessage(''), 3000);
        return;
      }
      newSelection = [...selectedAlcohol, choice];
    }

    setSelectedAlcohol(newSelection);
  };

  const handleSaveAlcohol = async () => {
    setIsSaving(true);
    setMessage('');

    try {
      await preferencesAPI.saveAlcohol(selectedAlcohol);
      setMessage('Предпочтения по алкоголю сохранены!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage(error.message || 'Ошибка сохранения');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddAllergen = async () => {
    if (!newAllergen.trim()) return;

    setIsSaving(true);
    setMessage('');

    try {
      const updated = await preferencesAPI.addAllergen(newAllergen.trim());
      setAllergens(updated.allergens);
      setNewAllergen('');
      setMessage('Аллерген добавлен!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage(error.message || 'Ошибка добавления');
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
      setMessage('Аллерген удален!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage(error.message || 'Ошибка удаления');
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

      {/* Toast Notification - Fixed position */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.95 }}
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

      {/* Enhanced Decorative Side Images - Hidden on Mobile */}
      <div className="hidden lg:block fixed left-4 top-1/4 w-56 z-10">
        <motion.div
          initial={{ opacity: 0, x: -30, rotate: -5 }}
          animate={{ opacity: 0.25, x: 0, rotate: -3 }}
          transition={{ duration: 0.6 }}
          className="rounded-3xl overflow-hidden shadow-2xl transform hover:scale-105 transition-transform duration-300"
          style={{ border: '4px solid white' }}
        >
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1761766656744-8eb9c91128e1?w=400"
            alt="Wine"
            className="w-full h-80 object-cover"
          />
        </motion.div>
      </div>

      <div className="hidden lg:block fixed right-4 bottom-1/4 w-56 z-10">
        <motion.div
          initial={{ opacity: 0, x: 30, rotate: 5 }}
          animate={{ opacity: 0.25, x: 0, rotate: 3 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="rounded-3xl overflow-hidden shadow-2xl transform hover:scale-105 transition-transform duration-300"
          style={{ border: '4px solid white' }}
        >
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1764380746366-f4d8cc52e1e3?w=400"
            alt="Table Setting"
            className="w-full h-80 object-cover"
          />
        </motion.div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
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
          className="mb-8"
        >
          <div className="elegant-card p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full flex items-center justify-center"
                   style={{ background: 'var(--gradient-main)' }}>
                <Utensils className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-serif font-semibold" style={{ color: 'var(--color-text)' }}>
                Предпочтение по еде
              </h2>
            </div>

            <div className="space-y-3">
              {foodChoices.length === 0 ? (
                <p className="text-center py-4" style={{ color: 'var(--color-text-lighter)' }}>
                  Загрузка вариантов...
                </p>
              ) : (
                foodChoices.map((choice) => (
                  <label
                    key={choice}
                    className="flex items-center p-4 rounded-xl cursor-pointer transition-all hover:shadow-md"
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
          className="mb-8"
        >
          <div className="elegant-card p-6 md:p-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full flex items-center justify-center"
                   style={{ background: 'var(--gradient-main)' }}>
                <Wine className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-serif font-semibold" style={{ color: 'var(--color-text)' }}>
                Предпочтения по алкоголю
              </h2>
            </div>
            <p className="text-sm mb-6 ml-15" style={{ color: 'var(--color-text-lighter)' }}>
              Выберите до 3 вариантов
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {alcoholChoices.length === 0 ? (
                <p className="text-center py-4 col-span-2" style={{ color: 'var(--color-text-lighter)' }}>
                  Загрузка вариантов...
                </p>
              ) : (
                alcoholChoices.map((choice) => (
                  <label
                    key={choice}
                    className="flex items-center p-4 rounded-xl cursor-pointer transition-all hover:shadow-md"
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
              disabled={isSaving}
              className="mt-4 w-full sm:w-auto px-8 py-3 rounded-xl text-white font-semibold transition-all hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'var(--gradient-main)' }}
            >
              {isSaving ? (
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
          className="mb-8"
        >
          <div className="elegant-card p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full flex items-center justify-center"
                   style={{ background: 'linear-gradient(135deg, #d4af37, #f4e4a6)' }}>
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-serif font-semibold" style={{ color: 'var(--color-text)' }}>
                Аллергии и ограничения
              </h2>
            </div>

            {/* Add Allergen */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newAllergen}
                onChange={(e) => setNewAllergen(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddAllergen()}
                placeholder="Введите аллерген или ограничение"
                className="flex-1 px-4 py-3 rounded-xl border-2 transition-all focus:outline-none focus:border-[var(--color-gold)]"
                style={{
                  backgroundColor: 'var(--color-white)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
              />
              <button
                onClick={handleAddAllergen}
                disabled={isSaving || !newAllergen.trim()}
                className="px-6 py-3 rounded-xl text-white font-semibold transition-all hover:shadow-lg disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #d4af37, #f4e4a6)' }}
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

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
                    <span style={{ color: 'var(--color-text)' }} className="font-medium">{allergen}</span>
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
