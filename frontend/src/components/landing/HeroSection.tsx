import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { STORE } from '../../data/store';
import { useLanguage } from '../../context/LanguageContext';
import { useScrollProgress, parallaxOffset } from '../../hooks/useScrollProgress';
import {
  ArrowRight,
  Calculator,
  FileText,
  HandCoins,
  Pause,
  Phone,
  Play,
  ShoppingBag,
  Truck,
} from 'lucide-react';

const PROOF_POINTS = [
  { icon: FileText, titleKey: 'hero.proofGst1', detailKey: 'hero.proofGst2' },
  { icon: HandCoins, titleKey: 'hero.proofKhata1', detailKey: 'hero.proofKhata2' },
  { icon: Truck, titleKey: 'hero.proofDelivery1', detailKey: 'hero.proofDelivery2' },
] as const;

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

/**
 * Hero with the original cow-feeding video and a restrained parallax lift on
 * the media card. Parallax is transform-only, disabled under reduced-motion,
 * and softened on small screens.
 */
export const HeroSection: React.FC = () => {
  const { setCurrentView } = useApp();
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const { ref: mediaRef, progress } = useScrollProgress<HTMLDivElement>();
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    setReducedMotion(prefersReducedMotion());
  }, []);

  const parallaxY = reducedMotion ? 0 : parallaxOffset(progress, 28);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
      setIsPaused(false);
    } else {
      video.pause();
      setIsPaused(true);
    }
  };

  return (
    <section id="home-hero" className="relative overflow-hidden border-b border-line">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-12 lg:items-center lg:px-8">
        <div className="lg:col-span-6 xl:col-span-7">
          <p data-reveal className="eyebrow">
            <span className="h-px w-8 bg-ochre" />
            {STORE.region}
          </p>

          <h1
            data-reveal
            data-reveal-delay="60"
            className="mt-5 max-w-2xl text-4xl leading-[1.02] text-ink sm:text-5xl lg:text-6xl"
          >
            {t('hero.title')}
          </h1>

          <p data-reveal data-reveal-delay="120" className="mt-5 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
            {t('hero.subtitle')}
          </p>

          <div data-reveal data-reveal-delay="180" className="mt-7 flex flex-wrap items-center gap-3">
            <button onClick={() => setCurrentView('shop')} className="btn btn-primary !px-5 !py-3.5">
              <ShoppingBag className="h-4 w-4" />
              {t('hero.ctaShop')}
              <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={() => setCurrentView('nutrition-quiz')} className="btn btn-outline !px-5 !py-3.5">
              <Calculator className="h-4 w-4 text-pine" />
              {t('hero.ctaQuiz')}
            </button>
          </div>

          <dl
            data-reveal
            data-reveal-delay="240"
            className="mt-10 grid max-w-xl grid-cols-1 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3"
          >
            {PROOF_POINTS.map((point) => {
              const Icon = point.icon;
              return (
                <div key={point.titleKey} className="bg-paper px-4 py-4">
                  <Icon className="h-4 w-4 text-ochre" />
                  <dt className="mt-2 text-xs font-bold text-ink">{t(point.titleKey)}</dt>
                  <dd className="text-[11px] text-ink-soft">{t(point.detailKey)}</dd>
                </div>
              );
            })}
          </dl>

          <p data-reveal data-reveal-delay="300" className="mt-6 text-xs text-ink-soft">
            {t('hero.callPrompt')}{' '}
            <a href={STORE.phoneHref} className="inline-flex items-center gap-1 font-bold text-pine hover:text-pine-deep">
              <Phone className="h-3 w-3" />
              {t('hero.callStore')}
            </a>
          </p>
        </div>

        <div data-reveal data-reveal-delay="160" className="lg:col-span-6 xl:col-span-5">
          <div
            ref={mediaRef}
            className="relative will-change-transform"
            style={{ transform: `translate3d(0, ${parallaxY}px, 0)` }}
          >
            <div className="absolute -inset-3 -z-10 rounded-[2rem] bg-pine-soft/70" />
            <article className="card overflow-hidden">
              <div className="relative aspect-[4/3] bg-cream">
                <video
                  ref={videoRef}
                  className="h-full w-full object-cover"
                  poster="/images/products/product-02-800.webp"
                  muted
                  loop
                  playsInline
                  autoPlay={!reducedMotion}
                  controls={reducedMotion}
                  aria-label={t('hero.videoAria')}
                >
                  <source src="/videos/cow_eating.mp4" type="video/mp4" />
                </video>

                <span className="absolute left-4 top-4 rounded-full bg-paper/95 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-pine shadow-sm">
                  {t('hero.cardBadge')}
                </span>

                {!reducedMotion && (
                  <button
                    type="button"
                    onClick={togglePlayback}
                    aria-label={isPaused ? t('hero.playVideo') : t('hero.pauseVideo')}
                    className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-paper/95 text-pine shadow-sm transition hover:bg-paper"
                  >
                    {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  </button>
                )}
              </div>

              <div className="p-5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-ochre">{STORE.name}</p>
                <h2 className="mt-1 text-xl text-ink">{t('hero.cardTitle')}</h2>
                <p className="mt-1 text-xs leading-relaxed text-ink-soft">{t('hero.cardBody')}</p>
                <button onClick={() => setCurrentView('shop')} className="btn btn-accent mt-4 !px-4 !py-2.5 text-xs">
                  {t('hero.cardCta')}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
};
