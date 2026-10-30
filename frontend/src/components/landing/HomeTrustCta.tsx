import React from 'react';
import { useApp } from '../../context/AppContext';
import { STORE } from '../../data/store';
import { useLanguage } from '../../context/LanguageContext';
import { ArrowRight, ShieldCheck, Phone, Sparkles } from 'lucide-react';

/**
 * Closing trust band on the homepage. Replaces the old product grids with a
 * brand-led call to action into the feed store — no catalogue cards here.
 */
export const HomeTrustCta: React.FC = () => {
  const { setCurrentView } = useApp();
  const { t } = useLanguage();

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div data-reveal className="relative overflow-hidden rounded-[2rem] border border-line bg-paper/95 px-6 py-12 text-ink shadow-sm sm:px-12 sm:py-16">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full border border-pine/10" />
        <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full border border-pine/10" />

        <div className="relative grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="eyebrow !text-ochre">
              <Sparkles className="h-3.5 w-3.5" />
              {t('home.trustEyebrow')}
            </p>
            <h2 className="mt-4 max-w-xl text-3xl leading-tight text-ink sm:text-4xl">{t('home.trustTitle')}</h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-soft sm:text-base">
              {t('home.trustBody', { name: STORE.name })}
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:col-span-5 lg:items-end">
            <button onClick={() => setCurrentView('shop')} className="btn btn-accent w-full !px-6 !py-3.5 sm:w-auto">
              {t('home.trustCta')}
              <ArrowRight className="h-4 w-4" />
            </button>
            <a
              href={STORE.phoneHref}
              className="inline-flex items-center justify-center gap-2 text-sm font-bold text-pine hover:text-pine-deep sm:w-auto"
            >
              <Phone className="h-4 w-4 text-ochre" />
              {STORE.phone}
            </a>
            <p className="flex items-center gap-1.5 text-[11px] text-ink-soft">
              <ShieldCheck className="h-3.5 w-3.5 text-ochre" />
              {t('home.trustStrip')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
