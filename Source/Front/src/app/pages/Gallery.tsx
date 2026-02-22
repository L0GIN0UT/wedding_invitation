import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X as XIcon, Image as ImageIcon, Loader2, Camera, Video } from 'lucide-react';
import { Navigation } from '../components/Navigation';
import { GalleryVideoBlock } from '../components/GalleryVideoBlock';
import Masonry, { ResponsiveMasonry } from 'react-responsive-masonry';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { galleryAPI } from '../api/apiAdapter';

const FOLDER_PHOTOS = 'wedding_day_all_photos';
/** Фиксированные пути к видео в папке wedding_day_video/ */
const VIDEO_PATH_BEST_MOMENTS = 'wedding_day_video/wedding_best_moments.mp4';
const VIDEO_PATH_MAIN = 'wedding_day_video/wedding_video.mp4';

export const Gallery: React.FC = () => {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [photoPaths, setPhotoPaths] = useState<string[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [bestMomentsStreamUrl, setBestMomentsStreamUrl] = useState<string | null>(null);
  const [bestMomentsDownloadUrl, setBestMomentsDownloadUrl] = useState<string | null>(null);
  const [bestMomentsArchiveUrl, setBestMomentsArchiveUrl] = useState<string | null>(null);
  const [videoStreamUrl, setVideoStreamUrl] = useState<string | null>(null);
  const [videoDownloadUrl, setVideoDownloadUrl] = useState<string | null>(null);
  const [videoArchiveUrl, setVideoArchiveUrl] = useState<string | null>(null);
  const [photoArchiveUrl, setPhotoArchiveUrl] = useState<string | null>(null);
  const [contentEnabled, setContentEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMessage('');
    (async () => {
      try {
        const status = await galleryAPI.getStatus();
        if (cancelled) return;
        if (!status.content_enabled) {
          setContentEnabled(false);
          setLoading(false);
          return;
        }
        setContentEnabled(true);

        const [photoList, bestStream, bestDownload, mainStream, mainDownload, photoArchive, videoArchive, bestArchive] = await Promise.all([
          galleryAPI.listFiles(FOLDER_PHOTOS),
          galleryAPI.getStreamUrl(VIDEO_PATH_BEST_MOMENTS).then((r) => r.url).catch(() => null),
          galleryAPI.getDownloadUrl(VIDEO_PATH_BEST_MOMENTS).then((r) => r.url).catch(() => null),
          galleryAPI.getStreamUrl(VIDEO_PATH_MAIN).then((r) => r.url).catch(() => null),
          galleryAPI.getDownloadUrl(VIDEO_PATH_MAIN).then((r) => r.url).catch(() => null),
          galleryAPI.getArchiveUrl('wedding_day_all_photos').then((r) => r.url),
          galleryAPI.getArchiveUrl('wedding_day_video').then((r) => r.url),
          galleryAPI.getArchiveUrl('wedding_best_moments').then((r) => r.url).catch(() => null),
        ]);
        if (cancelled) return;

        setBestMomentsStreamUrl(bestStream);
        setBestMomentsDownloadUrl(bestDownload);
        setBestMomentsArchiveUrl(bestArchive);
        setVideoStreamUrl(mainStream);
        setVideoDownloadUrl(mainDownload);
        setVideoArchiveUrl(videoArchive);
        setPhotoArchiveUrl(photoArchive);

        const paths = photoList.paths || [];
        if (paths.length > 0) {
          const urls = await Promise.all(paths.map((p) => galleryAPI.getStreamUrl(p))).then((r) => r.map((x) => x.url));
          if (!cancelled) {
            setPhotoPaths(paths);
            setPhotoUrls(urls);
          }
        }
      } catch (e) {
        if (!cancelled) setMessage(e instanceof Error ? e.message : 'Ошибка загрузки галереи');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const downloadPhoto = async (index: number) => {
    const path = photoPaths[index];
    if (!path) return;
    try {
      const { url } = await galleryAPI.getDownloadUrl(path);
      const link = document.createElement('a');
      link.href = url;
      link.download = path.split('/').pop() || `wedding-photo-${index + 1}.jpg`;
      link.click();
    } catch {
      setMessage('Не удалось получить ссылку на скачивание');
    }
  };

  const downloadPhotoArchive = () => {
    if (photoArchiveUrl) {
      const link = document.createElement('a');
      link.href = photoArchiveUrl;
      link.download = 'wedding-photos-archive.zip';
      link.click();
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-cream)' }}>
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {message && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-700 text-center">
            {message}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif gradient-text">
            Галерея
          </h1>
        </motion.div>

        {contentEnabled === null ? (
          /* Пока не знаем статус — минимальный лоадер, без скелетона */
          <div className="flex justify-center items-center py-16">
            <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--color-lilac)' }} />
          </div>
        ) : contentEnabled === false ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto"
          >
            <div className="elegant-card elegant-card-no-hover p-8 md:p-12 text-center">
              <div className="flex justify-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'var(--gradient-main)' }}>
                  <Camera className="w-7 h-7 text-white" />
                </div>
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'var(--gradient-main)' }}>
                  <Video className="w-7 h-7 text-white" />
                </div>
              </div>
              <h2 className="text-xl md:text-2xl font-serif font-semibold mb-4 gradient-text">
                Скоро здесь будет галерея
              </h2>
              <p className="text-base md:text-lg leading-relaxed" style={{ color: 'var(--color-text-light)' }}>
                Все видео и фотографии со свадьбы будут доступны в скором времени после окончания мероприятия.
              </p>
              <p className="mt-4 text-sm" style={{ color: 'var(--color-text-lighter)' }}>
                Следите за обновлениями — мы обязательно поделимся лучшими моментами нашего дня.
              </p>
            </div>
          </motion.div>
        ) : loading ? (
          <>
            {/* Скелетоны с фиксированной высотой — верстка не съезжает */}
            <div className="mb-16">
              <div className="elegant-card elegant-card-no-hover p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full animate-pulse" style={{ background: 'var(--color-cream-light)' }} />
                  <div className="h-8 w-48 rounded-lg animate-pulse" style={{ background: 'var(--color-cream-light)' }} />
                </div>
                <div className="rounded-2xl overflow-hidden aspect-video flex items-center justify-center animate-pulse" style={{ background: 'var(--color-cream-light)', minHeight: 280 }}>
                  <Loader2 className="w-12 h-12 animate-spin opacity-50" style={{ color: 'var(--color-lilac)' }} />
                </div>
                <div className="flex gap-3 mt-4">
                  <div className="flex-1 h-12 rounded-xl animate-pulse" style={{ background: 'var(--color-cream-light)' }} />
                  <div className="flex-1 h-12 rounded-lg animate-pulse" style={{ background: 'var(--color-cream-light)' }} />
                </div>
              </div>
            </div>
            <div className="mb-16">
              <div className="elegant-card elegant-card-no-hover p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full animate-pulse" style={{ background: 'var(--color-cream-light)' }} />
                  <div className="h-8 w-56 rounded-lg animate-pulse" style={{ background: 'var(--color-cream-light)' }} />
                </div>
                <div className="rounded-2xl overflow-hidden aspect-video flex items-center justify-center animate-pulse" style={{ background: 'var(--color-cream-light)', minHeight: 280 }}>
                  <Loader2 className="w-12 h-12 animate-spin opacity-50" style={{ color: 'var(--color-lilac)' }} />
                </div>
                <div className="flex gap-3 mt-4">
                  <div className="flex-1 h-12 rounded-xl animate-pulse" style={{ background: 'var(--color-cream-light)' }} />
                  <div className="flex-1 h-12 rounded-lg animate-pulse" style={{ background: 'var(--color-cream-light)' }} />
                </div>
              </div>
            </div>
            <div className="mb-8">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full animate-pulse" style={{ background: 'var(--color-cream-light)' }} />
                  <div className="h-8 w-40 rounded-lg animate-pulse" style={{ background: 'var(--color-cream-light)' }} />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="aspect-[4/3] rounded-2xl animate-pulse" style={{ background: 'var(--color-cream-light)' }} />
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
        {/* Лучшие моменты — первым блоком */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-16"
        >
          <GalleryVideoBlock
            title="Лучшие моменты"
            streamUrl={bestMomentsStreamUrl}
            downloadUrl={bestMomentsDownloadUrl}
            archiveUrl={bestMomentsArchiveUrl}
            downloadFileName="wedding_best_moments.mp4"
            archiveDownloadFileName="wedding_best_moments.zip"
            archiveLabel="Скачать архив с лучшими моментами"
          />
        </motion.section>

        {/* Видео со свадьбы */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-16"
        >
          <GalleryVideoBlock
            title="Видео со свадьбы"
            streamUrl={videoStreamUrl}
            downloadUrl={videoDownloadUrl}
            archiveUrl={videoArchiveUrl}
            downloadFileName="wedding_video.mp4"
            archiveDownloadFileName="wedding-video-archive.zip"
            archiveLabel="Скачать архив с видео"
          />
        </motion.section>

        {/* Photos Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--gradient-main)' }}
                >
                  <ImageIcon className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl md:text-3xl font-serif font-semibold" style={{ color: 'var(--color-text)' }}>
                  Фотографии
                </h2>
              </div>
              {photoArchiveUrl && (
                <button
                  onClick={downloadPhotoArchive}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-all hover:shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #d4af37, #f4e4a6)' }}
                >
                  <Download className="w-5 h-5" />
                  <span>Скачать архив ({photoUrls.length} фото)</span>
                </button>
              )}
            </div>

            {photoUrls.length > 0 ? (
              <ResponsiveMasonry columnsCountBreakPoints={{ 350: 1, 750: 2, 900: 3, 1200: 4 }}>
                <Masonry gutter="16px">
                  {photoUrls.map((photo, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.05 }}
                      className="relative group cursor-pointer overflow-hidden rounded-2xl shadow-lg"
                      onClick={() => setSelectedPhoto(photo)}
                    >
                      <ImageWithFallback
                        src={photo}
                        alt={`Фото ${index + 1}`}
                        className="w-full h-auto transition-transform duration-300 group-hover:scale-110"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadPhoto(index);
                          }}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          <span className="text-sm font-medium">Скачать</span>
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </Masonry>
              </ResponsiveMasonry>
            ) : (
              <p className="text-center py-8" style={{ color: 'var(--color-text-light)' }}>
                Фотографии пока нет в галерее
              </p>
            )}
          </div>
        </motion.section>
          </>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
            onClick={() => setSelectedPhoto(null)}
          >
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <XIcon className="w-6 h-6" />
            </button>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              className="relative max-w-5xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedPhoto}
                alt="Выбрано"
                className="w-full h-auto rounded-2xl shadow-2xl"
              />
              <button
                onClick={() => {
                  const index = photoUrls.indexOf(selectedPhoto);
                  if (index >= 0) downloadPhoto(index);
                }}
                className="absolute bottom-4 right-4 flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-all hover:shadow-lg"
                style={{ background: 'var(--gradient-main)' }}
              >
                <Download className="w-5 h-5" />
                <span>Скачать</span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
