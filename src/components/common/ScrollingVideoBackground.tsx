import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Settings, Video, Sliders, Check, Eye } from 'lucide-react';

export interface VideoSettings {
  videoUrl: string;
  overlayOpacity: number; // 0.1 to 0.8
  isPaused: boolean;
  isMuted: boolean;
  scrollSyncEnabled: boolean;
  blurLevel: number; // 0 to 8px
}

const PRESET_VIDEOS = [
  {
    name: 'Dairy Cows Grazing Pasture (Default HD)',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-cows-grazing-in-a-green-field-43029-large.mp4',
  },
  {
    name: 'Cattle Herd Farm Field',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-herds-of-cows-in-a-farm-43030-large.mp4',
  },
  {
    name: 'Green Farm Pasture Meadows',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-cows-in-a-pasture-43028-large.mp4',
  },
];

export const ScrollingVideoBackground: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [settings, setSettings] = useState<VideoSettings>({
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-cows-grazing-in-a-green-field-43029-large.mp4',
    overlayOpacity: 0.02,
    isPaused: false,
    isMuted: true,
    scrollSyncEnabled: true,
    blurLevel: 0,
  });

  const [customInputUrl, setCustomInputUrl] = useState('');

  // Handle Play/Pause
  useEffect(() => {
    if (videoRef.current) {
      if (settings.isPaused) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {
          // Fallback if browser auto-play restricts
        });
      }
    }
  }, [settings.isPaused, settings.videoUrl]);

  // Page Visibility Optimization
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!videoRef.current) return;
      if (document.hidden) {
        videoRef.current.pause();
      } else if (!settings.isPaused) {
        videoRef.current.play().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [settings.isPaused]);

  // Handle High-Performance Non-Blocking Scroll Sync Effect
  useEffect(() => {
    if (!settings.scrollSyncEnabled) return;

    let rafId: number | null = null;
    let isSeekingLocked = false;

    const handleScroll = () => {
      if (rafId !== null) return;

      rafId = requestAnimationFrame(() => {
        rafId = null;

        const video = videoRef.current;
        if (!video || !video.duration || video.seeking || isSeekingLocked) return;

        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (scrollHeight <= 0) return;

        const scrollFraction = Math.max(0, Math.min(1, window.scrollY / scrollHeight));
        const targetTime = scrollFraction * video.duration;

        // Only seek if time difference is substantial to avoid continuous decoder buffer flushes
        if (Math.abs(video.currentTime - targetTime) > 0.8) {
          isSeekingLocked = true;
          video.currentTime = targetTime;
          setTimeout(() => {
            isSeekingLocked = false;
          }, 150);
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [settings.scrollSyncEnabled]);

  const applyCustomUrl = () => {
    if (customInputUrl.trim()) {
      setSettings((prev) => ({ ...prev, videoUrl: customInputUrl.trim() }));
      setCustomInputUrl('');
    }
  };

  return (
    <>
      {/* Background Video Canvas Layer */}
      <div
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
        style={{ willChange: 'transform', transform: 'translate3d(0, 0, 0)' }}
      >
        {/* Video Element */}
        <video
          ref={videoRef}
          src={settings.videoUrl}
          autoPlay
          loop
          muted={settings.isMuted}
          playsInline
          className="w-full h-full object-cover transform scale-105 transition-all duration-700"
          style={{
            filter: `blur(${settings.blurLevel}px)`,
            willChange: 'transform',
            transform: 'translate3d(0, 0, 0)',
          }}
        />

        {/* Dynamic Translucent Overlay */}
        <div
          className="absolute inset-0 transition-opacity duration-300 bg-slate-950"
          style={{ opacity: settings.overlayOpacity }}
        />

        {/* Minimal Subtle Edge Vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/20 via-transparent to-slate-950/20 pointer-events-none" />
      </div>
    </>
  );
};
