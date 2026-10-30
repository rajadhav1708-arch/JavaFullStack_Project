import React from 'react';
import { Link } from 'react-router-dom';
import { STORE } from '../../data/store';
import { useLanguage } from '../../context/LanguageContext';
import { Phone, Mail, MapPin } from 'lucide-react';

const SHOP_LINKS = [
  { to: '/shop', labelKey: 'common.feedCatalogue' as const },
  { to: '/nutrition-quiz', labelKey: 'common.rationCalculator' as const },
  { to: '/offers', labelKey: 'common.offers' as const },
  { to: '/services', labelKey: 'common.farmerServices' as const },
];

const ACCOUNT_LINKS = [
  { to: '/account', labelKey: 'common.account' as const },
  { to: '/customer-dashboard', labelKey: 'common.ordersKhata' as const },
  { to: '/order-tracking', labelKey: 'common.trackOrder' as const },
  { to: '/login', labelKey: 'common.signIn' as const },
];

export const Footer: React.FC = () => {
  const { t } = useLanguage();
  return (
    <footer className="no-print relative z-10 border-t border-line bg-paper">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2 lg:pr-12">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pine font-display text-lg font-semibold text-cream">
                H
              </span>
              <span className="font-display text-xl font-semibold tracking-tight text-ink">{STORE.name}</span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-soft">{t('common.footerBlurb')}</p>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-ochre">
              {t('common.villagePartner')}
            </p>
          </div>

          <div>
            <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink">{t('common.shop')}</h2>
            <ul className="mt-4 space-y-2.5">
              {SHOP_LINKS.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-ink-soft transition-colors hover:text-pine">
                    {t(link.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink">{t('common.account')}</h2>
            <ul className="mt-4 space-y-2.5">
              {ACCOUNT_LINKS.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-ink-soft transition-colors hover:text-pine">
                    {t(link.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 grid gap-4 border-t border-line pt-8 text-sm text-ink-soft sm:grid-cols-3">
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-pine" />
            {STORE.region}
          </span>
          <a href={STORE.phoneHref} className="flex items-center gap-2 transition-colors hover:text-pine">
            <Phone className="h-4 w-4 shrink-0 text-pine" />
            {STORE.phone}
          </a>
          <a href={STORE.emailHref} className="flex items-center gap-2 transition-colors hover:text-pine">
            <Mail className="h-4 w-4 shrink-0 text-pine" />
            {STORE.email}
          </a>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-line pt-6 text-[11px] text-ink-soft sm:flex-row">
          <p>© {new Date().getFullYear()} {STORE.name}. {t('common.allRights')}</p>
          <p>{t('header.gstNote')}</p>
        </div>
      </div>
    </footer>
  );
};
