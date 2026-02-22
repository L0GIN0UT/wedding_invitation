import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Utensils, Wine, AlertCircle, Plus, X as XIcon, Loader2, Check } from 'lucide-react';
import { Navigation } from '../components/Navigation';
import { preferencesAPI, guestsAPI, type GuestListItem } from '../api/apiAdapter';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { PHOTO_PATHS } from '../constants/appPhotos';
import { useMediaUrls } from '../hooks/useGalleryMedia';

const PREFERENCE_PATHS = [
  PHOTO_PATHS.preferences.topLeft,
  PHOTO_PATHS.preferences.topRight,
  PHOTO_PATHS.preferences.bottomLeft,
  PHOTO_PATHS.preferences.bottomRight,
];

export const Preferences: React.FC = () => {
  const { urls: photoUrls } = useMediaUrls(PREFERENCE_PATHS);
  const [foodChoices, setFoodChoices] = useState<string[]>([]);
  const [alcoholChoices, setAlcoholChoices] = useState<string[]>([]);
  const [selectedFood, setSelectedFood] = useState('');
  const [savedFood, setSavedFood] = useState('');
  const [selectedAlcohol, setSelectedAlcohol] = useState<string[]>([]);
  const [savedAlcohol, setSavedAlcohol] = useState<string[]>([]);
  const [allergens, setAllergens] = useState<string[]>([]);
  const [haveAllergies, setHaveAllergiesState] = useState<boolean | null>(null);
  const [newAllergen, setNewAllergen] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingFoodAndAlcohol, setIsSavingFoodAndAlcohol] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  // Блок «Заполнить за другого»
  const [familiItems, setFamiliItems] = useState<Array<{
    guest_uuid: string;
    last_name: string | null;
    first_name: string;
    patronomic: string | null;
    food_preference: string | null;
    alcohol_preferences: string[];
    allergies: string[];
    have_allergies: boolean | null;
  }>>([]);
  const [showAddOtherSearch, setShowAddOtherSearch] = useState(false);
  const [fioSearch, setFioSearch] = useState('');
  const [fioSearchMatches, setFioSearchMatches] = useState<GuestListItem[] | null>(null);
  const [isAddingOther, setIsAddingOther] = useState(false);
  const [guestsList, setGuestsList] = useState<GuestListItem[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [options, prefs, familiData] = await Promise.all([
          preferencesAPI.getFormOptions(),
          preferencesAPI.get(),
          guestsAPI.getFamiliPreferForms().catch(() => ({ items: [] }))
        ]);

        if (options && options.food_choices) {
          setFoodChoices(options.food_choices);
        }
        if (options && options.alcohol_choices) {
          setAlcoholChoices(options.alcohol_choices);
        }
        if (prefs) {
          const food = prefs.food_choice || '';
          setSelectedFood(food);
          setSavedFood(food);
          const alcohol = prefs.alcohol_choices || [];
          setSelectedAlcohol(alcohol);
          setSavedAlcohol(alcohol);
          setAllergens(prefs.allergens || []);
          setHaveAllergiesState(prefs.have_allergies ?? null);
        }
        setFamiliItems(familiData.items || []);
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

  useEffect(() => {
    if (!showAddOtherSearch) return;
    const loadGuests = async () => {
      try {
        const { guests } = await guestsAPI.getList('last_name');
        setGuestsList(guests || []);
      } catch {
        setGuestsList([]);
      }
    };
    loadGuests();
  }, [showAddOtherSearch]);

  const handleFoodChange = (choice: string) => {
    setSelectedFood(choice);
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

  const foodAndAlcoholUnchanged =
    selectedFood === savedFood &&
    selectedAlcohol.length === savedAlcohol.length &&
    selectedAlcohol.every((c) => savedAlcohol.includes(c));

  const handleSaveFoodAndAlcohol = async () => {
    if (foodAndAlcoholUnchanged) return;
    setIsSavingFoodAndAlcohol(true);
    setMessage('');
    try {
      await preferencesAPI.saveFood(selectedFood);
      await preferencesAPI.saveAlcohol(selectedAlcohol);
      setSavedFood(selectedFood);
      setSavedAlcohol(selectedAlcohol);
      setMessage('Предпочтения сохранены!');
      setTimeout(() => setMessage(''), 2000);
    } catch (error: any) {
      setMessage(error.message || 'Ошибка сохранения');
      setTimeout(() => setMessage(''), 2000);
    } finally {
      setIsSavingFoodAndAlcohol(false);
    }
  };

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
    } catch (error: any) {
      setMessage(error.message || 'Ошибка удаления');
      setTimeout(() => setMessage(''), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetHaveAllergies = async (value: boolean) => {
    setMessage('');
    try {
      await preferencesAPI.setHaveAllergies(value);
      setHaveAllergiesState(value);
    } catch (error: any) {
      setMessage(error.message || 'Ошибка сохранения');
      setTimeout(() => setMessage(''), 2000);
    }
  };

  const formatFio = (ln: string | null, fn: string, p: string | null) =>
    [ln, fn, p].filter(Boolean).join(' ').trim() || '—';

  const handleAddOtherConfirm = async () => {
    const q = fioSearch.trim().toLowerCase();
    if (!q) {
      setMessage('Введите ФИО для поиска');
      setTimeout(() => setMessage(''), 2000);
      return;
    }
    const fioMatch = (g: GuestListItem) =>
      formatFio(g.last_name, g.first_name, g.patronomic).toLowerCase().includes(q);
    const found = guestsList.filter(fioMatch);
    if (found.length === 0) {
      setMessage('Гость не найден. Проверьте ФИО.');
      setTimeout(() => setMessage(''), 2000);
      return;
    }
    if (found.length > 1) {
      setFioSearchMatches(found);
      setMessage('Уточните, кого добавить');
      setTimeout(() => setMessage(''), 2000);
      return;
    }
    const guest = found[0];
    setIsAddingOther(true);
    setMessage('');
    setFioSearchMatches(null);
    try {
      await guestsAPI.addToFamiliPreferForms(guest.uuid);
      const { items } = await guestsAPI.getFamiliPreferForms();
      setFamiliItems(items);
      setShowAddOtherSearch(false);
      setFioSearch('');
    } catch (error: any) {
      setMessage(error.message || 'Ошибка добавления');
      setTimeout(() => setMessage(''), 2000);
    } finally {
      setIsAddingOther(false);
    }
  };

  const handlePickFioMatch = (guest: GuestListItem) => {
    setFioSearch(formatFio(guest.last_name, guest.first_name, guest.patronomic));
    setFioSearchMatches(null);
    setMessage('');
  };

  const refetchFamiliItems = async () => {
    try {
      const { items } = await guestsAPI.getFamiliPreferForms();
      setFamiliItems(items);
    } catch {
      // ignore
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
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-3 sm:px-6 sm:py-4 rounded-xl shadow-2xl w-[calc(100vw-2rem)] max-w-md min-w-0"
            style={{
              background: 'linear-gradient(135deg, rgba(184, 162, 200, 0.95), rgba(144, 198, 149, 0.95))',
              color: 'white',
              backdropFilter: 'blur(10px)'
            }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-2 h-2 flex-shrink-0 rounded-full bg-white animate-pulse"></div>
              <span className="font-medium break-words min-w-0">{message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Decorative Side Images - 4 фото; скрыты на 1024/1440, чтобы не заходить на блоки */}
      <div className="hidden 2xl:block fixed top-48 w-60 z-10" style={{ left: 'max(1rem, calc((100vw - 56rem) / 8))' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: -8 }}
          animate={{ opacity: 0.2, scale: 1, rotate: -5, y: [0, -10, 0] }}
          transition={{ duration: 0.8, y: { duration: 4, repeat: Infinity, ease: "easeInOut" } }}
          className="rounded-3xl overflow-hidden shadow-2xl transform hover:scale-105 hover:rotate-0 transition-all duration-300"
          style={{ border: '5px solid white' }}
        >
          <ImageWithFallback
            src={photoUrls[PHOTO_PATHS.preferences.topLeft] ?? ''}
            alt="Подарок"
            className="w-full h-80 object-cover"
          />
        </motion.div>
      </div>

      <div className="hidden 2xl:block fixed bottom-40 w-56 z-10" style={{ left: 'max(1rem, calc((100vw - 56rem) / 8))' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: 8 }}
          animate={{ opacity: 0.2, scale: 1, rotate: 5, y: [0, 10, 0] }}
          transition={{ duration: 0.8, delay: 0.2, y: { duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 } }}
          className="rounded-3xl overflow-hidden shadow-2xl transform hover:scale-105 hover:rotate-0 transition-all duration-300"
          style={{ border: '5px solid white' }}
        >
          <ImageWithFallback
            src={photoUrls[PHOTO_PATHS.preferences.topRight] ?? ''}
            alt="Цветы"
            className="w-full h-72 object-cover"
          />
        </motion.div>
      </div>

      <div className="hidden 2xl:block fixed top-56 w-56 z-10" style={{ right: 'max(1rem, calc((100vw - 56rem) / 8))' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: 8 }}
          animate={{ opacity: 0.2, scale: 1, rotate: 6, y: [0, -15, 0] }}
          transition={{ duration: 0.8, delay: 0.1, y: { duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 0.2 } }}
          className="rounded-3xl overflow-hidden shadow-2xl transform hover:scale-105 hover:rotate-0 transition-all duration-300"
          style={{ border: '5px solid white' }}
        >
          <ImageWithFallback
            src={photoUrls[PHOTO_PATHS.preferences.bottomLeft] ?? ''}
            alt="Цветы"
            className="w-full h-72 object-cover"
          />
        </motion.div>
      </div>

      <div className="hidden 2xl:block fixed bottom-48 w-60 z-10" style={{ right: 'max(1rem, calc((100vw - 56rem) / 8))' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: -8 }}
          animate={{ opacity: 0.2, scale: 1, rotate: -6, y: [0, 12, 0] }}
          transition={{ duration: 0.8, delay: 0.3, y: { duration: 4.2, repeat: Infinity, ease: "easeInOut", delay: 0.8 } }}
          className="rounded-3xl overflow-hidden shadow-2xl transform hover:scale-105 hover:rotate-0 transition-all duration-300"
          style={{ border: '5px solid white' }}
        >
          <ImageWithFallback
            src={photoUrls[PHOTO_PATHS.preferences.bottomRight] ?? ''}
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
            Ваши предпочтения
          </h1>
          <p className="text-base md:text-lg" style={{ color: 'var(--color-text-light)' }}>
            Помогите нам сделать праздник идеальным для вас
          </p>
        </motion.div>

        {/* Предпочтения по еде и напиткам — одна карточка, одна кнопка «Сохранить» */}
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
                Предпочтения по еде
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

            <div className="flex items-center gap-3 mb-2 mt-6">
              <div className="flex-shrink-0 w-12 h-12 min-w-12 min-h-12 rounded-full flex items-center justify-center"
                   style={{ background: 'var(--gradient-main)' }}>
                <Wine className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl md:text-2xl font-serif font-semibold min-w-0" style={{ color: 'var(--color-text)' }}>
                Предпочтения по алкоголю
              </h3>
            </div>
            <p className="text-sm mb-3 ml-0 md:ml-15" style={{ color: 'var(--color-text-lighter)' }}>
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

            <div className="flex justify-end mt-6">
              <button
                onClick={handleSaveFoodAndAlcohol}
                disabled={isSavingFoodAndAlcohol || foodAndAlcoholUnchanged}
                className="w-full sm:w-auto px-6 md:px-8 py-3 rounded-xl text-white font-semibold transition-all hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: 'var(--gradient-main)' }}
              >
                {isSavingFoodAndAlcohol ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Сохранение...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    <span>Сохранить</span>
                  </>
                )}
              </button>
            </div>
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

            <div className="flex flex-wrap items-center gap-3 mb-4">
              <p className="text-base md:text-lg" style={{ color: 'var(--color-text)' }}>
                Есть ли у вас аллергии?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleSetHaveAllergies(true)}
                  className="px-4 py-2 rounded-xl font-medium transition-all text-sm"
                  style={{
                    backgroundColor: haveAllergies === true ? 'var(--color-gold)' : 'var(--color-cream-light)',
                    borderWidth: '2px',
                    borderColor: haveAllergies === true ? 'var(--color-gold)' : 'var(--color-border)',
                    color: haveAllergies === true ? 'white' : 'var(--color-text)'
                  }}
                >
                  Да
                </button>
                <button
                  type="button"
                  onClick={() => handleSetHaveAllergies(false)}
                  className="px-4 py-2 rounded-xl font-medium transition-all text-sm"
                  style={{
                    backgroundColor: haveAllergies === false ? 'var(--color-gold)' : 'var(--color-cream-light)',
                    borderWidth: '2px',
                    borderColor: haveAllergies === false ? 'var(--color-gold)' : 'var(--color-border)',
                    color: haveAllergies === false ? 'white' : 'var(--color-text)'
                  }}
                >
                  Нет
                </button>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {haveAllergies === true && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  style={{ overflow: 'hidden' }}
                  className="pt-2 pl-1.5 pr-0.5"
                >
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.section>

        {/* Заполнить предпочтения за другого человека */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mb-6 md:mb-8"
        >
          <div className="elegant-card p-5 md:p-6 lg:p-8">
            <AnimatePresence mode="wait">
              {!showAddOtherSearch ? (
                <motion.div
                  key="prompt"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-3"
                >
                  <p className="text-base md:text-lg flex-1 min-w-0" style={{ color: 'var(--color-text)' }}>
                    Хотите заполнить предпочтения за другого человека?
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAddOtherSearch(true)}
                    className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold transition-all hover:shadow-lg"
                    style={{ background: 'var(--gradient-main)' }}
                  >
                    <Plus className="w-6 h-6" />
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="search"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  <label className="block">
                    <span className="block text-sm mb-1" style={{ color: 'var(--color-text)' }}>ФИО</span>
                    <input
                      type="text"
                      value={fioSearch}
                      onChange={(e) => { setFioSearch(e.target.value); setFioSearchMatches(null); }}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddOtherConfirm()}
                      placeholder="Фамилия Имя Отчество"
                      className="w-full px-3 sm:px-4 py-3 rounded-xl border-2 transition-all focus:outline-none focus:border-[var(--color-lilac)]"
                      style={{
                        backgroundColor: 'var(--color-white)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text)'
                      }}
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-lighter)' }}>
                      Достаточно имени, фамилии или отчества
                    </p>
                  </label>
                  {fioSearchMatches && fioSearchMatches.length > 1 && (
                    <div className="space-y-2">
                      <p className="text-sm" style={{ color: 'var(--color-text)' }}>
                        Уточните, кто:{' '}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {fioSearchMatches.map((g) => (
                          <button
                            key={g.uuid}
                            type="button"
                            onClick={() => handlePickFioMatch(g)}
                            className="px-3 py-2 rounded-xl text-sm font-medium transition-all hover:shadow-md"
                            style={{
                              backgroundColor: 'var(--color-cream-light)',
                              borderWidth: '2px',
                              borderColor: 'var(--color-lilac)',
                              color: 'var(--color-text)'
                            }}
                          >
                            {formatFio(g.last_name, g.first_name, g.patronomic)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowAddOtherSearch(false); setFioSearch(''); setFioSearchMatches(null); }}
                      className="px-4 py-2 rounded-xl border-2"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      onClick={handleAddOtherConfirm}
                      disabled={isAddingOther}
                      className="px-5 py-2.5 rounded-xl text-white font-medium disabled:opacity-50"
                      style={{ background: 'var(--gradient-main)' }}
                    >
                      {isAddingOther ? 'Добавление...' : 'Заполнить'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {familiItems.map((item) => (
            <FamiliPreferenceCards
              key={item.guest_uuid}
              item={item}
              foodChoices={foodChoices}
              alcoholChoices={alcoholChoices}
              formatFio={formatFio}
              onRefetch={refetchFamiliItems}
              setMessage={setMessage}
            />
          ))}
        </motion.section>
      </div>
    </div>
  );
};

/** Карточки предпочтений для одного гостя из famili_prefer_forms */
const FamiliPreferenceCards: React.FC<{
  item: {
    guest_uuid: string;
    last_name: string | null;
    first_name: string;
    patronomic: string | null;
    food_preference: string | null;
    alcohol_preferences: string[];
    allergies: string[];
    have_allergies: boolean | null;
  };
  foodChoices: string[];
  alcoholChoices: string[];
  formatFio: (ln: string | null, fn: string, p: string | null) => string;
  onRefetch: () => void;
  setMessage: (m: string) => void;
}> = ({ item, foodChoices, alcoholChoices, formatFio, onRefetch, setMessage }) => {
  const [selectedFood, setSelectedFood] = useState(item.food_preference || '');
  const [savedFood, setSavedFood] = useState(item.food_preference || '');
  const [selectedAlcohol, setSelectedAlcohol] = useState<string[]>(item.alcohol_preferences || []);
  const [savedAlcohol, setSavedAlcohol] = useState<string[]>(item.alcohol_preferences || []);
  const [allergens, setAllergens] = useState<string[]>(item.allergies || []);
  const [haveAllergies, setHaveAllergies] = useState<boolean | null>(item.have_allergies ?? null);
  const [newAllergen, setNewAllergen] = useState('');
  const [saving, setSaving] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    const food = item.food_preference || '';
    setSelectedFood(food);
    setSavedFood(food);
    const alc = item.alcohol_preferences || [];
    setSelectedAlcohol(alc);
    setSavedAlcohol(alc);
    setAllergens(item.allergies || []);
    setHaveAllergies(item.have_allergies ?? null);
  }, [item.guest_uuid, item.food_preference, JSON.stringify(item.alcohol_preferences), JSON.stringify(item.allergies), item.have_allergies]);

  const uid = item.guest_uuid;
  const foodAndAlcoholUnchanged =
    selectedFood === savedFood &&
    selectedAlcohol.length === savedAlcohol.length &&
    selectedAlcohol.every((c) => savedAlcohol.includes(c));

  const handleSaveFoodAndAlcohol = async () => {
    if (foodAndAlcoholUnchanged) return;
    setSaving(true);
    try {
      await preferencesAPI.saveFood(selectedFood, uid);
      await preferencesAPI.saveAlcohol(selectedAlcohol, uid);
      setSavedFood(selectedFood);
      setSavedAlcohol(selectedAlcohol);
      await onRefetch();
      setMessage('Предпочтения сохранены');
      setTimeout(() => setMessage(''), 2000);
    } catch (e: unknown) {
      setMessage((e as Error).message || 'Ошибка');
      setTimeout(() => setMessage(''), 2000);
    } finally {
      setSaving(false);
    }
  };
  const addAllergen = async (allergen: string) => {
    if (allergen.trim().length < 3) return;
    setSaving(true);
    try {
      const updated = await preferencesAPI.addAllergen(allergen.trim(), uid);
      setAllergens(updated.allergens);
      setNewAllergen('');
      await onRefetch();
    } catch (e: unknown) {
      setMessage((e as Error).message || 'Ошибка');
      setTimeout(() => setMessage(''), 2000);
    } finally {
      setSaving(false);
    }
  };
  const removeAllergen = async (allergen: string) => {
    setSaving(true);
    try {
      const updated = await preferencesAPI.removeAllergen(allergen, uid);
      setAllergens(updated.allergens);
      await onRefetch();
    } catch (e: unknown) {
      setMessage((e as Error).message || 'Ошибка');
      setTimeout(() => setMessage(''), 2000);
    } finally {
      setSaving(false);
    }
  };
  const setHaveAllergiesForOther = async (value: boolean) => {
    try {
      await preferencesAPI.setHaveAllergies(value, uid);
      setHaveAllergies(value);
      await onRefetch();
    } catch (e: unknown) {
      setMessage((e as Error).message || 'Ошибка');
      setTimeout(() => setMessage(''), 2000);
    }
  };

  const handleRemoveConfirm = async (confirmed: boolean) => {
    if (!confirmed) {
      setShowRemoveConfirm(false);
      return;
    }
    setRemoving(true);
    try {
      await guestsAPI.removeFromFamiliPreferForms(uid);
      setShowRemoveConfirm(false);
      await onRefetch();
      setMessage('Пользователь убран из текущего списка');
      setTimeout(() => setMessage(''), 2000);
    } catch (e: unknown) {
      setMessage((e as Error).message || 'Ошибка');
      setTimeout(() => setMessage(''), 2000);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <>
    <div className="mt-6 elegant-card p-5 md:p-6 lg:p-8 relative">
      <div className="flex justify-between items-start gap-2 mb-4">
        <h3 className="text-xl md:text-2xl font-serif font-semibold flex-1" style={{ color: 'var(--color-text)' }}>
          {formatFio(item.last_name, item.first_name, item.patronomic)}
        </h3>
        <button
          type="button"
          onClick={() => setShowRemoveConfirm(true)}
          disabled={saving || removing}
          className="shrink-0 p-1 rounded-full hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50"
          aria-label="Удалить из списка"
        >
          <XIcon className="w-5 h-5" style={{ color: 'var(--color-text)' }} />
        </button>
      </div>
      <div className="space-y-4">
        <div>
          <p className="text-sm mb-2" style={{ color: 'var(--color-text-lighter)' }}>Предпочтения по еде</p>
          <div className="flex flex-wrap gap-2 justify-between">
            {foodChoices.map((choice) => (
              <label key={choice} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={`food-${uid}`}
                  checked={selectedFood === choice}
                  onChange={() => setSelectedFood(choice)}
                  disabled={saving}
                  className="w-4 h-4"
                />
                <span style={{ color: 'var(--color-text)' }}>{choice}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm mb-2" style={{ color: 'var(--color-text-lighter)' }}>Предпочтения по алкоголю (до 3)</p>
          <div className="flex flex-wrap gap-2 justify-between">
            {alcoholChoices.map((choice) => (
              <label key={choice} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedAlcohol.includes(choice)}
                  onChange={() => {
                    const next = selectedAlcohol.includes(choice)
                      ? selectedAlcohol.filter((c) => c !== choice)
                      : selectedAlcohol.length < 3
                        ? [...selectedAlcohol, choice]
                        : selectedAlcohol;
                    setSelectedAlcohol(next);
                  }}
                  className="w-4 h-4 rounded"
                />
                <span style={{ color: 'var(--color-text)' }}>{choice}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex justify-end mt-5">
          <button
            type="button"
            onClick={handleSaveFoodAndAlcohol}
            disabled={saving || foodAndAlcoholUnchanged}
            className="px-5 py-2.5 rounded-xl text-white text-base font-medium disabled:opacity-50 flex items-center gap-2"
            style={{ background: 'var(--gradient-main)' }}
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Check className="w-5 h-5" />
            )}
            Сохранить
          </button>
        </div>
        <div className="mt-4 pt-4 border-t border-[var(--color-border)]/50">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <p className="text-base font-medium" style={{ color: 'var(--color-text)' }}>Есть ли у него/неё аллергии?</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setHaveAllergiesForOther(true)}
                className="px-3 py-2 rounded-xl text-base font-medium"
                style={{
                  backgroundColor: haveAllergies === true ? 'var(--color-gold)' : 'var(--color-cream-light)',
                  borderWidth: '1px',
                  borderColor: haveAllergies === true ? 'var(--color-gold)' : 'var(--color-border)',
                  color: haveAllergies === true ? 'white' : 'var(--color-text)'
                }}
              >
                Да
              </button>
              <button
                type="button"
                onClick={() => setHaveAllergiesForOther(false)}
                className="px-3 py-2 rounded-xl text-base font-medium"
                style={{
                  backgroundColor: haveAllergies === false ? 'var(--color-gold)' : 'var(--color-cream-light)',
                  borderWidth: '1px',
                  borderColor: haveAllergies === false ? 'var(--color-gold)' : 'var(--color-border)',
                  color: haveAllergies === false ? 'white' : 'var(--color-text)'
                }}
              >
                Нет
              </button>
            </div>
          </div>
          <AnimatePresence initial={false}>
            {haveAllergies === true && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                style={{ overflow: 'hidden' }}
                className="pt-2 pl-1.5 pr-0.5"
              >
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newAllergen}
                    onChange={(e) => setNewAllergen(e.target.value.slice(0, 12))}
                    onKeyPress={(e) => e.key === 'Enter' && addAllergen(newAllergen)}
                    placeholder="Добавить аллерген"
                    maxLength={12}
                    className="flex-1 px-3 py-2 rounded-lg border-2"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                  <button
                    type="button"
                    onClick={() => addAllergen(newAllergen)}
                    disabled={saving || newAllergen.trim().length < 3}
                    className="px-3 py-2 rounded-lg text-white text-sm disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #d4af37, #f4e4a6)' }}
                  >
                    <Plus className="w-4 h-4 inline" />
                  </button>
                </div>
                <p className="text-xs mb-3" style={{ color: 'var(--color-text-lighter)' }}>От 3 до 12 символов</p>
                <div className="flex flex-wrap gap-3">
                  {allergens.map((a) => (
                    <motion.div
                      key={a}
                      className="flex items-center gap-2 px-4 py-2 rounded-full shadow-md"
                      style={{
                        background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1), rgba(244, 228, 166, 0.1))',
                        borderWidth: '2px',
                        borderColor: 'var(--color-gold)'
                      }}
                      whileHover={{ scale: 1.05, y: -2 }}
                      transition={{ duration: 0.2 }}
                    >
                      <span style={{ color: 'var(--color-text)' }} className="font-medium max-w-[12rem] truncate text-sm" title={a}>{a}</span>
                      <button type="button" onClick={() => removeAllergen(a)} className="p-1 rounded-full hover:bg-red-100 transition-colors">
                        <XIcon className="w-4 h-4 text-red-500" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>

    <AnimatePresence>
      {showRemoveConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => !removing && setShowRemoveConfirm(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="elegant-card p-6 max-w-sm w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-lg mb-6" style={{ color: 'var(--color-text)' }}>
              Убрать этого человека из текущего списка? Его предпочтения останутся сохранёнными.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => handleRemoveConfirm(false)}
                disabled={removing}
                className="px-4 py-2 rounded-lg border-2 disabled:opacity-50"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                Нет
              </button>
              <button
                type="button"
                onClick={() => handleRemoveConfirm(true)}
                disabled={removing}
                className="px-4 py-2 rounded-lg text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #d4af37, #f4e4a6)' }}
              >
                {removing ? (
                  <>
                    <Loader2 className="w-4 h-4 inline animate-spin mr-1" />
                    Удаление…
                  </>
                ) : (
                  'Да'
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
};
