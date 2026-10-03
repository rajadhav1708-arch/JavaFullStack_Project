import { useEffect } from 'react';

/**
 * Single IntersectionObserver behind every `data-reveal` element in the app.
 *
 * Adding one observer per card would mean dozens of observers; one is enough.
 * Cards that mount late (the catalogue loads over the network, so the grids
 * render after the first paint) are caught by the MutationObserver.
 */
export function useRevealOnScroll(): void {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.06 }
    );

    const observeOne = (el: Element): void => {
      const delay = el.getAttribute('data-reveal-delay');
      if (delay && el instanceof HTMLElement) el.style.transitionDelay = `${delay}ms`;
      io.observe(el);
    };

    const scan = (root: ParentNode): void => {
      root
        .querySelectorAll('[data-reveal]:not(.is-visible)')
        .forEach((el) => observeOne(el));
    };

    scan(document);

    const mo = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.matches('[data-reveal]:not(.is-visible)')) observeOne(node);
          scan(node);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);
}
