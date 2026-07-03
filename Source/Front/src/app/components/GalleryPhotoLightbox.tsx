import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react';

interface PhotoDims {
  width: number;
  height: number;
}

interface GalleryPhotoLightboxProps {
  paths: string[];
  currentIndex: number;
  getThumbSrc: (path: string) => string | undefined;
  getFullSrc: (path: string) => string | undefined;
  getPhotoDimensions?: (path: string) => PhotoDims | undefined;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onDownload: (path: string) => void;
}

const SWIPE_THRESHOLD = 48;
const PRELOAD_RADIUS = 3;
const FADE_MS = 0.22;

const fadeTransition = { duration: FADE_MS, ease: 'easeInOut' as const };

const preloadCache = new Map<string, Promise<PhotoDims | null>>();

function preloadImage(url: string): Promise<PhotoDims | null> {
  const cached = preloadCache.get(url);
  if (cached) return cached;

  const promise = new Promise<PhotoDims | null>((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () =>
      resolve(
        img.naturalWidth > 0
          ? { width: img.naturalWidth, height: img.naturalHeight }
          : null,
      );
    img.onerror = () => resolve(null);
    img.src = url;
  });

  preloadCache.set(url, promise);
  return promise;
}

async function preloadPhoto(
  photoPath: string,
  getThumbSrc: (path: string) => string | undefined,
  getFullSrc: (path: string) => string | undefined,
): Promise<PhotoDims | null> {
  const full = getFullSrc(photoPath);
  const thumb = getThumbSrc(photoPath);
  const primary = full || thumb;
  if (!primary) return null;

  const dims = await preloadImage(primary);
  if (full && thumb && full !== thumb) {
    await preloadImage(full);
  }
  return dims;
}

function LightboxPhoto({
  thumbSrc,
  fullSrc,
  needsUpgrade,
  fullReady,
  alt,
}: {
  thumbSrc?: string;
  fullSrc?: string;
  needsUpgrade: boolean;
  fullReady: boolean;
  alt: string;
}) {
  const imageClass =
    'max-h-[calc(100dvh-8rem)] max-w-[min(92rem,calc(100vw-8rem))] w-auto h-auto object-contain rounded-lg md:rounded-2xl shadow-2xl select-none';

  if (!needsUpgrade) {
    return (
      <img
        src={fullSrc || thumbSrc}
        alt={alt}
        className={imageClass}
        draggable={false}
      />
    );
  }

  return (
    <>
      {thumbSrc && (
        <img
          src={thumbSrc}
          alt={alt}
          className={`${imageClass} absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-200 ${
            fullReady ? 'opacity-0' : 'opacity-100'
          }`}
          draggable={false}
        />
      )}
      <img
        src={fullSrc || thumbSrc}
        alt={alt}
        className={`${imageClass} absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-200 ${
          fullReady ? 'opacity-100' : 'opacity-0'
        }`}
        draggable={false}
      />
    </>
  );
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
  const needsUpgrade = Boolean(fullSrc && thumbSrc && fullSrc !== thumbSrc);

  const [fullReady, setFullReady] = useState(!needsUpgrade);
  const touchStartX = useRef<number | null>(null);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < paths.length - 1;

  const warmPhoto = useCallback(
    (photoPath: string) => {
      void preloadPhoto(photoPath, getThumbSrc, getFullSrc);
    },
    [getThumbSrc, getFullSrc],
  );

  const navigateTo = useCallback(
    (index: number) => {
      if (index === currentIndex || index < 0 || index >= paths.length) return;
      warmPhoto(paths[index]);
      onNavigate(index);
    },
    [currentIndex, paths, onNavigate, warmPhoto],
  );

  const goPrev = useCallback(() => {
    if (!hasPrev) return;
    navigateTo(currentIndex - 1);
  }, [hasPrev, currentIndex, navigateTo]);

  const goNext = useCallback(() => {
    if (!hasNext) return;
    navigateTo(currentIndex + 1);
  }, [hasNext, currentIndex, navigateTo]);

  useLayoutEffect(() => {
    if (!path) {
      setFullReady(false);
      return;
    }
    if (!needsUpgrade || !fullSrc) {
      setFullReady(true);
      return;
    }

    const probe = new Image();
    probe.src = fullSrc;
    setFullReady(probe.complete);
  }, [path, fullSrc, needsUpgrade]);

  useEffect(() => {
    if (!path || !needsUpgrade || !fullSrc) return;

    const probe = new Image();
    probe.src = fullSrc;
    if (probe.complete) return;

    let cancelled = false;
    preloadImage(fullSrc).then(() => {
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
    const offsets = Array.from({ length: PRELOAD_RADIUS * 2 + 1 }, (_, i) => i - PRELOAD_RADIUS);
    for (const offset of offsets) {
      const index = currentIndex + offset;
      if (index < 0 || index >= paths.length) continue;
      warmPhoto(paths[index]);
    }
  }, [currentIndex, paths, warmPhoto]);

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

  if (!path || (!thumbSrc && !fullSrc)) return null;

  const navBtnClass =
    'absolute top-1/2 -translate-y-1/2 z-10 p-2 md:p-3 rounded-full transition-all disabled:opacity-25 disabled:pointer-events-none';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: FADE_MS }}
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
        className="relative flex-1 min-h-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 flex items-center justify-center px-12 md:px-16 py-4 md:py-6">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={path}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={fadeTransition}
              className="relative flex w-full h-full items-center justify-center"
            >
              <LightboxPhoto
                thumbSrc={thumbSrc}
                fullSrc={fullSrc}
                needsUpgrade={needsUpgrade}
                fullReady={fullReady}
                alt={`Фото ${currentIndex + 1}`}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        <button
          type="button"
          onClick={goPrev}
          disabled={!hasPrev}
          className={`${navBtnClass} left-1 md:left-3 hover:bg-white/10 text-white`}
          aria-label="Предыдущее фото"
        >
          <ChevronLeft className="w-7 h-7 md:w-8 md:h-8" />
        </button>

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
  );
};
