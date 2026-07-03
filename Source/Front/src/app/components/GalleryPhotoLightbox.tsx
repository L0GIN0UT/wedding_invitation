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
const FADE_MS = 0.2;

const IMAGE_FILL_CLASS =
  'absolute inset-0 w-full h-full object-contain rounded-lg md:rounded-2xl shadow-2xl select-none';

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

function PhotoFrame({
  dims,
  children,
}: {
  dims?: PhotoDims;
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative max-h-full max-w-full"
      style={
        dims
          ? { aspectRatio: `${dims.width} / ${dims.height}` }
          : { width: 'min(80vw, 42rem)', aspectRatio: '3 / 2' }
      }
    >
      <div className="absolute inset-0">{children}</div>
    </div>
  );
}

export const GalleryPhotoLightbox: React.FC<GalleryPhotoLightboxProps> = ({
  paths,
  currentIndex,
  getThumbSrc,
  getFullSrc,
  getPhotoDimensions,
  onClose,
  onNavigate,
  onDownload,
}) => {
  const path = paths[currentIndex];
  const thumbSrc = path ? getThumbSrc(path) : undefined;
  const fullSrc = path ? getFullSrc(path) : undefined;
  const needsUpgrade = Boolean(fullSrc && thumbSrc && fullSrc !== thumbSrc);

  const [fullReady, setFullReady] = useState(!needsUpgrade);
  const [dimsByPath, setDimsByPath] = useState<Record<string, PhotoDims>>({});
  const [navigating, setNavigating] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const navigatingRef = useRef(false);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < paths.length - 1;

  const rememberDims = useCallback((photoPath: string, dims: PhotoDims | null) => {
    if (!dims) return;
    setDimsByPath((prev) =>
      prev[photoPath] ? prev : { ...prev, [photoPath]: dims },
    );
  }, []);

  const resolveDims = useCallback(
    (photoPath: string) =>
      dimsByPath[photoPath] ?? getPhotoDimensions?.(photoPath),
    [dimsByPath, getPhotoDimensions],
  );

  const navigateTo = useCallback(
    async (index: number) => {
      if (index === currentIndex || navigatingRef.current) return;
      if (index < 0 || index >= paths.length) return;

      navigatingRef.current = true;
      setNavigating(true);
      try {
        const dims = await preloadPhoto(paths[index], getThumbSrc, getFullSrc);
        rememberDims(paths[index], dims);
        onNavigate(index);
      } finally {
        navigatingRef.current = false;
        setNavigating(false);
      }
    },
    [currentIndex, paths, getThumbSrc, getFullSrc, onNavigate, rememberDims],
  );

  const goPrev = useCallback(() => {
    if (!hasPrev) return;
    void navigateTo(currentIndex - 1);
  }, [hasPrev, currentIndex, navigateTo]);

  const goNext = useCallback(() => {
    if (!hasNext) return;
    void navigateTo(currentIndex + 1);
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
    preloadImage(fullSrc).then((dims) => {
      if (cancelled) return;
      rememberDims(path, dims);
      setFullReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [path, fullSrc, needsUpgrade, rememberDims]);

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
      const photoPath = paths[index];
      void preloadPhoto(photoPath, getThumbSrc, getFullSrc).then((dims) =>
        rememberDims(photoPath, dims),
      );
    }
  }, [currentIndex, paths, getThumbSrc, getFullSrc, rememberDims]);

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

  const onThumbLoad = (photoPath: string, img: HTMLImageElement) => {
    if (img.naturalWidth > 0) {
      rememberDims(photoPath, {
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    }
  };

  if (!path || (!thumbSrc && !fullSrc)) return null;

  const dims = resolveDims(path);
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
        className="relative flex-1 flex items-center justify-center min-h-0 px-12 md:px-16 py-4 md:py-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={goPrev}
          disabled={!hasPrev || navigating}
          className={`${navBtnClass} left-1 md:left-3 hover:bg-white/10 text-white`}
          aria-label="Предыдущее фото"
        >
          <ChevronLeft className="w-7 h-7 md:w-8 md:h-8" />
        </button>

        <div className="relative flex items-center justify-center h-full w-full max-w-[min(100%,92rem)]">
          <AnimatePresence initial={false}>
            <motion.div
              key={path}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={fadeTransition}
              className="absolute inset-0 flex items-center justify-center"
            >
              <PhotoFrame dims={dims}>
                {needsUpgrade && thumbSrc && (
                  <img
                    src={thumbSrc}
                    alt={`Фото ${currentIndex + 1}`}
                    className={`${IMAGE_FILL_CLASS} transition-opacity duration-200 ${
                      fullReady ? 'opacity-0' : 'opacity-100'
                    }`}
                    draggable={false}
                    onLoad={(e) => onThumbLoad(path, e.currentTarget)}
                  />
                )}
                <img
                  src={fullSrc || thumbSrc}
                  alt={`Фото ${currentIndex + 1}`}
                  className={`${IMAGE_FILL_CLASS} transition-opacity duration-200 ${
                    needsUpgrade && !fullReady ? 'opacity-0' : 'opacity-100'
                  }`}
                  draggable={false}
                  onLoad={(e) => onThumbLoad(path, e.currentTarget)}
                />
              </PhotoFrame>
            </motion.div>
          </AnimatePresence>
        </div>

        <button
          type="button"
          onClick={goNext}
          disabled={!hasNext || navigating}
          className={`${navBtnClass} right-1 md:right-3 hover:bg-white/10 text-white`}
          aria-label="Следующее фото"
        >
          <ChevronRight className="w-7 h-7 md:w-8 md:h-8" />
        </button>
      </div>
    </motion.div>
  );
};
