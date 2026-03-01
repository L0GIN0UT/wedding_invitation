import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, Heart, Check, Loader2, ExternalLink } from 'lucide-react';
import { Navigation } from '../components/Navigation';
import { wishlistAPI } from '../api/apiAdapter';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { PHOTO_PATHS } from '../constants/appPhotos';
import { useMediaUrls } from '../hooks/useGalleryMedia';

interface WishlistItem {
  wishlist_uuid: string;
  title: string;
  description?: string;
  price?: string;
  link?: string;
  user_uuid: string | null;
  category: 'bride' | 'groom' | 'general';
}

export const Wishlist: React.FC = () => {
  const [brideItems, setBrideItems] = useState<WishlistItem[]>([]);
  const [groomItems, setGroomItems] = useState<WishlistItem[]>([]);
  const [currentUserUuid, setCurrentUserUuid] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [processingItem, setProcessingItem] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const { urls: wishlistPhotoUrls } = useMediaUrls(PHOTO_PATHS.wishlist);

  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = async () => {
    try {
      const data = await wishlistAPI.get();
      console.log('Wishlist data loaded:', data);
      console.log('Bride items:', data.bride_items);
      console.log('Groom items:', data.groom_items);
      setBrideItems(data.bride_items);
      setGroomItems(data.groom_items);
      setCurrentUserUuid(data.current_user_uuid ?? null);
      setIsInitialLoad(false);
    } catch (error) {
      console.error('Failed to load wishlist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReserve = async (item: WishlistItem) => {
    setProcessingItem(item.wishlist_uuid);
    setMessage('');

    try {
      if (item.user_uuid) {
        await wishlistAPI.unreserve(item.wishlist_uuid);
        setMessage('Бронирование отменено');
        // Оптимизированное обновление - обновляем только конкретный элемент
        if (item.category === 'bride') {
          setBrideItems(prev => prev.map(i => 
            i.wishlist_uuid === item.wishlist_uuid 
              ? { ...i, user_uuid: null }
              : i
          ));
        } else {
          setGroomItems(prev => prev.map(i => 
            i.wishlist_uuid === item.wishlist_uuid 
              ? { ...i, user_uuid: null }
              : i
          ));
        }
      } else {
        await wishlistAPI.reserve(item.wishlist_uuid);
        setMessage('Подарок забронирован!');
        const myUuid = currentUserUuid;
        if (myUuid && item.category === 'bride') {
          setBrideItems(prev => prev.map(i =>
            i.wishlist_uuid === item.wishlist_uuid ? { ...i, user_uuid: myUuid } : i
          ));
        } else if (myUuid && item.category === 'groom') {
          setGroomItems(prev => prev.map(i =>
            i.wishlist_uuid === item.wishlist_uuid ? { ...i, user_uuid: myUuid } : i
          ));
        }
      }
      setTimeout(() => setMessage(''), 2000);
    } catch (error: any) {
      setMessage(error.message || 'Ошибка операции');
    } finally {
      setProcessingItem(null);
    }
  };

  const WishlistCard: React.FC<{ item: WishlistItem; accentColor: string; isInitialLoad: boolean; currentUserUuid: string | null }> = React.memo(({ item, accentColor, isInitialLoad, currentUserUuid }) => {
    const isReservedByMe = !!item.user_uuid && item.user_uuid === currentUserUuid;
    const isReservedByOther = !!item.user_uuid && item.user_uuid !== currentUserUuid;
    const isProcessing = processingItem === item.wishlist_uuid;

    const getButtonStyle = () => {
      if (isReservedByOther) {
        return {
          backgroundColor: 'var(--color-cream-light)',
          color: 'var(--color-text-lighter)',
          borderWidth: '1px',
          borderColor: 'var(--color-border)'
        };
      }
      if (isReservedByMe) {
        if (accentColor === 'var(--color-lilac)') {
          return {
            background: 'linear-gradient(135deg, rgba(184, 162, 200, 0.35), rgba(184, 162, 200, 0.25))',
            color: 'var(--color-lilac)',
            borderWidth: '2px',
            borderColor: 'var(--color-lilac)'
          };
        }
        return {
          background: 'linear-gradient(135deg, rgba(144, 198, 149, 0.35), rgba(144, 198, 149, 0.25))',
          color: 'var(--color-green)',
          borderWidth: '2px',
          borderColor: 'var(--color-green)'
        };
      }
      if (accentColor === 'var(--color-lilac)') {
        return {
          background: 'linear-gradient(135deg, #b8a2c8, #b8a2c8dd)',
          color: 'white'
        };
      }
      return {
        background: 'linear-gradient(135deg, #90c695, #90c695dd)',
        color: 'white'
      };
    };

    const hasLink = item.link && item.link.trim() !== '';
    const canReserveOrUnreserve = !isReservedByOther;

    const cardStyle = isReservedByMe
      ? {
          boxShadow: accentColor === 'var(--color-lilac)'
            ? '0 0 0 2px rgba(184, 162, 200, 0.5)'
            : '0 0 0 2px rgba(144, 198, 149, 0.5)'
        }
      : undefined;

    return (
      <div
        className="elegant-card p-5 md:p-6 h-full flex flex-col"
        style={cardStyle}
      >
        <div className="flex items-start justify-between mb-3 md:mb-4">
          <div className="flex-1">
            <h3 className="text-lg md:text-xl font-serif font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
              {item.title}
            </h3>
          </div>
          <Gift className="w-6 h-6 flex-shrink-0 ml-2" style={{ color: accentColor }} />
        </div>

        <div className="wishlist-card-buttons mt-auto flex flex-col sm:flex-row gap-2 md:gap-3 items-stretch sm:items-center min-w-0">
          {hasLink && (
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              title="Посмотреть"
              aria-label="Посмотреть"
              className="wishlist-view-link flex items-center justify-center gap-2 flex-1 px-4 py-2 rounded-lg text-sm transition-all hover:shadow-md"
              style={{
                backgroundColor: 'var(--color-cream-light)',
                color: 'var(--color-text)',
                borderWidth: '1px',
                borderColor: 'var(--color-border)'
              }}
            >
              <ExternalLink className="w-4 h-4 flex-shrink-0" />
              <span className="wishlist-view-link-text">Посмотреть</span>
            </a>
          )}

          <button
            onClick={() => canReserveOrUnreserve && handleReserve(item)}
            disabled={isProcessing || !canReserveOrUnreserve}
            className={`flex items-center justify-center gap-2 px-5 md:px-6 py-3 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 ${!canReserveOrUnreserve ? 'cursor-not-allowed' : ''} ${hasLink ? 'sm:w-auto' : 'w-full'}`}
            style={getButtonStyle()}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Обработка...</span>
              </>
            ) : isReservedByMe ? (
              <>
                <Check className="w-5 h-5" />
                <span>Забронировано вами</span>
              </>
            ) : isReservedByOther ? (
              <>
                <Check className="w-5 h-5 opacity-70" />
                <span>Забронировано</span>
              </>
            ) : (
              <>
                <Heart className="w-5 h-5" />
                <span>Забронировать</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  });
  
  WishlistCard.displayName = 'WishlistCard';

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

      {/* Enhanced Decorative Side Images - 2 фото (вино/стол); скрыты на 1024/1440, чтобы не заходить на блоки */}
      <div className="hidden [@media(min-width:1536px)_and_(min-height:1024px)]:block fixed top-[20%] w-56 z-10" style={{ left: 'max(1rem, calc((100vw - 80rem) / 8))' }}>
        <motion.div
          initial={{ opacity: 0, x: -30, rotate: -5 }}
          animate={{ opacity: 0.25, x: 0, rotate: -3 }}
          transition={{ duration: 0.6 }}
          className="rounded-3xl overflow-hidden shadow-2xl transform hover:scale-105 transition-transform duration-300"
          style={{ border: '4px solid white' }}
        >
          <ImageWithFallback
            src={wishlistPhotoUrls[PHOTO_PATHS.wishlist[0]] ?? ''}
            alt="Вино"
            className="w-full h-80 object-cover"
          />
        </motion.div>
      </div>

      <div className="hidden [@media(min-width:1536px)_and_(min-height:1024px)]:block fixed bottom-[34%] w-56 z-10" style={{ right: 'max(1rem, calc((100vw - 80rem) / 8))' }}>
        <motion.div
          initial={{ opacity: 0, x: 30, rotate: 5 }}
          animate={{ opacity: 0.25, x: 0, rotate: 3 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="rounded-3xl overflow-hidden shadow-2xl transform hover:scale-105 transition-transform duration-300"
          style={{ border: '4px solid white' }}
        >
          <ImageWithFallback
            src={wishlistPhotoUrls[PHOTO_PATHS.wishlist[1]] ?? ''}
            alt="Стол"
            className="w-full h-80 object-cover"
          />
        </motion.div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-6 lg:px-8 py-8 md:py-10 lg:py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 md:mb-10 lg:mb-12"
        >
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif gradient-text mb-4">
            Список пожеланий
          </h1>
          <p className="text-base md:text-lg" style={{ color: 'var(--color-text-light)' }}>
            Мы будем рады, если вы поможете нам начать нашу совместную жизнь
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 lg:gap-12">
          {/* Bride's Wishlist */}
          <motion.section
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="mb-5 md:mb-6 text-center md:text-left lg:text-left">
              <div className="inline-flex items-center gap-3 px-5 md:px-6 py-3 rounded-full mb-3 md:mb-4"
                   style={{ background: 'linear-gradient(135deg, rgba(184, 162, 200, 0.2), rgba(184, 162, 200, 0.1))' }}>
                <Heart className="w-5 h-5" style={{ color: 'var(--color-lilac)' }} fill="var(--color-lilac)" />
                <h2 className="text-xl md:text-2xl font-serif font-semibold" style={{ color: 'var(--color-text)' }}>
                  Пожелания невесты
                </h2>
              </div>
            </div>

            <div className="space-y-3 md:space-y-4">
              {brideItems.length > 0 ? (
                brideItems.map((item) => (
                  <WishlistCard
                    key={item.wishlist_uuid}
                    item={item}
                    accentColor="var(--color-lilac)"
                    isInitialLoad={isInitialLoad}
                    currentUserUuid={currentUserUuid}
                  />
                ))
              ) : (
                <div className="elegant-card p-6 md:p-8 text-center">
                  <p style={{ color: 'var(--color-text-lighter)' }}>Пока нет пожеланий</p>
                </div>
              )}
            </div>
          </motion.section>

          {/* Groom's Wishlist */}
          <motion.section
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="mb-5 md:mb-6 text-center md:text-left lg:text-left">
              <div className="inline-flex items-center gap-3 px-5 md:px-6 py-3 rounded-full mb-3 md:mb-4"
                   style={{ background: 'linear-gradient(135deg, rgba(144, 198, 149, 0.2), rgba(144, 198, 149, 0.1))' }}>
                <Heart className="w-5 h-5" style={{ color: 'var(--color-green)' }} fill="var(--color-green)" />
                <h2 className="text-xl md:text-2xl font-serif font-semibold" style={{ color: 'var(--color-text)' }}>
                  Пожелания жениха
                </h2>
              </div>
            </div>

            <div className="space-y-3 md:space-y-4">
              {groomItems.length > 0 ? (
                groomItems.map((item) => (
                  <WishlistCard
                    key={item.wishlist_uuid}
                    item={item}
                    accentColor="var(--color-green)"
                    isInitialLoad={isInitialLoad}
                    currentUserUuid={currentUserUuid}
                  />
                ))
              ) : (
                <div className="elegant-card p-6 md:p-8 text-center">
                  <p style={{ color: 'var(--color-text-lighter)' }}>Пока нет пожеланий</p>
                </div>
              )}
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
};
