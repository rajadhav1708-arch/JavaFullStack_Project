import React from 'react';
import { useApp } from '../../context/AppContext';
import { STORE } from '../../data/store';
import { useLanguage } from '../../context/LanguageContext';
import { ClipboardList, CreditCard, Truck, ArrowRight, Phone } from 'lucide-react';

const STEPS = [
  { titleKey: 'how.step1Title', descriptionKey: 'how.step1Body', icon: ClipboardList },
  { titleKey: 'how.step2Title', descriptionKey: 'how.step2Body', icon: CreditCard },
  { titleKey: 'how.step3Title', descriptionKey: 'how.step3Body', icon: Truck },
] as const;

export const HowItWorksSection: React.FC = () => {
  const { setCurrentView } = useApp();
  const { t } = useLanguage();

  return (
    <section className="bg-transparent py-16 text-ink sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-start">
          <div data-reveal className="lg:col-span-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ochre">{t('how.eyebrow')}</p>
            <h2 className="mt-3 text-3xl text-ink sm:text-4xl">{t('how.title')}</h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-soft">{t('how.body')}</p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={() => setCurrentView('shop')} className="btn btn-accent">
                {t('how.ctaOrder')}
                <ArrowRight className="h-4 w-4" />
              </button>
              <a href={STORE.phoneHref} className="btn border border-line text-ink hover:bg-paper">
                <Phone className="h-4 w-4" />
                {t('how.ctaCall')}
              </a>
            </div>
          </div>

          <ol className="grid gap-4 sm:grid-cols-3 lg:col-span-8">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <li
                  key={step.titleKey}
                  data-reveal
                  data-reveal-delay={String(index * 80)}
                  className="rounded-2xl border border-line bg-paper/95 shadow-sm p-5"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-pine-soft/60 text-ochre">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="font-display text-2xl text-ink/15">0{index + 1}</span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-ink">{t(step.titleKey)}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-ink-soft">{t(step.descriptionKey)}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
};
