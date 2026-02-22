import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Download, Play, Pause, Volume2, VolumeX, Maximize, Video } from 'lucide-react';

const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export interface GalleryVideoBlockProps {
  title: string;
  streamUrl: string | null;
  downloadUrl: string | null;
  archiveUrl: string | null;
  downloadFileName: string;
  archiveDownloadFileName: string;
  archiveLabel: string;
}

export const GalleryVideoBlock: React.FC<GalleryVideoBlockProps> = ({
  title,
  streamUrl,
  downloadUrl,
  archiveUrl,
  downloadFileName,
  archiveDownloadFileName,
  archiveLabel,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoHover, setVideoHover] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (streamUrl) {
      setCurrentTime(0);
      setDuration(0);
    }
  }, [streamUrl]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    if (videoRef.current && Number.isFinite(t)) {
      videoRef.current.currentTime = t;
      setCurrentTime(t);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (videoRef.current && Number.isFinite(v)) {
      videoRef.current.volume = v;
      videoRef.current.muted = v === 0;
      setVolume(v);
      setIsMuted(v === 0);
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) document.exitFullscreen();
      else videoRef.current.requestFullscreen();
    }
  };

  const downloadVideo = () => {
    if (downloadUrl) {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = downloadFileName;
      link.click();
    }
  };

  return (
    <div className="elegant-card elegant-card-no-hover p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ background: 'var(--gradient-main)' }}
        >
          <Video className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-2xl md:text-3xl font-serif font-semibold" style={{ color: 'var(--color-text)' }}>
          {title}
        </h2>
      </div>

      {streamUrl ? (
        <>
          <div
            className="relative rounded-2xl overflow-hidden shadow-2xl mb-6 group/video"
            style={{ backgroundColor: '#000' }}
            onMouseEnter={() => setVideoHover(true)}
            onMouseLeave={() => setVideoHover(false)}
          >
            <video
              ref={videoRef}
              className="w-full aspect-video cursor-pointer"
              src={streamUrl}
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)}
              onLoadedMetadata={() => videoRef.current && setDuration(videoRef.current.duration)}
              onDurationChange={() => videoRef.current && setDuration(videoRef.current.duration)}
            />
            {!isPlaying && (
              <div
                className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                aria-hidden
              >
                <div className="w-20 h-20 rounded-full bg-white/30 flex items-center justify-center backdrop-blur-sm">
                  <Play className="w-10 h-10 text-white ml-1" fill="currentColor" />
                </div>
              </div>
            )}
            {isPlaying && videoHover && (
              <div
                className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none"
                aria-hidden
              >
                <div className="w-20 h-20 rounded-full bg-white/30 flex items-center justify-center backdrop-blur-sm pointer-events-none">
                  <Pause className="w-10 h-10 text-white" />
                </div>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 md:p-3 flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 min-w-0 h-2 rounded-full cursor-pointer accent-white [color-scheme:dark]"
              />
              <span className="text-white text-xs font-medium tabular-nums shrink-0 whitespace-nowrap">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-sm shrink-0"
                title={isMuted ? 'Включить звук' : 'Выключить звук'}
              >
                {isMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                onClick={(e) => e.stopPropagation()}
                className="w-16 md:w-20 h-2 rounded-full cursor-pointer accent-white [color-scheme:dark] shrink-0"
                title="Громкость"
              />
              <button
                onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-sm shrink-0"
                title="Полный экран"
              >
                <Maximize className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {downloadUrl && (
              <button
                onClick={downloadVideo}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-all hover:shadow-lg"
                style={{ background: 'var(--gradient-main)' }}
              >
                <Download className="w-5 h-5" />
                <span>Скачать видео</span>
              </button>
            )}
            {archiveUrl && (
              <a
                href={archiveUrl}
                download={archiveDownloadFileName}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-md"
                style={{
                  backgroundColor: 'var(--color-cream-light)',
                  color: 'var(--color-text)',
                  borderWidth: '1px',
                  borderColor: 'var(--color-border)',
                }}
              >
                <Download className="w-5 h-5" />
                <span>{archiveLabel}</span>
              </a>
            )}
          </div>
        </>
      ) : (
        <p className="text-center py-8" style={{ color: 'var(--color-text-light)' }}>
          Видео пока нет в галерее
        </p>
      )}
    </div>
  );
};
