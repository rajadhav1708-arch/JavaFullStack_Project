import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useScrollFrame } from '../../hooks/useScrollProgress';

/**
 * Background parallax scoped to the hero of /home.
 *
 * Sequence:
 *   1. At rest, the page looks exactly as it always has — the scrubbed frame
 *      sits behind the hero under a cream veil.
 *   2. While the hero scrolls off-screen, the image climbs from its initial
 *      opacity to full 1 (veil and movement land with it) so by the time the
 *      hero's video card has left the viewport only the effect is showing.
 *   3. A tall empty stage (#home-stage) follows: nothing but the full-opacity,
 *      scrubbed background is visible there — no page content at all.
 *   4. Only when the stage ends is the main content revealed (700ms
 *      opacity/translate transition, driven by html[data-parallax-done]) just
 *      as the layer dissolves into the page's cream background.
 *   5. The rest of the homepage scrolls normally.
 *
 * Fail-safe: content is revealed immediately on mount when the user already
 * sits past the animation (refresh mid-page / deep link), under reduced
 * motion, if frames fail to load, or via a 3.5s timeout — it can never be
 * hidden indefinitely. Navigating away removes the attribute so other pages
 * always render normally.
 *
 * Perf/accessibility: one shared rAF scroll listener (hooks/useScrollProgress),
 * frames sampled on a stride (2 desktop / 5 mobile), DPR capped at 1.5,
 * canvas width capped at 1920, drawing skipped when the layer is fully faded
 * or the tab is hidden, static first frame under prefers-reduced-motion, and
 * an aria-hidden/pointer-events-none root so it can never block interaction.
 */

const FRAME_COUNT = 600;
const FRAME_PATH = '/frames/cattle_frames_60fps';
const PRELOAD_CONCURRENCY = 6;
const MAX_CANVAS_WIDTH = 1920;
const FALLBACK_TRAVEL_PX = 600; // if neither #home-stage nor #home-hero is present
const FALLBACK_IMAGE_FULL_FRACTION = 0.8; // ramp fallback when measurement is degraded
const REVEAL_AT = 0.97; // main content may be revealed near the very end of the stage
const DISSOLVE_AT = 0.92; // the layer hands the page back to cream from here
const REVEAL_FAILSAFE_MS = 3500;
const SCRUB_STRIDE = 3; // play every Nth frame over the full travel
const INITIAL_CANVAS_OPACITY = 0.9; // the existing, unchanged starting opacity

// Slightly translucent cream veil: keeps photo presence behind the hero while
// guaranteeing contrast for ink text, and blends into bg-cream below.
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
  const stride = window.matchMedia('(max-width: 768px)').matches ? 5 : 2;
  return Math.max(1, stride);
}

function frameUrl(index: number): string {
  return `${FRAME_PATH}/frame_${String(index + 1).padStart(4, '0')}.jpg`;
}

