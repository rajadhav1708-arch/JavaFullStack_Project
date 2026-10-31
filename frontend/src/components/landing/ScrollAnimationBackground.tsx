import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useScrollFrame } from '../../hooks/useScrollProgress';

/**
 * Full-page scroll-scrubbed background for /home.
 *
 * The hero starts exactly as before: frame 0 sits behind it under a cream veil
 * at 0.9 opacity. As the hero leaves the viewport the veil clears, the image
 * reaches full opacity, and frame scrubbing continues through every remaining
 * section until the end of the home page. It no longer dissolves or stops at
 * the old hero stage.
 *
 * Perf/accessibility: one shared rAF scroll listener, sampled frames, DPR
 * capped at 1.5, canvas width capped at 1920, drawing skipped when the tab is
 * hidden, a static first frame under prefers-reduced-motion, and an
 * aria-hidden/pointer-events-none root so it cannot block interaction.
 */

// Frames 0510-0600 have an AI-generated caption baked into the photograph
// ("QUALITY FEED • BETTER NUTRITION…"). Stop before it so the background never
// competes with real page headings; 1-500 still covers the full scrub.
const SCRUB_FRAME_COUNT = 500;
const FRAME_PATH = '/frames/cattle_frames_60fps';
const PRELOAD_CONCURRENCY = 6;
const MAX_CANVAS_WIDTH = 1920;
const FALLBACK_TRAVEL_PX = 600;
const FALLBACK_IMAGE_FULL_FRACTION = 0.8;
const SCRUB_STRIDE = 3;
const INITIAL_CANVAS_OPACITY = 0.9;
// Once the hero has gone, keep a cream wash over the photography. It preserves
// the parallax without letting the busy frames (or the text baked into some of
// them) fight the catalogue copy.
const CONTENT_SCRIM_OPACITY = 0.6;

// Slightly translucent cream veil: keeps photo presence behind the hero while
// guaranteeing contrast for ink text, then clears as the hero scrolls away.
const VEIL = [
  'rgba(247, 242, 231, 0.62) 0%',
  'rgba(247, 242, 231, 0.74) 40%',
  'rgba(247, 242, 231, 0.96) 100%',
].join();

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

function frameStride(): number {
  if (typeof window.matchMedia !== 'function') return 2;
  return window.matchMedia('(max-width: 768px)').matches ? 5 : 2;
}

