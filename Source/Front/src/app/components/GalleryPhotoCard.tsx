import React, { useState } from 'react';
import { Download } from 'lucide-react';

interface GalleryPhotoCardProps {
  src?: string;
  alt: string;
  priority?: boolean;
  onOpen: () => void;
  onDownload: () => void;
}

export const GalleryPhotoCard: React.FC<GalleryPhotoCardProps> = ({
  src,
  alt,
  priority = false,
  onOpen,
  onDownload,
}) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className="relative group cursor-pointer overflow-hidden rounded-2xl shadow-lg bg-[var(--color-cream-light)] min-h-[200px]"
      onClick={onOpen}
    >
      <div
        className={`absolute inset-0 transition-opacity duration-500 ${
          loaded ? 'opacity-0 pointer-events-none' : 'opacity-100 animate-pulse'
        }`}
        style={{ background: 'linear-gradient(135deg, rgba(184, 162, 200, 0.12), rgba(144, 198, 149, 0.08))' }}
        aria-hidden
      />
      {src && (
        <img
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={() => setLoaded(true)}
          className={`w-full h-auto block transition-all duration-500 group-hover:scale-105 ${
            loaded ? 'opacity-100' : 'opacity-0'
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