function nearestLoaded(
  frames: (HTMLImageElement | null)[],
  target: number
): HTMLImageElement | null {
  for (let step = 0; step < FRAME_COUNT; step += 1) {
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
  const layerRef = useRef<HTMLDivElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const framesRef = useRef<(HTMLImageElement | null)[]>([]);
  const strideRef = useRef(1);
  const drawnRef = useRef(-1);
  const travelRef = useRef(FALLBACK_TRAVEL_PX);
  const imageFullFracRef = useRef(FALLBACK_IMAGE_FULL_FRACTION);
  const revealedRef = useRef(false);

  const [hasFrames, setHasFrames] = useState<boolean | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Stage gate: html[data-parallax-done] flips the CSS reveal on
  // .home-reveal. Flips happen once and stay revealed — scrolling backward
  // must never re-hide content. The background layer itself stays live:
  // its opacity is scroll-driven (syncScene), so scrolling back up always
  // restores the effect frame-by-frame instead of blank space. When the
  // reveal fires early (failsafe / refresh mid-stage) a one-time ease-out
  // fade hands content a plain background; the first scroll write clears it.
  const revealNow = useCallback((): void => {
    if (revealedRef.current) return;
    revealedRef.current = true;
    document.documentElement.dataset.parallaxDone = 'true';
    const layer = layerRef.current;
    if (layer && +getComputedStyle(layer).opacity > 0.02) {
      layer.style.transition = 'opacity 0.6s ease-out';
      layer.style.opacity = '0';
      window.setTimeout(() => {
        layer.style.transition = '';
      }, 700);
    }
  }, []);

  useEffect(() => {
    setReducedMotion(prefersReducedMotion());
    strideRef.current = frameStride();
  }, []);

  // Sequence preload, skipped entirely for reduced-motion users.
  useEffect(() => {
    if (reducedMotion) return;
    let cancelled = false;
    const frames: (HTMLImageElement | null)[] = new Array(FRAME_COUNT).fill(null);
    framesRef.current = frames;
    drawnRef.current = -1;

    const stride = strideRef.current;
    let next = 0;
    let settled = 0;

    const loadOne = (): void => {
      if (cancelled || settled >= FRAME_COUNT) return;
      settled += 1;
      const index = next;
      next += stride;

      const image = new Image();
      image.decoding = 'async';
      image.src = frameUrl(index);
      image.onload = () => {
        if (cancelled) return;
        frames[index] = image;
        if (index === 0) drawnRef.current = -1;
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
      if (frames[0] == null) {
        // The animation cannot run: hand the page over to normal scrolling.
        revealNow();
        setHasFrames(false);
      } else {
        setHasFrames(true);
      }
    }, 4000);

    return () => {
      cancelled = true;
      clearTimeout(settle);
    };
  }, [reducedMotion, revealNow]);

  // Reduced motion: whole first frame still, drawn once, no scrubbing, and the
  // content is never gated on the animation.
  useEffect(() => {
    if (!reducedMotion) return;
    revealNow();
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
  }, [reducedMotion, revealNow]);

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

  // Single source of truth for the frame-independent scene state (veil hand
  // over, canvas opacity, Ken Burns position, reveal gate, layer dissolve).
  // Both the mount sync and every scroll frame call this with a fraction so
  // refreshes, fast scrolls, and backward scrolling all land consistently.
  const syncScene = useCallback(
    (fraction: number): boolean => {
      // The image reaches full opacity (and the veil empties, and the movement
      // lands) at imageFullFracRef — the moment the hero has left the screen.
      // From there, through the whole empty stage, only the scrubbed effect at
      // full opacity is visible.
      const fullFrac = Math.max(0.05, Math.min(1, imageFullFracRef.current));
      const ramp = Math.min(1, Math.max(0, fraction / fullFrac));
      if (veilRef.current) veilRef.current.style.opacity = (1 - ramp).toFixed(3);
      if (canvasRef.current) {
        canvasRef.current.style.opacity = (
          INITIAL_CANVAS_OPACITY + (1 - INITIAL_CANVAS_OPACITY) * ramp
        ).toFixed(3);
      }

      // Ken Burns completes with the opacity ramp.
      const frameEl = frameRef.current;
      if (frameEl) {
        const zoom = 1 + ramp * 0.04;
        const drift = (ramp - 0.5) * -12;
        frameEl.style.transform = `translate3d(0, ${drift.toFixed(2)}px, 0) scale(${zoom.toFixed(4)})`;
      }

      if (fraction >= REVEAL_AT) revealNow();

      // The layer dissolves into the page's cream background only when the
      // stage ends — and it is restored by the same fraction-based write when
      // the user scrolls back up, so the effect never leaves blank space.
      let dissolveComplete = false;
      const layer = layerRef.current;
      if (layer) {
        // A one-time reveal fade must yield to the scroll-driven state.
        if (layer.style.transition) layer.style.transition = '';
        const fade = Math.min(1, Math.max(0, (fraction - DISSOLVE_AT) / (1 - DISSOLVE_AT)));
        layer.style.opacity = (1 - fade).toFixed(3);
        dissolveComplete = fade >= 1;
      }
      return dissolveComplete;
    },
    [revealNow]
  );

  useScrollFrame(
    useCallback(
      (scrollY: number, viewportHeight: number): void => {
        if (hasFrames === false) return;
        if (document.visibilityState !== 'visible') return;

        // The sequence maps onto the hero + stage scroll range: fraction
        // reaches 1 just as the empty stage ends and content is due.
        const fraction = Math.min(1, Math.max(0, scrollY / Math.max(1, travelRef.current)));

        if (syncScene(fraction)) {
          if (drawnRef.current !== FRAME_COUNT) drawnRef.current = FRAME_COUNT;
          return;
        }

        // Reduced motion: no frames, no drift (reveal already happened).
        if (reducedMotion) return;
        if (fraction >= 1) return;

        // Uniform stride keeps the travel smooth: the target jumps in even
        // steps through the capture instead of skimming it.
        const target = Math.min(
          FRAME_COUNT - 1 - SCRUB_STRIDE,
          Math.round((fraction * (FRAME_COUNT - 1)) / SCRUB_STRIDE) * SCRUB_STRIDE
        );
        if (target === drawnRef.current) return;
        drawnRef.current = target;

        const image = nearestLoaded(framesRef.current, target);
        if (image) paintFrame(canvasRef.current, image);
      },
      [hasFrames, reducedMotion, syncScene]
    )
  );

  // Travel distance for the whole effect: from scroll 0 to the end of the
  // empty stage (#home-stage). The image hits full opacity exactly when the
  // hero (its video card) has left the viewport, then the stage scrolls with
  // only the scrubbed effect at full opacity until it, too, is gone.
  const measureHeroTravel = useCallback((): void => {
    const vh = window.innerHeight;
    const hero = document.getElementById('home-hero');
    const stage = document.getElementById('home-stage');
    const reveal = document.querySelector<HTMLElement>('.home-reveal');

    const setDegraded = (): void => {
      travelRef.current = FALLBACK_TRAVEL_PX;
      imageFullFracRef.current = FALLBACK_IMAGE_FULL_FRACTION;
    };

    if (stage) {
      const stageTop = stage.getBoundingClientRect().top + window.scrollY;
      const stageHeight = stage.offsetHeight;

      // Fraction 1 lands where the content would start scrolling in: the
      // reveal wrapper's top reaching the viewport bottom (falling back to
      // the stage bottom when the wrapper is missing).
      let end = stageTop + stageHeight;
      if (reveal) {
        const revealTop = reveal.getBoundingClientRect().top + window.scrollY;
        end = Math.max(end, revealTop - vh);
      }
      travelRef.current = Math.max(320, Math.round(end));

      const heroBottom = hero
        ? hero.getBoundingClientRect().bottom + window.scrollY
        : stageTop - 12;
      imageFullFracRef.current = Math.min(
        0.95,
        Math.max(0.1, heroBottom / travelRef.current)
      );
      return;
    }

    if (hero) {
      // Degraded stage: end just below the hero, ramp guarded by a fallback.
      const bottom = hero.getBoundingClientRect().bottom + window.scrollY;
      travelRef.current = Math.max(320, Math.round(bottom - vh * 0.45));
      imageFullFracRef.current = FALLBACK_IMAGE_FULL_FRACTION;
      return;
    }

    setDegraded();
  }, []);

  // Scene lifecycle. useLayoutEffect so the reveal attribute is decided before
  // first paint — a mid-page refresh must show content immediately, never
  // flash it hidden. Contents are hidden only while data-parallax-done is
  // explicitly 'false'.
  React.useLayoutEffect(() => {
    measureHeroTravel();

    if (reducedMotion || prefersReducedMotion()) {
      revealNow();
      return;
    }

    const fraction = window.scrollY / Math.max(1, travelRef.current);
    if (fraction >= REVEAL_AT) {
      // Refresh or deep link past the animation: content is already due, and
      // layer/veil state must not sit stale at the restored scroll offset.
      revealNow();
      syncScene(fraction);
    } else {
      document.documentElement.dataset.parallaxDone = 'false';
      syncScene(Math.min(1, fraction));
    }

    // The page below must never stay hidden if the animation cannot run
    // (frames unreachable, old browser, etc.).
    const failsafe = setTimeout(revealNow, REVEAL_FAILSAFE_MS);

    // Early heuristic: a crippled GPU still throws no image error, so watch for
    // blank canvas draws too — the failsafe covers them.
    const onResize = (): void => sizeCanvas();
    window.addEventListener('resize', onResize);

    return () => {
      clearTimeout(failsafe);
      window.removeEventListener('resize', onResize);
      // Other routes must never inherit the scene state.
      delete document.documentElement.dataset.parallaxDone;
    };
  }, [reducedMotion, revealNow, measureHeroTravel, syncScene, sizeCanvas]);

  useEffect(() => {
    if (reducedMotion) return;
    sizeCanvas();
    measureHeroTravel();
    // Fonts and the hero video can shift the hero's final height slightly
    // right after mount; remeasure once they settle.
    const settle = setTimeout(measureHeroTravel, 1200);
    window.addEventListener('resize', sizeCanvas);
    return () => {
      clearTimeout(settle);
      window.removeEventListener('resize', sizeCanvas);
    };
  }, [reducedMotion, sizeCanvas, measureHeroTravel]);

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
      ref={layerRef}
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
    </div>
  );
};

// Offscreen tile reused for the soft backdrop fill; created lazily because
// this module never runs outside the browser tab that shows the component.
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
    tileCtx.drawImage(image, (image.naturalWidth - tw) / 2, (image.naturalHeight - th) / 2, tw, th, 0, 0, tile.width, tile.height);
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