function frameUrl(index: number): string {
  return `${FRAME_PATH}/frame_${String(index + 1).padStart(4, '0')}.jpg`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function nearestLoaded(
  frames: (HTMLImageElement | null)[],
  target: number
): HTMLImageElement | null {
  for (let step = 0; step < frames.length; step += 1) {
    for (const candidate of [target - step, target + step]) {
      if (candidate < 0 || candidate >= frames.length) continue;
      const image = frames[candidate];
      if (image && image.complete && image.naturalWidth > 0) return image;
    }
  }
  return null;
}

export const ScrollAnimationBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const framesRef = useRef<(HTMLImageElement | null)[]>([]);
  const strideRef = useRef(1);
  const drawnRef = useRef(-1);
  const travelRef = useRef(FALLBACK_TRAVEL_PX);
  const imageFullFracRef = useRef(FALLBACK_IMAGE_FULL_FRACTION);

  const [hasFrames, setHasFrames] = useState<boolean | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(prefersReducedMotion());
    strideRef.current = frameStride();
  }, []);

  // Sequence preload, skipped entirely for reduced-motion users.
  useEffect(() => {
    if (reducedMotion) return;
    let cancelled = false;
    const frames: (HTMLImageElement | null)[] = new Array(SCRUB_FRAME_COUNT).fill(null);
    framesRef.current = frames;
    drawnRef.current = -1;

    const stride = strideRef.current;
    let next = 0;
    let settled = 0;

    const loadOne = (): void => {
      if (cancelled || settled >= SCRUB_FRAME_COUNT) return;
      settled += 1;
      const index = next;
      next += stride;

      const image = new Image();
      image.decoding = 'async';
      image.src = frameUrl(index);
      image.onload = () => {
        if (cancelled) return;
        frames[index] = image;
        if (index === 0) {
          drawnRef.current = -1;
          setHasFrames(true);
        }
        loadOne();
      };
      image.onerror = () => {
        if (cancelled) return;
        loadOne();
      };
    };

    for (let i = 0; i < PRELOAD_CONCURRENCY; i += 1) loadOne();

    const settle = setTimeout(() => {
      if (cancelled) return;
      if (frames[0] == null) setHasFrames(false);
      else setHasFrames(true);
    }, 4000);

    return () => {
      cancelled = true;
      clearTimeout(settle);
    };
  }, [reducedMotion]);

  // Reduced motion: whole first frame still, drawn once, no scrubbing.
  useEffect(() => {
    if (!reducedMotion) return;
    let cancelled = false;
    const image = new Image();
    image.src = frameUrl(0);
    image.onload = () => {
      if (cancelled) return;
      setHasFrames(true);
      const canvas = canvasRef.current;
      if (canvas && canvas.offsetWidth > 0 && image.naturalWidth > 0) {
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        canvas.width = Math.min(Math.round(canvas.offsetWidth * dpr), MAX_CANVAS_WIDTH);
        canvas.height = Math.round((canvas.offsetHeight / canvas.offsetWidth) * canvas.width);
        paintFrame(canvas, image);
      }
    };
    return () => {
      cancelled = true;
    };
  }, [reducedMotion]);

  const sizeCanvas = useCallback((): void => {
    const canvas = canvasRef.current;
    if (!canvas || canvas.offsetWidth === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = Math.min(Math.round(canvas.offsetWidth * dpr), MAX_CANVAS_WIDTH);
    const height = Math.round((canvas.offsetHeight / canvas.offsetWidth) * width);
    if (canvas.width === width && canvas.height === height) return;
    canvas.width = width;
    canvas.height = height;
    drawnRef.current = -1;
  }, []);

  // Frame-independent scene state: veil hand-over, canvas opacity, Ken Burns.
  // Called on mount, resize, and every scroll frame so refreshes and backward
  // scrolling always land in the same place.
  const syncScene = useCallback((fraction: number): void => {
    const fullFrac = clamp(imageFullFracRef.current, 0.05, 1);
    const ramp = clamp(fraction / fullFrac, 0, 1);
    if (veilRef.current) veilRef.current.style.opacity = (1 - ramp).toFixed(3);
    if (scrimRef.current) {
      scrimRef.current.style.opacity = (ramp * CONTENT_SCRIM_OPACITY).toFixed(3);
    }
    if (canvasRef.current) {
      canvasRef.current.style.opacity = (
        INITIAL_CANVAS_OPACITY + (1 - INITIAL_CANVAS_OPACITY) * ramp
      ).toFixed(3);
    }

    const frameEl = frameRef.current;
    if (frameEl) {
      const zoom = 1 + ramp * 0.04;
      const drift = (ramp - 0.5) * -12;
      frameEl.style.transform = `translate3d(0, ${drift.toFixed(2)}px, 0) scale(${zoom.toFixed(4)})`;
    }
  }, []);

  useScrollFrame(
    useCallback(
      (scrollY: number): void => {
        if (hasFrames === false) return;
        if (document.visibilityState !== 'visible') return;

        const fraction = clamp(scrollY / Math.max(1, travelRef.current), 0, 1);
        syncScene(fraction);

        // Reduced motion: no frames, no drift.
        if (reducedMotion) return;

        // Uniform stride keeps the travel smooth: the target jumps in even
        // steps through the capture instead of skimming it.
        const target = Math.min(
          SCRUB_FRAME_COUNT - 1,
          Math.round((fraction * (SCRUB_FRAME_COUNT - 1)) / SCRUB_STRIDE) * SCRUB_STRIDE
        );
        if (target === drawnRef.current) return;
        drawnRef.current = target;

        const image = nearestLoaded(framesRef.current, target);
        if (image) paintFrame(canvasRef.current, image);
      },
      [hasFrames, reducedMotion, syncScene]
    )
  );

  // Travel is the whole home page, not just the hero. Fraction 1 is the end of
  // the content, so every section is covered by the same scrub.
  const measureTravel = useCallback((): void => {
    const vh = window.innerHeight;
    const hero = document.getElementById('home-hero');
    const page = document.getElementById('home-page');

    const pageBottom = page
      ? page.getBoundingClientRect().bottom + window.scrollY
      : document.documentElement.scrollHeight;
    const travel = Math.max(
      FALLBACK_TRAVEL_PX,
      Math.round(pageBottom - vh)
    );
    travelRef.current = travel;

    const heroBottom = hero
      ? hero.getBoundingClientRect().bottom + window.scrollY
      : vh;
    imageFullFracRef.current = clamp(heroBottom / travel, 0.1, 0.95);
  }, []);

  React.useLayoutEffect(() => {
    measureTravel();
    syncScene(clamp(window.scrollY / Math.max(1, travelRef.current), 0, 1));

    const onResize = (): void => {
      sizeCanvas();
      measureTravel();
      syncScene(clamp(window.scrollY / Math.max(1, travelRef.current), 0, 1));
    };

    let resizeObserver: ResizeObserver | null = null;
    const page = document.getElementById('home-page');
    if (page && typeof ResizeObserver === 'function') {
      resizeObserver = new ResizeObserver(() => {
        measureTravel();
        syncScene(clamp(window.scrollY / Math.max(1, travelRef.current), 0, 1));
      });
      resizeObserver.observe(page);
    }

    window.addEventListener('resize', onResize);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, [measureTravel, syncScene, sizeCanvas]);

  useEffect(() => {
    if (reducedMotion) return;
    sizeCanvas();
    const settle = setTimeout(() => {
      sizeCanvas();
      measureTravel();
    }, 1200);
    return () => clearTimeout(settle);
  }, [reducedMotion, sizeCanvas, measureTravel]);

  // First paint as soon as frame 0 lands, before the first scroll event.
  useEffect(() => {
    if (reducedMotion || hasFrames !== null) return;
    let cancelled = false;
    const image = new Image();
    image.src = frameUrl(0);
    image.onload = () => {
      if (cancelled || image.naturalWidth === 0) return;
      sizeCanvas();
      paintFrame(canvasRef.current, image);
    };
    return () => {
      cancelled = true;
    };
  }, [reducedMotion, hasFrames, sizeCanvas]);

  return (
    <div
      id="scroll-animation-bg"
      aria-hidden="true"
      className="no-print pointer-events-none fixed -z-10 inset-0 overflow-hidden"
    >
      <div ref={frameRef} className="absolute -inset-[2%] will-change-transform">
        {hasFrames === false ? (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,#e9dfc9_0%,#dccfb2_60%,#f7f2e7_100%)]" />
        ) : (
          <canvas
            ref={canvasRef}
            className="h-full w-full"
            style={{ opacity: INITIAL_CANVAS_OPACITY }}
            aria-hidden="true"
          />
        )}
        <div
          ref={veilRef}
          className="absolute inset-0"
          style={{ background: `linear-gradient(to bottom, ${VEIL})` }}
        />
      </div>
      <div
        ref={scrimRef}
        className="absolute inset-0 bg-cream"
        style={{ opacity: 0 }}
      />
    </div>
  );
};

let backdropTile: HTMLCanvasElement | null = null;

function getBackdropTile(): HTMLCanvasElement {
  if (!backdropTile) backdropTile = document.createElement('canvas');
  return backdropTile;
}

function paintFrame(canvas: HTMLCanvasElement | null, image: HTMLImageElement): void {
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx || canvas.width === 0 || canvas.height === 0 || image.naturalWidth === 0) return;

  // Backdrop: a thumbnail of the frame stretched to the canvas — a few-pixel
  // cheap blur that fills the letterbox zones so the full image can be shown
  // below without gaps.
  const tile = getBackdropTile();
  if (tile.width !== 48) {
    tile.width = 48;
    tile.height = 27;
  }
  const tileCtx = tile.getContext('2d');
  if (tileCtx) {
    const tscale = Math.max(tile.width / image.naturalWidth, tile.height / image.naturalHeight);
    const tw = tile.width / tscale;
    const th = tile.height / tscale;
    tileCtx.clearRect(0, 0, tile.width, tile.height);
    tileCtx.drawImage(
      image,
      (image.naturalWidth - tw) / 2,
      (image.naturalHeight - th) / 2,
      tw,
      th,
      0,
      0,
      tile.width,
      tile.height
    );
    ctx.imageSmoothingEnabled = true;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(tile, 0, 0, canvas.width, canvas.height);
  }

  // Foreground: the entire frame contained — not a single pixel cropped away,
  // never stretched. Slight letterboxing is invisible because the backdrop
  // behind is the frame's own blurred extension.
  const scale = Math.min(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
  const dw = image.naturalWidth * scale;
  const dh = image.naturalHeight * scale;
  ctx.drawImage(image, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
}
