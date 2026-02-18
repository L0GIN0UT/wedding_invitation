import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Calendar, Clock, MapPin, Check, X, Heart, Users, Camera, Music, Utensils, Wine } from 'lucide-react';
import { Navigation } from '../components/Navigation';
import { rsvpAPI } from '../api/apiAdapter';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

const dressCodeImages = [
  'https://images.unsplash.com/photo-1768809248940-935099f48668?w=400',
  'https://images.unsplash.com/photo-1765881018768-3d1b0c73e699?w=400',
  'https://images.unsplash.com/photo-1768900316330-0e0be0796672?w=400',
  'https://images.unsplash.com/photo-1704775987602-0e9a83c33e12?w=400',
  'https://images.unsplash.com/photo-1768809248940-935099f48668?w=400',
  'https://images.unsplash.com/photo-1765881018768-3d1b0c73e699?w=400',
];

const timeline = [
  { time: '16:00', icon: Users, title: 'Сбор гостей', description: 'Приветствие и регистрация гостей' },
  { time: '16:30', icon: Heart, title: 'Церемония', description: 'Выездная регистрация брака' },
  { time: '17:30', icon: Camera, title: 'Фотосессия', description: 'Групповые и индивидуальные фотографии' },
  { time: '18:30', icon: Utensils, title: 'Банкет', description: 'Праздничный ужин с развлечениями' },
  { time: '20:00', icon: Music, title: 'Танцы', description: 'Танцевальная программа и веселье' },
  { time: '22:00', icon: Wine, title: 'Продолжение', description: 'Кальян, игры и общение' },
];

// Координаты базы отдыха Циолковский, Самарская область
const LOCATION_COORDS = {
  lat: 53.542512,
  lng: 50.304565
};

export const Event: React.FC = () => {
  const [rsvp, setRsvp] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Hero Section with Photos */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16 md:mb-24"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            {/* Groom Photo - Hidden on mobile */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="hidden lg:flex justify-center lg:justify-end"
            >
              <div className="relative group">
                <div className="absolute inset-0 rounded-3xl opacity-30 group-hover:opacity-50 transition-opacity"
                     style={{ background: 'var(--gradient-main)' }}></div>
                <div className="relative p-3 bg-white rounded-3xl shadow-xl">
                  <ImageWithFallback
                    src="https://images.unsplash.com/photo-1760080839053-a828d4c30500?w=400"
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
              className="text-center space-y-6 py-8"
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

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
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

            {/* Bride Photo - Hidden on mobile */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="hidden lg:flex justify-center lg:justify-start"
            >
              <div className="relative group">
                <div className="absolute inset-0 rounded-3xl opacity-30 group-hover:opacity-50 transition-opacity"
                     style={{ background: 'var(--gradient-main)' }}></div>
                <div className="relative p-3 bg-white rounded-3xl shadow-xl">
                  <ImageWithFallback
                    src="https://images.unsplash.com/photo-1770757587792-1b10a8221f76?w=400"
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
          <div className="elegant-card p-8 md:p-10 max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-serif gradient-text mb-4">
              Подтвердите присутствие
            </h2>
            <p className="mb-8" style={{ color: 'var(--color-text-light)' }}>
              Пожалуйста, сообщите нам, сможете ли вы присутствовать на празднике
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
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

            {message && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-lg"
                style={{
                  background: 'linear-gradient(135deg, rgba(184, 162, 200, 0.1), rgba(144, 198, 149, 0.1))',
                  color: 'var(--color-text)'
                }}
              >
                {message}
              </motion.div>
            )}
          </div>
        </motion.section>

        {/* About Event - Timeline */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mb-16 md:mb-20"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-serif gradient-text mb-4">
              О событии
            </h2>
            <p className="text-lg" style={{ color: 'var(--color-text-light)' }}>
              Программа торжества
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="relative">
              {/* Timeline Line */}
              <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 -translate-x-1/2"
                   style={{ background: 'var(--gradient-main)', opacity: 0.3 }}></div>

              {timeline.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className={`mb-8 md:mb-12 flex flex-col md:flex-row items-center gap-4 ${
                    index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                  }`}
                >
                  <div className={`flex-1 ${index % 2 === 0 ? 'md:text-right' : 'md:text-left'} text-center md:text-inherit`}>
                    <div className="elegant-card p-6 inline-block md:block">
                      <div className="flex items-center gap-3 justify-center md:justify-start">
                        {index % 2 === 0 && <item.icon className="w-6 h-6 hidden md:block" style={{ color: 'var(--color-lilac)' }} />}
                        <h3 className="text-xl font-serif font-semibold" style={{ color: 'var(--color-text)' }}>
                          {item.title}
                        </h3>
                        {index % 2 !== 0 && <item.icon className="w-6 h-6 hidden md:block" style={{ color: 'var(--color-green)' }} />}
                      </div>
                      <p className="mt-2 text-sm" style={{ color: 'var(--color-text-light)' }}>
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="relative z-10 flex-shrink-0">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold shadow-lg"
                         style={{ background: 'var(--gradient-main)' }}>
                      {item.time}
                    </div>
                  </div>

                  <div className="flex-1 hidden md:block"></div>
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
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-serif gradient-text mb-4">
              Дресс-код
            </h2>
            <div className="elegant-card p-6 max-w-2xl mx-auto">
              <p className="text-2xl font-serif font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
                Black Tie
              </p>
              <p className="text-base" style={{ color: 'var(--color-text-light)' }}>
                Элегантный вечерний наряд. Black tie — это не обязательно черные наряды, 
                это наряды без ярких принтов, перьев, страз и объемных элементов.
              </p>
            </div>
          </div>

          {/* Infinite Slider */}
          <div className="relative overflow-hidden py-8">
            <motion.div
              className="flex gap-6"
              animate={{
                x: [0, -50 * dressCodeImages.length * 16] // 50% of total width
              }}
              transition={{
                x: {
                  repeat: Infinity,
                  repeatType: "loop",
                  duration: 60,
                  ease: "linear"
                }
              }}
            >
              {[...dressCodeImages, ...dressCodeImages].map((image, index) => (
                <div key={index} className="flex-shrink-0 w-64 md:w-80">
                  <div className="elegant-card p-3 overflow-hidden">
                    <ImageWithFallback
                      src={image}
                      alt={`Dress code example ${index + 1}`}
                      className="w-full h-80 md:h-96 object-cover rounded-xl"
                    />
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Gradient Overlays */}
            <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[var(--color-cream)] to-transparent pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[var(--color-cream)] to-transparent pointer-events-none"></div>
          </div>
        </motion.section>

        {/* Venue Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="mb-16"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-serif gradient-text mb-4">
              Место проведения
            </h2>
          </div>

          <div className="elegant-card p-6 md:p-8 max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-6">
              <MapPin className="w-6 h-6" style={{ color: 'var(--color-lilac)' }} />
              <h3 className="text-xl md:text-2xl font-serif font-semibold" style={{ color: 'var(--color-text)' }}>
                Sky-village, Самарская область
              </h3>
            </div>

            <div className="rounded-2xl overflow-hidden shadow-lg" style={{ height: '400px' }}>
              <iframe
                src={`https://yandex.ru/map-widget/v1/?ll=${LOCATION_COORDS.lng},${LOCATION_COORDS.lat}&z=15&l=map&pt=${LOCATION_COORDS.lng},${LOCATION_COORDS.lat},pm2rdm`}
                width="100%"
                height="100%"
                frameBorder="0"
                allowFullScreen
                style={{ position: 'relative' }}
              ></iframe>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
};
