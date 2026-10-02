import React, { useEffect, useRef, useState } from 'react';

export const ScrollAnimationBackground: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [useVideo, setUseVideo] = useState(true);

  // Scroll-scrubbed background video. The onError handler advances to the next entry,
  // so the local clip is an optional drop-in asset: place a real file at
  // public/videos/cattle_feed_scroll.mp4 to use it, otherwise the remote clips render.
  const feedVideoSources = [
    '/videos/cattle_feed_scroll.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-cows-grazing-in-a-green-field-43029-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-herds-of-cows-in-a-farm-43030-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-cows-in-a-pasture-43028-large.mp4',
  ];
  const [sourceIndex, setSourceIndex] = useState(0);

  // Handle video scroll scrubbing
  useEffect(() => {
    let animationFrameId: number;

    const handleScroll = () => {
      if (useVideo && videoRef.current && videoRef.current.duration) {
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        if (maxScroll > 0) {
          const scrollFraction = Math.min(1, Math.max(0, window.scrollY / maxScroll));
          // Scrub video playback time smoothly to match scroll
          const targetTime = scrollFraction * videoRef.current.duration;
          if (Math.abs(videoRef.current.currentTime - targetTime) > 0.05) {
            videoRef.current.currentTime = targetTime;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(animationFrameId);
    };
  }, [useVideo]);

  // Canvas image-frame fallback, used only if every video source fails.
  // Drop numbered JPEGs at public/frames/cattle_frames_60fps/frame_0001.jpg... to use it;
  // with no frames present the procedural particle loop below renders instead.
  useEffect(() => {
    if (useVideo) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const frameCount = 300;
    const images: HTMLImageElement[] = [];

    // Preload frame images
    let loadedCount = 0;
    for (let i = 1; i <= Math.min(60, frameCount); i++) {
      const img = new Image();
      img.src = `/frames/cattle_frames_60fps/frame_${i.toString().padStart(4, '0')}.jpg`;
      img.onload = () => {
        loadedCount++;
        if (i === 1) {
          canvas.width = img.naturalWidth || window.innerWidth;
          canvas.height = img.naturalHeight || window.innerHeight;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
      };
      images.push(img);
    }

    let targetFrameIndex = 0;
    let currentFrameIndex = 0;
    let rafId: number;

    const renderCanvas = () => {
      if (!ctx || !canvas) return;
      
      const width = canvas.width;
      const height = canvas.height;
      
      ctx.clearRect(0, 0, width, height);

      // Check if any frame images loaded
      const renderIdx = Math.round(currentFrameIndex);
      const img = images[renderIdx];

      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, 0, 0, width, height);
      } else {
        // Procedural 3D Cattle Feed & Grain Rotation Scroll Animation
        const time = Date.now() * 0.001;
        const scrollFraction = currentFrameIndex / Math.max(1, images.length || 300);

        // Dark background with emerald/amber radial glow
        const bgGradient = ctx.createRadialGradient(
          width / 2, height / 2, 50,
          width / 2, height / 2, Math.max(width, height) / 1.2
        );
        bgGradient.addColorStop(0, '#064e3b');
        bgGradient.addColorStop(0.5, '#022c22');
        bgGradient.addColorStop(1, '#020617');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, width, height);

        // Rotating Grain & Pellet Particles
        const particleCount = 60;
        for (let i = 0; i < particleCount; i++) {
          const angle = (i / particleCount) * Math.PI * 2 + time * 0.2 + scrollFraction * Math.PI * 4;
          const radius = 100 + (i * 7) + Math.sin(time + i) * 20;
          const x = width / 2 + Math.cos(angle) * radius;
          const y = height / 2 + Math.sin(angle) * (radius * 0.6);
          const size = 3 + (i % 5) * 2.5;

          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(angle + time);

          if (i % 3 === 0) {
            // Golden Corn Kernel
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.ellipse(0, 0, size * 1.5, size, 0, 0, Math.PI * 2);
            ctx.fill();
          } else if (i % 3 === 1) {
            // Emerald Feed Pellet
            ctx.fillStyle = '#10b981';
            ctx.fillRect(-size, -size / 2, size * 2, size);
          } else {
            // Wheat Amber Grain
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }

        // Central AgroFeed Energy Ring
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.rotate(scrollFraction * Math.PI * 2 + time * 0.1);
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.25)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 180 + Math.sin(time) * 15, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      rafId = requestAnimationFrame(renderCanvas);
    };
    renderCanvas();

    const handleCanvasScroll = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll > 0) {
        const scrollFraction = Math.min(1, Math.max(0, window.scrollY / maxScroll));
        targetFrameIndex = Math.min(images.length - 1, Math.floor(scrollFraction * images.length));
      }
    };

    window.addEventListener('scroll', handleCanvasScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleCanvasScroll);
      cancelAnimationFrame(rafId);
    };
  }, [useVideo]);

  const handleVideoError = () => {
    if (sourceIndex < feedVideoSources.length - 1) {
      setSourceIndex((prev) => prev + 1);
    } else {
      setUseVideo(false);
    }
  };

  return (
    <div
      id="scroll-animation-bg"
      className="fixed top-0 left-0 w-full h-full -z-50 bg-slate-950 overflow-hidden flex justify-center items-center pointer-events-none transform-gpu will-change-transform"
    >
      {useVideo ? (
        <video
          ref={videoRef}
          src={feedVideoSources[sourceIndex]}
          muted
          playsInline
          preload="auto"
          onError={handleVideoError}
          className="w-full h-full object-cover opacity-50 mix-blend-screen scale-105"
        />
      ) : (
        <canvas ref={canvasRef} className="w-full h-full object-cover opacity-50" />
      )}

      {/* Dark Gradient Overlay for optimal readability of foreground content */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/40 to-slate-950/90 pointer-events-none" />
    </div>
  );
};
