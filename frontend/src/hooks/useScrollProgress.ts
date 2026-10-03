import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * One scroll listener for the whole app, driven by a single requestAnimationFrame.
 *
 * Before this, four components each did `addEventListener('scroll', () => setScrollY(
 * window.scrollY))`. Scroll events fire faster than the display refreshes on a
 * wheel or trackpad, so every one of them queued a full re-render, and each read
 * an *absolute* page offset - which is what made cards drift away from their grid
 * and never come back.
 *
 * Two rules this enforces:
 *  1. Work is measured against the element's own position in the viewport, never
 *     against window.scrollY, so a value is always bounded 0..1.
 *  2. Nothing animates for a user who asked for reduced motion.
 */

type FrameListener = (scrollY: number, viewportHeight: number) => void;

const listeners = new Set<FrameListener>();
let rafId: number | null = null;
let ticking = false;

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

function flush(): void {
  ticking = false;
  rafId = null;
  const scrollY = window.scrollY;
  const viewportHeight = window.innerHeight;
  for (const listener of listeners) listener(scrollY, viewportHeight);
}

/**
 * Coalesces any number of scroll events into one read per frame. `scroll` and
 * `resize` are both passive; nothing here ever cancels an event, so it cannot
 * block the compositor's own scroll handling.
 */
function schedule(): void {
  if (ticking || rafId !== null) return;
  ticking = true;
  rafId = requestAnimationFrame(flush);
}

let attached = false;

function attach(): void {
  if (attached) return;
  attached = true;
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
}

function detach(): void {
  if (!attached) return;
  attached = false;
  window.removeEventListener('scroll', schedule);
  window.removeEventListener('resize', schedule);
  if (rafId !== null) cancelAnimationFrame(rafId);
  rafId = null;
  ticking = false;
}

/**
 * How far `element` has travelled through the viewport: 0 when its top edge
 * reaches the bottom of the screen, 1 when its bottom edge leaves the top.
 *
 * This is the whole fix for the drifting boxes. Because it depends only on where
 * the element *currently* sits, it cannot run away no matter how far the page is
 * scrolled - scroll to 20,000px and a section near the bottom still reports ~1.
 */
export function progressThroughViewport(element: Element, viewportHeight: number): number {
  const rect = element.getBoundingClientRect();
  const span = viewportHeight + rect.height;
  if (span <= 0) return 0;
  const raw = (viewportHeight - rect.top) / span;
  return Math.min(1, Math.max(0, raw));
}

/**
 * Subscribes to the shared scroll loop and reports this element's viewport
 * progress. The returned `ref` must be attached to the element being measured.
 *
 * `enabled: false` suspends the subscription entirely, which is how the
 * off-screen sections avoid doing any work at all while the user is elsewhere in
 * the app.
 */
export function useScrollProgress<T extends HTMLElement>(enabled = true): {
  ref: RefObject<T | null>;
  progress: number;
} {
  const ref = useRef<T | null>(null);
  const [progress, setProgress] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    const element = ref.current;
    if (!enabled || !element) return;

    if (prefersReducedMotion()) {
      // Parked mid-travel so the layout matches the reduced-motion variant, and
      // never updates again.
      setProgress(0.5);
      return;
    }

    const update = (_scrollY: number, viewportHeight: number): void => {
      const next = progressThroughViewport(element, viewportHeight);
      // Bail out when nothing moved. Avoids a re-render per frame for sections
      // that are technically visible but not scrolling.
      if (Math.abs(next - latest.current) < 0.0005) return;
      latest.current = next;
      setProgress(next);
    };

    listeners.add(update);
    attach();
    update(window.scrollY, window.innerHeight);

    return () => {
      listeners.delete(update);
      if (listeners.size === 0) detach();
    };
  }, [enabled]);

  return { ref, progress };
}

/**
 * Subscribes to raw scroll position without measuring an element. Used by the
 * fixed background, which needs the scroll offset itself rather than an
 * element's progress. Shares the single app-wide listener.
 */
export function useScrollFrame(handler: FrameListener): void {
  const latest = useRef(handler);

  useEffect(() => {
    latest.current = handler;
  });

  useEffect(() => {
    const listener: FrameListener = (scrollY, viewportHeight) => latest.current(scrollY, viewportHeight);
    listeners.add(listener);
    attach();
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) detach();
    };
  }, []);
}

/**
 * True only while `element` is anywhere near the viewport.
 *
 * Feeds the `enabled` flag on `useScrollProgress` and the render gate on the
 * background canvas, so a section the user has scrolled past costs nothing.
 * `rootMargin` is generous because a section is still worth animating slightly
 * before it technically appears.
 */
export function useInView<T extends HTMLElement>(
  rootMargin = '200px'
): { ref: RefObject<T | null>; inView: boolean } {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver !== 'function') {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => setInView(entries.some((entry) => entry.isIntersecting)),
      { rootMargin }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [rootMargin]);

  return { ref, inView };
}

/**
 * The signed distance from centre for a parallax layer: -distance at the moment
 * the element enters, 0 when it is centred, +distance as it leaves.
 *
 * Layers therefore move *relative to each other* by a bounded amount, which is
 * what produces depth. Two layers given different `distance` values separate by a
 * predictable gap and can never drift apart over a long scroll.
 */
export function parallaxOffset(progress: number, distance: number): number {
  return (0.5 - progress) * 2 * distance;
}
