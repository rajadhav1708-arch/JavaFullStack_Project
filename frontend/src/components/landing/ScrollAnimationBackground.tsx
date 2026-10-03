import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useScrollFrame } from '../../hooks/useScrollProgress';

/**
 * Scroll-scrubbed parallax background.
 *
 * The animation is a pre-extracted image sequence drawn onto one canvas, not a
 * `<video>`. That is deliberate. The previous implementation scrubbed with
 * `video.currentTime = t` on every scroll event; assigning currentTime is a
 * *seek*, so each one aborted the in-flight decode and restarted it, and because
 * `seeked` resolves asynchronously rapid scrolling queued seeks that landed out
 * of order. The result froze, stuttered backwards, or stopped entirely. Drawing
 * an already-decoded JPEG cannot do any of that.
 *
 * Regenerate the sequence from a source clip with ffmpeg (see README):
 *   ffmpeg -i clip.mp4 -vf "fps=2,scale=1600:-2" -q:v 4 \
 *     public/frames/cattle_frames_60fps/frame_%04d.jpg
 * Frame count must match FRAME_COUNT below.
 */

/** Must match the number of files the ffmpeg command produces. */
const FRAME_COUNT = 48;
const FRAME_PATH = '/frames/cattle_frames_60fps';

/** Parallel image requests. Enough to feel instant, few enough not to saturate. */
const PRELOAD_CONCURRENCY = 6;

/**
 * The clip plays across the first stretch of the page and then holds on its last
 * frame. Scrubbing against the whole document - which is what the old code did -
 * meant the background had only reached ~20% by the time you hit the footer, so
 * the animation was effectively never seen.
 */
const SCRUB_VIEWPORTS = 2.5;

/** Caps the backing store so a 4K display does not allocate a 4K canvas. */
const MAX_CANVAS_WIDTH = 1920;

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

function frameUrl(index: number): string {
  return `${FRAME_PATH}/frame_${String(index + 1).padStart(4, '0')}.jpg`;
}

/** Nearest frame that has actually decoded, so scrubbing never draws a hole. */
function nearestLoaded(
  frames: (HTMLImageElement | null)[],
  target: number,
  count: number
): HTMLImageElement | null {
  for (let step = 0; step < count; step += 1) {
    for (const candidate of [target + step, target - step]) {
      const image = frames[candidate];
      if (image && image.complete && image.naturalWidth > 0) return image;
    }
  }
  return null;
}

