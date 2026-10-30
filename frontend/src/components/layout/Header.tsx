import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { STORE } from '../../data/store';
import {
  ShoppingBag,
  Search,
  Phone,
  User,
  Menu,
  X,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  ArrowUpRight,
} from 'lucide-react';

const NAV_LINKS = [
  { path: '/home', labelKey: 'nav.home', view: 'home' },
  { path: '/shop', labelKey: 'nav.shop', view: 'shop' },
  { path: '/nutrition-quiz', labelKey: 'nav.quiz', view: 'nutrition-quiz' },
  { path: '/services', labelKey: 'nav.services', view: 'services' },
  { path: '/offers', labelKey: 'nav.offers', view: 'offers' },
] as const;

export const Header: React.FC = () => {
  const {
    currentView,
    cartItemCount,
    searchQuery,
    setSearchQuery,
    setIsCartDrawerOpen,
  } = useApp();

  const { user, isLoading: isAuthLoading, redirectToLogin, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();

  const isStaff = user?.role === 'admin' || user?.role === 'employee';
  const roleKey = user?.role === 'admin' ? 'role.admin' : user?.role === 'employee' ? 'role.employee' : 'role.customer';
  const roleLabel = t(roleKey);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (searchQuery.trim()) navigate('/shop');
  };

  const goTo = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
    setIsAccountMenuOpen(false);
  };

  return (
    <header className="no-print sticky top-0 z-40 border-b border-line bg-cream/90 backdrop-blur-md">
      <div className="bg-pine-deep text-cream">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-1.5 px-4 py-2 text-[11px] sm:flex-row sm:px-6 lg:px-8">
          <p className="text-center text-cream/80 sm:text-left">
            {t('header.gstNote')} <span className="mx-1.5 text-cream/40">·</span> {t('header.khataNote')}
          </p>

          <div className="flex items-center gap-4">
            <a
              href={STORE.phoneHref}
              className="hidden items-center gap-1.5 text-cream/80 transition-colors hover:text-cream md:flex"
            >
              <Phone className="h-3 w-3" />
              {STORE.phone}
            </a>

            <div className="flex items-center gap-1 rounded-full bg-black/15 p-0.5">
              {(['en', 'hi', 'mr'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`rounded-full px-2 py-0.5 font-bold uppercase transition-colors ${
                    language === lang ? 'bg-ochre text-white' : 'text-cream/70 hover:text-cream'
                  }`}
                  aria-label={t('header.switchLang', { lang: lang.toUpperCase() })}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-[4.5rem] items-center justify-between gap-4">
          <button onClick={() => goTo('/home')} className="group flex shrink-0 items-center gap-2.5 text-left">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pine font-display text-lg font-semibold text-cream transition-transform group-hover:-rotate-3">
              H
            </span>
            <span className="leading-tight">
              <span className="block font-display text-lg font-semibold tracking-tight text-ink">
                {STORE.name}
              </span>
              <span className="hidden text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-soft sm:block">
                {STORE.tagline}
              </span>
            </span>
          </button>

          <nav className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((link) => {
              const active = currentView === link.view;
              return (
                <button
                  key={link.path}
                  onClick={() => goTo(link.path)}
                  className={`rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors ${
                    active ? 'bg-pine-soft text-pine' : 'text-ink-soft hover:bg-pine-soft/60 hover:text-ink'
                  }`}
                >
                  {t(link.labelKey)}
                </button>
              );
            })}
          </nav>

          <form onSubmit={handleSearchSubmit} className="relative hidden max-w-xs flex-1 md:block">
            <input
              type="search"
              placeholder={t('header.searchPlaceholder')}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="field !rounded-full !py-2 pl-9 pr-3 text-xs"
              aria-label={t('header.searchAria')}
            />
            <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-ink-soft" />
          </form>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCartDrawerOpen(true)}
              className="btn btn-primary !px-3.5 !py-2.5 text-xs"
              aria-label={t('header.openCartAria', { count: cartItemCount })}
            >
              <span className="relative">
                <ShoppingBag className="h-4 w-4" />
                {cartItemCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-ochre px-1 text-[9px] font-black text-white">
                    {cartItemCount}
                  </span>
                )}
              </span>
              <span className="hidden sm:inline">{t('header.cart')}</span>
            </button>

            {!isAuthLoading && !user && (
              <button onClick={() => redirectToLogin()} className="btn btn-outline hidden !px-3.5 !py-2.5 text-xs sm:inline-flex">
                <User className="h-4 w-4" />
                {t('header.signin')}
              </button>
            )}

            {!isAuthLoading && user && (
              <div className="relative">
                <button
                  onClick={() => setIsAccountMenuOpen((open) => !open)}
                  className="btn btn-outline !px-3 !py-2.5 text-xs"
                  aria-expanded={isAccountMenuOpen}
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-pine text-[10px] font-black text-cream">
                    {user.name.trim().charAt(0).toUpperCase() || 'F'}
                  </span>
                  <span className="hidden max-w-[7rem] truncate sm:inline">{user.name}</span>
                  <ChevronDown className="h-3 w-3 text-ink-soft" />
                </button>

                {isAccountMenuOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-line bg-paper shadow-xl shadow-ink/10">
                    <div className="border-b border-line px-4 py-3">
                      <p className="truncate text-sm font-bold text-ink">{user.name}</p>
                      <p className="truncate text-[11px] text-ink-soft">{user.email}</p>
                      <span className="mt-1.5 inline-block rounded-full bg-pine-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-pine">
                        {roleLabel}
                      </span>
                    </div>

                    <div className="p-1.5">
                      <button
                        onClick={() => goTo('/account')}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-ink hover:bg-cream"
                      >
                        <User className="h-4 w-4 text-pine" />
                        {t('header.myAccount')}
                      </button>

                      {isStaff ? (
                        <button
                          onClick={() => goTo('/admin-dashboard')}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-ink hover:bg-cream"
                        >
                          <LayoutDashboard className="h-4 w-4 text-pine" />
                          {t('header.shopDashboard')}
                        </button>
                      ) : (
                        <button
                          onClick={() => goTo('/customer-dashboard')}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-ink hover:bg-cream"
                        >
                          <LayoutDashboard className="h-4 w-4 text-pine" />
                          {t('header.myOrdersKhata')}
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setIsAccountMenuOpen(false);
                          void logout();
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-clay hover:bg-clay/5"
                      >
                        <LogOut className="h-4 w-4" />
                        {t('header.signout')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setIsMobileMenuOpen((open) => !open)}
              className="rounded-xl border border-line p-2 text-ink lg:hidden"
              aria-label="Toggle navigation menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="border-t border-line bg-paper px-4 pb-6 pt-4 lg:hidden">
          <form onSubmit={handleSearchSubmit} className="relative mb-4">
            <input
              type="search"
              placeholder={t('header.searchPlaceholderMobile')}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="field pl-9"
            />
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-ink-soft" />
          </form>

          <nav className="grid grid-cols-2 gap-2">
            {NAV_LINKS.map((link) => (
              <button
                key={link.path}
                onClick={() => goTo(link.path)}
                className={`rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${
                  currentView === link.view ? 'bg-pine text-cream' : 'bg-cream text-ink'
                }`}
              >
                {t(link.labelKey)}
              </button>
            ))}
          </nav>

          <div className="mt-4 border-t border-line pt-4">
            {user ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink">{user.name}</span>
                  <span className="rounded-full bg-pine-soft px-2 py-0.5 font-bold text-pine">{roleLabel}</span>
                </div>
                <button onClick={() => goTo('/account')} className="btn btn-outline w-full">
                  {t('header.myAccount')}
                </button>
                <button
                  onClick={() => goTo(isStaff ? '/admin-dashboard' : '/customer-dashboard')}
                  className="btn btn-outline w-full"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  {isStaff ? t('header.shopDashboard') : t('header.myOrdersKhata')}
                </button>
                <button onClick={() => void logout()} className="btn w-full text-clay">
                  <LogOut className="h-4 w-4" />
                  {t('header.signout')}
                </button>
              </div>
            ) : (
              <button onClick={() => redirectToLogin()} className="btn btn-primary w-full">
                {t('header.signin')}
                <ArrowUpRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
