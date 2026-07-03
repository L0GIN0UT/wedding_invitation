import React, { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';

interface GalleryPhotoCardProps {
  thumbSrc?: string;
  alt: string;
  canLoad?: boolean;
  rootRef?: React.Ref<HTMLDivElement>;
  onDownload: () => void;
  onOpen?: () => void;
  onPrefetchFull?: () => void;
  onImageLoad?: (height: number) => void;
}

const LAZY_ROOT_MARGIN = '800px';

export const GalleryPhotoCard: React.FC<GalleryPhotoCardProps> = ({
  thumbSrc,
  alt,
  canLoad = false,
  rootRef,
  onDownload,
  onOpen,
  onPrefetchFull,
  onImageLoad,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const setRootRef = (node: HTMLDivElement | null) => {
    containerRef.current = node;
    if (typeof rootRef === 'function') rootRef(node);
    else if (rootRef) (rootRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
  };
  const [shouldLoad, setShouldLoad] = useState(canLoad);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (canLoad) setShouldLoad(true);
  }, [canLoad]);

  useEffect(() => {
    if (canLoad || shouldLoad) return;
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: LAZY_ROOT_MARGIN },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [canLoad, shouldLoad]);

  return (
    <div
      ref={setRootRef}
      className={`relative group overflow-hidden rounded-lg md:rounded-2xl shadow-md md:shadow-lg min-h-[72px] md:min-h-[200px] ${
        onOpen ? 'cursor-pointer' : ''
      }`}
      style={{ background: 'linear-gradient(135deg, rgba(184, 162, 200, 0.18), rgba(144, 198, 149, 0.12))' }}
      onClick={() => onOpen?.()}
      onMouseEnter={() => onPrefetchFull?.()}
      onFocus={() => onPrefetchFull?.()}
    >
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${
          loaded ? 'opacity-0 pointer-events-none' : 'opacity-100 animate-pulse'
        }`}
        style={{ background: 'linear-gradient(135deg, rgba(184, 162, 200, 0.12), rgba(144, 198, 149, 0.08))' }}
        aria-hidden
      />
      {shouldLoad && thumbSrc && (
        <img
          src={thumbSrc}
          alt={alt}
          loading={canLoad ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={canLoad ? 'high' : 'auto'}
          onLoad={(e) => {
            setLoaded(true);
            onImageLoad?.(e.currentTarget.offsetHeight);
          }}
          className={`w-full h-auto block transition-all duration-300 group-hover:scale-105 ${
            loaded ? 'opacity-100 blur-0' : 'opacity-90 blur-sm scale-[1.02]'
          }`}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden md:flex items-end p-4">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDownload();
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span className="text-sm font-medium">Скачать</span>
        </button>
      </div>
    </div>
  );
};
