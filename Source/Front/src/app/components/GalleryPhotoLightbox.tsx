import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react';

interface GalleryPhotoLightboxProps {
  paths: string[];
  currentIndex: number;
  getThumbSrc: (path: string) => string | undefined;
  getFullSrc: (path: string) => string | undefined;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onDownload: (path: string) => void;
}

const SWIPE_THRESHOLD = 48;
const IMAGE_CLASS =
  'max-h-full max-w-full w-auto h-auto object-contain rounded-lg md:rounded-2xl shadow-2xl select-none';

function preloadUrl(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });
}

export const GalleryPhotoLightbox: React.FC<GalleryPhotoLightboxProps> = ({
  paths,
  currentIndex,
  getThumbSrc,
  getFullSrc,
  onClose,
  onNavigate,
  onDownload,
}) => {
  const path = paths[currentIndex];
  const thumbSrc = path ? getThumbSrc(path) : undefined;
  const fullSrc = path ? getFullSrc(path) : undefined;
  const displaySrc = thumbSrc || fullSrc;
  const needsUpgrade = Boolean(fullSrc && thumbSrc && fullSrc !== thumbSrc);

  const [fullReady, setFullReady] = useState(!needsUpgrade);
  const touchStartX = useRef<number | null>(null);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < paths.length - 1;

  const goPrev = useCallback(() => {
    if (hasPrev) onNavigate(currentIndex - 1);
  }, [hasPrev, currentIndex, onNavigate]);

  const goNext = useCallback(() => {
    if (hasNext) onNavigate(currentIndex + 1);
  }, [hasNext, currentIndex, onNavigate]);

  useEffect(() => {
    if (!path || !fullSrc) {
      setFullReady(false);
      return;
    }
    if (!needsUpgrade) {
      setFullReady(true);
      return;
    }

    let cancelled = false;
    setFullReady(false);
    preloadUrl(fullSrc).then(() => {
      if (!cancelled) setFullReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [path, fullSrc, needsUpgrade]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, goPrev, goNext]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const neighbors = [paths[currentIndex - 1], paths[currentIndex + 1]].filter(Boolean) as string[];
    for (const neighbor of neighbors) {
      const url = getFullSrc(neighbor);
      if (url) void preloadUrl(url);
    }
  }, [currentIndex, paths, getFullSrc]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartX.current;
    if (start === null) return;
    const end = e.changedTouches[0]?.clientX ?? start;
    const delta = end - start;
    if (delta > SWIPE_THRESHOLD) goPrev();
    else if (delta < -SWIPE_THRESHOLD) goNext();
    touchStartX.current = null;
  };

  if (!path || !displaySrc) return null;

  const navBtnClass =
    'absolute top-1/2 -translate-y-1/2 z-10 p-2 md:p-3 rounded-full transition-all disabled:opacity-25 disabled:pointer-events-none';

  return (
    <AnimatePresence>
      <motion.div
        key="lightbox"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col"
        style={{ backgroundColor: 'rgba(26, 22, 30, 0.92)' }}
        onClick={onClose}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="flex items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-4 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="font-serif text-sm md:text-base text-white/80 tabular-nums">
            {currentIndex + 1}
            <span className="text-white/40 mx-1">/</span>
            {paths.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onDownload(path)}
              className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 rounded-xl text-white text-sm font-medium transition-all hover:shadow-lg"
              style={{ background: 'var(--gradient-main)' }}
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Скачать</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 md:p-2.5 rounded-full text-white/90 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Закрыть"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div
          className="relative flex-1 flex items-center justify-center min-h-0 px-12 md:px-16 py-4 md:py-6"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={goPrev}
            disabled={!hasPrev}
            className={`${navBtnClass} left-1 md:left-3 hover:bg-white/10 text-white`}
            aria-label="Предыдущее фото"
          >
            <ChevronLeft className="w-7 h-7 md:w-8 md:h-8" />
          </button>

          <motion.div
            key={path}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.18 }}
            className="relative flex items-center justify-center h-full w-full max-w-[min(100%,92rem)]"
          >
            <img
              src={displaySrc}
              alt={`Фото ${currentIndex + 1}`}
              className={`${IMAGE_CLASS} transition-all duration-300 ${
                needsUpgrade && !fullReady ? 'blur-[2px] brightness-90' : 'blur-0 brightness-100'
              }`}
              draggable={false}
            />
            {needsUpgrade && fullSrc && (
              <img
                src={fullSrc}
                alt=""
                aria-hidden
                className={`${IMAGE_CLASS} absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300 ${
                  fullReady ? 'opacity-100' : 'opacity-0'
                }`}
                draggable={false}
              />
            )}
          </motion.div>

          <button
            type="button"
            onClick={goNext}
            disabled={!hasNext}
            className={`${navBtnClass} right-1 md:right-3 hover:bg-white/10 text-white`}
            aria-label="Следующее фото"
          >
            <ChevronRight className="w-7 h-7 md:w-8 md:h-8" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
