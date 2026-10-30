import React from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { Calculator, BookOpen, Truck, Receipt, ArrowRight, Sprout } from 'lucide-react';

const SERVICES = [
  {
    id: 'ration',
    titleKey: 'services.rationTitle',
    descriptionKey: 'services.rationBody',
    ctaKey: 'services.rationCta',
    view: 'nutrition-quiz' as const,
    icon: Calculator,
  },
  {
    id: 'khata',
    titleKey: 'services.khataTitle',
    descriptionKey: 'services.khataBody',
    ctaKey: 'services.khataCta',
    view: 'customer-dashboard' as const,
    icon: BookOpen,
  },
  {
    id: 'tracking',
    titleKey: 'services.trackingTitle',
    descriptionKey: 'services.trackingBody',
    ctaKey: 'services.trackingCta',
    view: 'order-tracking' as const,
    icon: Truck,
  },
  {
    id: 'invoices',
    titleKey: 'services.gstTitle',
    descriptionKey: 'services.gstBody',
    ctaKey: 'services.gstCta',
    view: 'customer-dashboard' as const,
    icon: Receipt,
  },
] as const;

export const FarmerServicesSection: React.FC = () => {
  const { setCurrentView } = useApp();
  const { t } = useLanguage();

  return (
    <section className="border-b border-line py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div data-reveal className="max-w-2xl">
          <p className="eyebrow">
            <Sprout className="h-3.5 w-3.5" />
            {t('services.eyebrow')}
          </p>
          <h2 className="mt-3 text-3xl text-ink sm:text-4xl">{t('services.title')}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{t('services.subtitle')}</p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((service, index) => {
            const Icon = service.icon;
            return (
              <article
                key={service.id}
                data-reveal
                data-reveal-delay={String(index * 70)}
                className="card group flex flex-col justify-between p-6 transition-all hover:-translate-y-1 hover:border-pine/40 hover:shadow-xl hover:shadow-ink/10"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pine-soft text-pine">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="font-display text-2xl text-line">0{index + 1}</span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-ink">{t(service.titleKey)}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-ink-soft">{t(service.descriptionKey)}</p>
                </div>

                <button
                  onClick={() => setCurrentView(service.view)}
                  className="mt-6 flex items-center justify-between border-t border-line pt-4 text-xs font-bold text-pine transition-colors hover:text-pine-deep"
                >
                  <span>{t(service.ctaKey)}</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
