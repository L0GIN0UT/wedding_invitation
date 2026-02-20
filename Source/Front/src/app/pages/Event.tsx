import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence, useMotionValue, animate } from 'motion/react';
import { Calendar, Clock, MapPin, Check, X, Heart, Users, Camera, Music, Utensils, Wine, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { Navigation } from '../components/Navigation';
import { rsvpAPI } from '../api/apiAdapter';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { APP_PHOTOS } from '../constants/appPhotos';

const dressCodeImages = APP_PHOTOS.dressCode;
const DRESS_COUNT = dressCodeImages.length;

const timeline = [
  { time: '16:00', icon: Users, title: 'Сбор гостей', description: 'Приветствие и регистрация гостей' },
  { time: '16:30', icon: Heart, title: 'Церемония', description: 'Выездная регистрация брака' },
  { time: '17:30', icon: Camera, title: 'Фотосессия', description: 'Групповые и индивидуальные фотографии' },
  { time: '18:30', icon: Utensils, title: 'Банкет', description: 'Праздничный ужин с развлечениями' },
  { time: '20:00', icon: Music, title: 'Танцы', description: 'Танцевальная программа и веселье' },
  { time: '22:00', icon: Wine, title: 'Продолжение', description: 'Кальян, игры и общение' },
];

// Координаты Sky-village (53°20′22″N, 50°11′53″E)
const LOCATION_COORDS = {
  lat: 53.339416,
  lng: 50.198036
};

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    const m = window.matchMedia(query);
    setMatches(m.matches);
    const handler = () => setMatches(m.matches);
    m.addEventListener('change', handler);
    return () => m.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

export const Event: React.FC = () => {
  const [rsvp, setRsvp] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const isDesktop = useMediaQuery('(min-width: 768px)');

  // Ссылки для открытия точки в приложениях карт (координаты: lat, lng)
  const geoUri = `geo:${LOCATION_COORDS.lat},${LOCATION_COORDS.lng}`;
  const appleMapsUrl = `https://maps.apple.com/?ll=${LOCATION_COORDS.lat},${LOCATION_COORDS.lng}&q=Sky-village`;
  const yandexMapsUrl = `https://yandex.ru/maps/?ll=${LOCATION_COORDS.lng},${LOCATION_COORDS.lat}&z=14&pt=${LOCATION_COORDS.lng},${LOCATION_COORDS.lat}`;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${LOCATION_COORDS.lat},${LOCATION_COORDS.lng}`;
  // На iOS geo: не поддерживается — открываем Apple Maps. На Android geo: даёт выбор приложения.
  const handleMapClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (typeof navigator === 'undefined') return;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isIOS) {
      e.preventDefault();
      window.location.href = appleMapsUrl;
    }
  };

  const dressSliderRef = useRef<HTMLDivElement>(null);
  const [dressMeasured, setDressMeasured] = useState({ step: 280, setWidth: DRESS_COUNT * 280 });

  useEffect(() => {
    const track = dressSliderRef.current;
    if (!track) return;
    const firstCard = track.firstElementChild as HTMLElement | null;
    if (!firstCard) return;
    const measure = () => {
      const gap = parseFloat(getComputedStyle(track).gap) || 24;
      const cardWidth = firstCard.offsetWidth;
      const step = cardWidth + gap;
      setDressMeasured({ step, setWidth: DRESS_COUNT * step });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    return () => ro.disconnect();
  }, [isDesktop]);

  const dressSetWidth = dressMeasured.setWidth;
  const dressCardStep = dressMeasured.step;

  const dressX = useMotionValue(0);
  const dressControlsRef = useRef<ReturnType<typeof animate> | null>(null);
  const dressManualControlsRef = useRef<ReturnType<typeof animate> | null>(null);
  const [dressPaused, setDressPaused] = useState(false);
  const [dressPausedX, setDressPausedX] = useState(0);
  const dressPausedXRef = useRef(0);
  const dressTouchStartRef = useRef<{ x: number; clientX: number } | null>(null);
  const dressInitializedRef = useRef(false);
  /** После нажатия «Продолжить показ» игнорируем касания карусели короткое время, чтобы не ставить паузу от «двойного» касания на мобилке */
  const dressIgnoreTouchUntilRef = useRef(0);

  const dressMiddleMin = -dressSetWidth;
  const dressMiddleMax = -2 * dressSetWidth;

  dressPausedXRef.current = dressPausedX;

  useEffect(() => {
    if (!dressInitializedRef.current && dressSetWidth > 0) {
      dressInitializedRef.current = true;
      dressX.set(-dressSetWidth);
      setDressPausedX(-dressSetWidth);
    }
  }, [dressSetWidth, dressX]);

  useEffect(() => {
    if (dressPaused) return;
    const current = dressPausedXRef.current;
    const start = Math.max(dressMiddleMax, Math.min(dressMiddleMin, current));
    dressX.set(start);
    const duration = 60 * Math.abs(start - dressMiddleMax) / dressSetWidth;
    const firstAnim = animate(dressX, [start, dressMiddleMax], { duration, ease: 'linear' });
    firstAnim.then(() => {
      dressX.set(dressMiddleMin);
      setDressPausedX(dressMiddleMin);
      dressControlsRef.current = animate(dressX, [dressMiddleMin, dressMiddleMax], {
        repeat: Infinity,
        duration: 60,
        ease: 'linear',
      });
    });
    return () => {
      firstAnim.stop();
      dressControlsRef.current?.stop();
      dressControlsRef.current = null;
    };
  }, [dressPaused, dressSetWidth]);

  useEffect(() => {
    if (dressPaused) dressX.set(dressPausedX);
  }, [dressPaused, dressPausedX, dressX]);

  const normalizeDressPosition = (x: number) => {
    if (x < dressMiddleMax) return x + dressSetWidth;
    if (x > dressMiddleMin) return x - dressSetWidth;
    return x;
  };

  const handleDressPause = () => {
    if (Date.now() < dressIgnoreTouchUntilRef.current) return;
    dressControlsRef.current?.stop();
    dressControlsRef.current = null;
    setDressPausedX(dressX.get());
    setDressPaused(true);
  };

  const handleDressResume = () => {
    setDressPaused(false);
    dressIgnoreTouchUntilRef.current = Date.now() + 450;
  };

  const handleDressPrev = () => {
    const next = dressPausedX + dressCardStep;
    dressManualControlsRef.current?.stop();
    dressManualControlsRef.current = animate(dressX, next, { duration: 0.35, ease: 'easeInOut' });
    dressManualControlsRef.current.then(() => {
      dressManualControlsRef.current = null;
      const normalized = normalizeDressPosition(next);
      if (normalized !== next) {
        dressX.set(normalized);
        setDressPausedX(normalized);
      } else {
        setDressPausedX(next);
      }
    });
  };

  const handleDressNext = () => {
    const next = dressPausedX - dressCardStep;
    dressManualControlsRef.current?.stop();
    dressManualControlsRef.current = animate(dressX, next, { duration: 0.35, ease: 'easeInOut' });
    dressManualControlsRef.current.then(() => {
      dressManualControlsRef.current = null;
      const normalized = normalizeDressPosition(next);
      if (normalized !== next) {
        dressX.set(normalized);
        setDressPausedX(normalized);
      } else {
        setDressPausedX(next);
      }
    });
  };

  const handleDressTouchStart = (e: React.TouchEvent) => {
    if (Date.now() < dressIgnoreTouchUntilRef.current) return;
    handleDressPause();
    dressTouchStartRef.current = { x: dressX.get(), clientX: e.touches[0].clientX };
  };

  const handleDressTouchMove = (e: React.TouchEvent) => {
    if (!dressTouchStartRef.current) return;
    const delta = dressTouchStartRef.current.clientX - e.touches[0].clientX;
    let next = dressTouchStartRef.current.x - delta;
    // На мобилке разрешаем тянуть по всей ширине трёх наборов — бесконечный свайп в любую сторону
    const touchMin = -3 * dressSetWidth;
    const touchMax = 0;
    next = Math.max(touchMin, Math.min(touchMax, next));
    dressX.set(next);
    setDressPausedX(next);
  };

  const handleDressTouchEnd = () => {
    if (dressTouchStartRef.current !== null) {
      const normalized = normalizeDressPosition(dressPausedX);
      if (normalized !== dressPausedX) {
        dressX.set(normalized);
        setDressPausedX(normalized);
      }
    }
    dressTouchStartRef.current = null;
  };

  useEffect(() => {
    const loadRSVP = async () => {
      try {
        const data = await rsvpAPI.get();
        setRsvp(data.rsvp);
      } catch (error) {
        console.error('Failed to load RSVP:', error);
      }
    };
    loadRSVP();
  }, []);

  const handleRSVP = async (attending: boolean) => {
    setIsLoading(true);
    setMessage('');
    try {
      await rsvpAPI.save(attending);
      setRsvp(attending);
      setMessage(attending ? 'Спасибо за подтверждение!' : 'Нам жаль, что вы не сможете прийти');
    } catch (error: any) {
      setMessage(error.message || 'Ошибка сохранения');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: 'var(--color-cream)' }}>
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-6 lg:px-8 py-8 md:py-10 lg:py-12">
        {/* Hero Section with Photos */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16 md:mb-20 lg:mb-24"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-10 lg:gap-12 xl:gap-16 items-center">
            {/* Groom Photo */}
            <motion.div
              initial={{ opacity: 0, y: 20, x: -50 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              transition={{ delay: 0.2 }}
              className="hidden lg:flex justify-center order-2 lg:order-1 lg:justify-end"
            >
              <div className="relative group max-w-[280px] w-full">
                <div className="absolute inset-0 rounded-3xl opacity-30 group-hover:opacity-50 transition-opacity"
                     style={{ background: 'var(--gradient-main)' }}></div>
                <div className="relative p-3 bg-white rounded-3xl shadow-xl">
                  <ImageWithFallback
                    src={APP_PHOTOS.heroGroom}
                    alt="Иван"
                    className="w-full h-64 md:h-80 object-cover rounded-2xl"
                  />
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-white rounded-full shadow-lg">
                    <span className="font-serif text-lg md:text-xl gradient-text font-semibold">Иван</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Names and Info */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="text-center space-y-6 py-8 px-4 md:px-5 lg:px-6 order-1 lg:order-2"
            >
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif gradient-text font-bold mb-2">
                  Иван
                </h1>
                <div className="decorative-font text-5xl md:text-6xl lg:text-7xl gradient-text my-4">
                  &
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif gradient-text font-bold">
                  Алина
                </h1>
              </div>

              <p className="text-lg md:text-xl" style={{ color: 'var(--color-text-light)' }}>
                Приглашаем вас разделить с нами<br />самый важный день
              </p>

              <div className="flex flex-col sm:flex-row gap-4 md:gap-5 justify-center items-center mt-8">
                <div className="elegant-card p-6 min-w-[160px]">
                  <Calendar className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--color-lilac)' }} />
                  <div className="text-sm" style={{ color: 'var(--color-text-lighter)' }}>Дата</div>
                  <div className="text-2xl font-serif font-semibold gradient-text">22 мая</div>
                </div>

                <div className="elegant-card p-6 min-w-[160px]">
                  <Clock className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--color-green)' }} />
                  <div className="text-sm" style={{ color: 'var(--color-text-lighter)' }}>Время</div>
                  <div className="text-2xl font-serif font-semibold gradient-text">16:00</div>
                </div>
              </div>
            </motion.div>

            {/* Bride Photo */}
            <motion.div
              initial={{ opacity: 0, y: 20, x: 50 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              transition={{ delay: 0.3 }}
              className="hidden lg:flex justify-center order-3 lg:order-3 lg:justify-start"
            >
              <div className="relative group max-w-[280px] w-full">
                <div className="absolute inset-0 rounded-3xl opacity-30 group-hover:opacity-50 transition-opacity"
                     style={{ background: 'var(--gradient-main)' }}></div>
                <div className="relative p-3 bg-white rounded-3xl shadow-xl">
                  <ImageWithFallback
                    src={APP_PHOTOS.heroBride}
                    alt="Алина"
                    className="w-full h-64 md:h-80 object-cover rounded-2xl"
                  />
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-white rounded-full shadow-lg">
                    <span className="font-serif text-lg md:text-xl gradient-text font-semibold">Алина</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* RSVP Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-16 md:mb-20"
        >
          <div className="elegant-card p-6 md:p-8 lg:p-10 max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-serif gradient-text mb-4">
              Подтвердите присутствие
            </h2>
            <p className="mb-6 md:mb-8 text-base md:text-lg" style={{ color: 'var(--color-text-light)' }}>
              Пожалуйста, сообщите нам, сможете ли вы присутствовать на празднике
            </p>

            <div className="flex flex-col sm:flex-row gap-4 md:gap-5 justify-center mb-6">
              <button
                onClick={() => handleRSVP(true)}
                disabled={isLoading}
                className={`px-8 py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                  rsvp === true ? 'text-white shadow-lg' : 'bg-white hover:shadow-md'
                }`}
                style={
                  rsvp === true
                    ? { background: 'var(--gradient-main)' }
                    : { color: 'var(--color-text)', borderWidth: '2px', borderColor: 'var(--color-border)' }
                }
              >
                <Check className="w-5 h-5" />
                Буду присутствовать
              </button>

              <button
                onClick={() => handleRSVP(false)}
                disabled={isLoading}
                className={`px-8 py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                  rsvp === false ? 'bg-gray-400 text-white shadow-lg' : 'bg-white hover:shadow-md'
                }`}
                style={
                  rsvp === false
                    ? {}
                    : { color: 'var(--color-text)', borderWidth: '2px', borderColor: 'var(--color-border)' }
                }
              >
                <X className="w-5 h-5" />
                Не смогу прийти
              </button>
            </div>

            <AnimatePresence mode="wait">
              {message && (
                <motion.div
                  key={message}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="p-4 rounded-lg"
                  style={{
                    background: 'linear-gradient(135deg, rgba(184, 162, 200, 0.1), rgba(144, 198, 149, 0.1))',
                    color: 'var(--color-text)'
                  }}
                >
                  {message}
                </motion.div>
              )}
            </AnimatePresence>

            <p className="mt-5 text-sm" style={{ color: 'var(--color-text-light)' }}>
              Можете также указать предпочтения по меню —{' '}
              <Link to="/preferences" className="underline font-medium hover:opacity-90 transition-opacity" style={{ color: 'var(--color-lilac)' }}>
                заполнить пожелания
              </Link>
            </p>
          </div>
        </motion.section>

        {/* About Event - Timeline */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mb-16 md:mb-20"
        >
          <div className="text-center mb-8 md:mb-10 lg:mb-12">
            <h2 className="text-3xl md:text-4xl font-serif gradient-text mb-4">
              О событии
            </h2>
            <p className="text-lg md:text-xl" style={{ color: 'var(--color-text-light)' }}>
              Программа торжества
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="relative pl-0 md:pl-0">
              {/* Timeline Line - слева на мобилке, по центру на десктопе */}
              <div
                className="absolute left-6 md:left-1/2 top-0 bottom-0 w-0.5 md:-translate-x-1/2"
                style={{ background: 'var(--gradient-main)', opacity: 0.3 }}
              />

              {timeline.map((item, index) => (
                <motion.div
                  key={index}
                  initial={
                    isDesktop
                      ? { opacity: 0, x: index % 2 === 0 ? -30 : 30 }
                      : { opacity: 0, y: -20 }
                  }
                  whileInView={
                    isDesktop ? { opacity: 1, x: 0 } : { opacity: 1, y: 0 }
                  }
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="relative mb-8 md:mb-12 pt-0 min-h-[4rem] md:min-h-0"
                >
                  {/* Кружок с временем на линии */}
                  <div className="absolute left-0 md:left-1/2 top-0 z-10 md:-translate-x-1/2">
                    <div
                      className="w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center text-white font-bold shadow-lg text-sm md:text-base"
                      style={{ background: 'var(--gradient-main)' }}
                    >
                      {item.time}
                    </div>
                  </div>

                  {/* Карточка: справа от линии на мобилке, чередуется на десктопе */}
                  <div
                    className={`ml-20 md:ml-0 flex flex-col md:flex-row md:items-center md:gap-4 ${
                      index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                    }`}
                  >
                    <div
                      className={`flex-1 ${index % 2 === 0 ? 'md:text-right md:mr-3' : 'md:text-left md:ml-3'} text-left md:text-inherit`}
                    >
                      <div className="elegant-card p-5 md:p-6 md:inline-block md:block">
                        <div className="flex items-center gap-3 justify-start md:justify-start">
                          <item.icon
                            className="w-6 h-6 flex-shrink-0"
                            style={{ color: index % 2 === 0 ? 'var(--color-lilac)' : 'var(--color-green)' }}
                          />
                          <h3 className="text-xl md:text-2xl font-serif font-semibold" style={{ color: 'var(--color-text)' }}>
                            {item.title}
                          </h3>
                        </div>
                        <p className="mt-2 text-sm" style={{ color: 'var(--color-text-light)' }}>
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex-1 hidden md:block" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Dress Code with Slider */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="mb-16 md:mb-20"
        >
          <div className="text-center mb-6 md:mb-8">
            <h2 className="text-3xl md:text-4xl font-serif gradient-text mb-4">
              Дресс-код
            </h2>
            <div className="elegant-card p-5 md:p-6 lg:p-8 max-w-2xl mx-auto">
              <p className="text-xl md:text-2xl font-serif font-semibold mb-3 md:mb-4" style={{ color: 'var(--color-text)' }}>
                Black Tie
              </p>
              <p className="text-sm md:text-base" style={{ color: 'var(--color-text-light)' }}>
                Элегантный вечерний наряд. Black tie — это не обязательно черные наряды, 
                это наряды без ярких принтов, перьев, страз и объемных элементов.
              </p>
            </div>
          </div>

          {/* Infinite Slider — замыкается: после последнего снова первое; пауза по наведению/касанию, листание стрелками или свайпом */}
          <div
            className="relative overflow-hidden py-8"
            onMouseEnter={handleDressPause}
            onMouseLeave={handleDressResume}
            onTouchStart={handleDressTouchStart}
            onTouchMove={handleDressTouchMove}
            onTouchEnd={handleDressTouchEnd}
            onTouchCancel={handleDressTouchEnd}
          >
            <motion.div
              ref={dressSliderRef}
              className="flex gap-6"
              style={{ x: dressX }}
            >
              {[...dressCodeImages, ...dressCodeImages, ...dressCodeImages].map((image, index) => (
                <div key={index} className="flex-shrink-0 w-64 md:w-80">
                  <div className="elegant-card p-3 overflow-hidden">
                    {image ? (
                      <ImageWithFallback
                        src={image}
                        alt={`Dress code example ${index + 1}`}
                        className="w-full h-80 md:h-96 object-cover rounded-xl"
                      />
                    ) : (
                      <div className="w-full h-80 md:h-96 rounded-xl inline-block bg-gray-100 text-center align-middle">
                        <div className="flex items-center justify-center w-full h-full" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Кнопки листания при паузе */}
            {dressPaused && (
              <>
                <button
                  type="button"
                  onClick={handleDressPrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-opacity hover:opacity-90"
                  style={{ background: 'var(--gradient-main)', color: 'white' }}
                  aria-label="Назад"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={handleDressNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-opacity hover:opacity-90"
                  style={{ background: 'var(--gradient-main)', color: 'white' }}
                  aria-label="Вперёд"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
                {/* Обёртка с увеличенной зоной нажатия: в capture останавливаем touch, чтобы карусель не получала касания; «Продолжить» вызываем в onTouchEndCapture и по клику */}
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 z-20 p-4 md:hidden"
                  onTouchStartCapture={(e) => e.stopPropagation()}
                  onTouchEndCapture={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleDressResume();
                  }}
                  onTouchCancelCapture={(e) => e.stopPropagation()}
                  onTouchMoveCapture={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDressResume();
                    }}
                    onTouchStart={(e) => e.stopPropagation()}
                    onTouchEnd={(e) => e.stopPropagation()}
                    className="text-sm px-4 py-2 min-h-[40px] rounded-full bg-white/95 shadow-md text-[var(--color-text)] font-medium"
                  >
                    Продолжить показ
                  </button>
                </div>
              </>
            )}

            {/* Gradient Overlays */}
            <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[var(--color-cream)] to-transparent pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[var(--color-cream)] to-transparent pointer-events-none" />
          </div>
        </motion.section>

        {/* Venue Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="mb-16 md:mb-20"
        >
          <div className="text-center mb-6 md:mb-8">
            <h2 className="text-3xl md:text-4xl font-serif gradient-text mb-4">
              Место проведения
            </h2>
          </div>

          <div className="elegant-card p-5 md:p-6 lg:p-8 max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-6">
              <MapPin className="w-6 h-6" style={{ color: 'var(--color-lilac)' }} />
              <h3 className="text-xl md:text-2xl font-serif font-semibold" style={{ color: 'var(--color-text)' }}>
                Sky-village, Самарская область
              </h3>
            </div>

            {/* Виджет карты, под ней блок «Показать на карте» и ссылки (мобилка и десктоп). */}
            <div className="rounded-2xl overflow-hidden shadow-lg h-[280px] md:h-[400px] mb-3">
              <iframe
                src={`https://yandex.ru/map-widget/v1/?ll=${LOCATION_COORDS.lng},${LOCATION_COORDS.lat}&z=15&l=map&pt=${LOCATION_COORDS.lng},${LOCATION_COORDS.lat},pm2rdm`}
                width="100%"
                height="100%"
                frameBorder="0"
                allowFullScreen
                style={{ position: 'relative' }}
              />
            </div>
            <div className="rounded-2xl overflow-hidden">
              <a
                href={isDesktop ? yandexMapsUrl : geoUri}
                target={isDesktop ? '_blank' : undefined}
                rel={isDesktop ? 'noopener noreferrer' : undefined}
                onClick={!isDesktop ? handleMapClick : undefined}
                className="flex items-center justify-center gap-2 py-3 px-6 rounded-xl border-2 font-medium transition-all hover:shadow-md active:scale-[0.99] cursor-pointer"
                style={{ borderColor: 'var(--color-lilac)', color: 'var(--color-text)', backgroundColor: 'var(--color-white)', outline: 'none' }}
              >
                <MapPin className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-lilac)' }} />
                <span>Показать на карте</span>
              </a>
              <div className="flex flex-wrap justify-center gap-x-2 gap-y-1 px-3 pt-2 pb-3 text-xs" style={{ backgroundColor: 'transparent', color: 'var(--color-text-light)' }}>
                <span>Открыть в:</span>
                <a href={yandexMapsUrl} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80 cursor-pointer" style={{ color: 'var(--color-text)' }}>Яндекс</a>
                <span>·</span>
                <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80 cursor-pointer" style={{ color: 'var(--color-text)' }}>Google</a>
              </div>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
};
