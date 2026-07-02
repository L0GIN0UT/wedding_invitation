import React, { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';

interface GalleryPhotoCardProps {
  thumbSrc?: string;
  alt: string;
  priority?: boolean;
  onOpen: () => void;
  onDownload: () => void;
}

const LAZY_ROOT_MARGIN = '800px';

export const GalleryPhotoCard: React.FC<GalleryPhotoCardProps> = ({
  thumbSrc,
  alt,
  priority = false,
  onOpen,
  onDownload,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(priority);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (priority || shouldLoad) return;
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
  }, [priority, shouldLoad]);

  return (
    <div
      ref={containerRef}
      className="relative group cursor-pointer overflow-hidden rounded-2xl shadow-lg min-h-[200px]"
      style={{ background: 'linear-gradient(135deg, rgba(184, 162, 200, 0.18), rgba(144, 198, 149, 0.12))' }}
      onClick={onOpen}
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
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={() => setLoaded(true)}
          className={`w-full h-auto block transition-all duration-300 group-hover:scale-105 ${
            loaded ? 'opacity-100 blur-0' : 'opacity-90 blur-sm scale-[1.02]'
          }`}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
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