export const ScrollAnimationBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const framesRef = useRef<(HTMLImageElement | null)[]>([]);
  const targetRef = useRef(0);
  const drawnRef = useRef(-1);
  const readyRef = useRef(0);

  const [hasFrames, setHasFrames] = useState<boolean | null>(null);

  /** Loads the sequence in small parallel batches. */
  useEffect(() => {
    let cancelled = false;
    const frames: (HTMLImageElement | null)[] = new Array(FRAME_COUNT).fill(null);
    framesRef.current = frames;

    let next = 0;

    const loadOne = (): void => {
      if (cancelled || next >= FRAME_COUNT) return;
      const index = next;
      next += 1;

      const image = new Image();
      image.decoding = 'async';
      image.src = frameUrl(index);
      image.onload = () => {
        if (cancelled) return;
        frames[index] = image;
        readyRef.current += 1;
        // Redraw immediately: the first frame must not wait for all 48.
        if (index === 0) drawnRef.current = -1;
        loadOne();
      };
      image.onerror = () => {
        if (cancelled) return;
        loadOne();
      };
    };

    for (let i = 0; i < PRELOAD_CONCURRENCY; i += 1) loadOne();

    // Frames are optional drop-in assets. With none present the particle loop
    // below renders instead, so the page is never left with an empty box.
    const settle = setTimeout(() => {
      if (!cancelled) setHasFrames(readyRef.current > 0);
    }, 2500);

    return () => {
      cancelled = true;
      clearTimeout(settle);
    };
  }, []);

  /** Keeps the backing store matched to the display without over-allocating. */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = (): void => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.min(Math.round(window.innerWidth * dpr), MAX_CANVAS_WIDTH);
      const height = Math.round(width * (window.innerHeight / Math.max(1, window.innerWidth)));
      if (canvas.width === width && canvas.height === height) return;
      canvas.width = width;
      canvas.height = height;
      drawnRef.current = -1;
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const draw = useCallback((scrollY: number, viewportHeight: number): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (document.visibilityState !== 'visible') return;

    const scrubDistance = Math.max(1, viewportHeight * SCRUB_VIEWPORTS);
    const fraction = Math.min(1, Math.max(0, scrollY / scrubDistance));

    // Ken Burns on top of the frame scrub: the whole plate slowly zooms and
    // drifts as the user travels the first stretch of the page, so the
    // background never feels like a pinned still between frame steps.
    const frameEl = frameRef.current;
    if (frameEl) {
      const zoom = 1 + fraction * 0.1;
      const drift = (fraction - 0.5) * -24;
      frameEl.style.transform = `translate3d(0, ${drift}px, 0) scale(${zoom.toFixed(4)})`;
    }

    const target = Math.min(FRAME_COUNT - 1, Math.floor(fraction * FRAME_COUNT));

    // The whole point: a still page costs nothing. The canvas is only touched
    // when the frame it is showing actually changes.
    if (target === drawnRef.current) return;
    drawnRef.current = target;
    targetRef.current = target;

    const image = nearestLoaded(framesRef.current, target, FRAME_COUNT);
    if (!image) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  }, []);

  useScrollFrame(draw);

  /**
   * Fallback for when no frames are present. Unlike the frame path this genuinely
   * animates, so it needs a continuous loop - but it is gated on tab visibility
   * and reduced motion, which the old version never was. It used to burn a core
   * on the shop page and in background tabs forever.
   */
  useEffect(() => {
    if (hasFrames !== false) return;
    if (prefersReducedMotion()) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number | null = null;

    const render = (): void => {
      if (document.visibilityState === 'visible') {
        const { width, height } = canvas;
        const time = Date.now() * 0.001;
        const scrollFraction = targetRef.current / FRAME_COUNT;

        const bg = ctx.createRadialGradient(
          width / 2, height / 2, 50,
          width / 2, height / 2, Math.max(width, height) / 1.2
        );
        bg.addColorStop(0, '#064e3b');
        bg.addColorStop(0.5, '#022c22');
        bg.addColorStop(1, '#020617');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        const particleCount = 60;
        for (let i = 0; i < particleCount; i++) {
          const angle = (i / particleCount) * Math.PI * 2 + time * 0.2 + scrollFraction * Math.PI * 4;
          const radius = 100 + i * 7 + Math.sin(time + i) * 20;
          const x = width / 2 + Math.cos(angle) * radius;
          const y = height / 2 + Math.sin(angle) * (radius * 0.6);
          const size = 3 + (i % 5) * 2.5;

          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(angle + time);
          if (i % 3 === 0) {
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.ellipse(0, 0, size * 1.5, size, 0, 0, Math.PI * 2);
            ctx.fill();
          } else if (i % 3 === 1) {
            ctx.fillStyle = '#10b981';
            ctx.fillRect(-size, -size / 2, size * 2, size);
          } else {
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }

        const ring = 180 + Math.sin(time) * 15;
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.rotate(scrollFraction * Math.PI * 2 + time * 0.1);
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.25)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, ring, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      rafId = requestAnimationFrame(render);
    };

    const onVisibility = (): void => {
      if (rafId === null) rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [hasFrames]);

  return (
    <div
      id="scroll-animation-bg"
      className="fixed top-0 left-0 w-full h-full -z-50 bg-slate-950 overflow-hidden pointer-events-none"
    >
      <div ref={frameRef} className="absolute inset-0 will-change-transform">
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="w-full h-full object-cover opacity-50"
        />

        {/* Dark gradient overlay, kept for foreground legibility. */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/40 to-slate-950/90 pointer-events-none" />
      </div>
    </div>
  );
};
