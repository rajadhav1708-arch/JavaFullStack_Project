import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  ShoppingBag,
  Search,
  Heart,
  Bell,
  PhoneCall,
  User,
  ShieldCheck,
  Store,
  Menu,
  X,
  Truck,
  Repeat,
  Tag,
  ChevronDown,
  LayoutDashboard,
  Calculator,
  LogOut,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    setAdminTab,
    cartItemCount,
    wishlist,
    searchQuery,
    setSearchQuery,
    setIsCartDrawerOpen,
    unreadNotificationCount,
    notifications,
    markNotificationAsRead,
  } = useApp();

  const { user, isLoading: isAuthLoading, openAuthModal, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  // Role is no longer switchable: it comes from the signed-in database record.
  const userRole = user?.role ?? 'customer';
  const isStaff = userRole === 'admin' || userRole === 'employee';

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  const roleLabel =
    userRole === 'customer' ? 'Dairy Farmer' : userRole === 'admin' ? 'Shop Owner (Admin)' : 'Counter Staff';

  const handleRoleChange = (role: 'customer' | 'admin' | 'employee') => {
    setIsRoleDropdownOpen(false);
    if (role === 'admin' || role === 'employee') {
      setCurrentView('admin-dashboard');
      setAdminTab(role === 'employee' ? 'pos' : 'overview');
    } else {
      setCurrentView('home');
    }
  };

  const handleStaffArea = () => {
    if (!user) {
      openAuthModal('Sign in with a staff account to open the shop dashboard.');
      return;
    }
    handleRoleChange(userRole);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setCurrentView('shop');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/25 backdrop-blur-md text-slate-100 border-b border-white/10 shadow-lg">
      {/* Top Banner Notice */}
      <div className="bg-[#064e3b] text-[#a7f3d0] text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <Truck className="w-3.5 h-3.5 text-[#34d399] shrink-0" />
            <span className="text-white">
              <strong className="text-[#34d399]">Village Tractor Express Delivery</strong> within 24 hours | 🌾 Farmer Credit Khata Available
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            {/* Language switcher */}
            <div className="flex items-center gap-1 bg-black/20 rounded-full px-1 py-0.5">
              {(['en', 'hi', 'mr'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-2 py-0.5 rounded-full font-bold uppercase transition-colors ${
                    language === lang ? 'bg-emerald-500 text-white' : 'text-[#a7f3d0] hover:text-white'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>

            <span className="hidden md:flex items-center gap-1.5 text-[#a7f3d0]">
              <PhoneCall className="w-3 h-3 text-[#34d399]" />
              Free Feed Helpline: 1800-425-3333
            </span>

            {/* Quick Role Switcher Pill */}
            {!isAuthLoading && !user ? (
              <button
                onClick={() => openAuthModal()}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-full font-bold text-xs transition-colors cursor-pointer"
              >
                <User className="w-3 h-3" />
                <span>{t('header.signin')}</span>
              </button>
            ) : !isAuthLoading && user ? (
              <div className="relative">
                <button
                  onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                  className="flex items-center gap-1.5 bg-[#065f46] hover:bg-[#044a36] text-white px-2.5 py-0.5 rounded-full font-medium transition-colors cursor-pointer"
                >
                  <ShieldCheck className="w-3 h-3 text-amber-300" />
                  <span className="max-w-[9rem] truncate">{user.name}</span>
                  <span className="hidden sm:inline text-[#a7f3d0]">· {roleLabel}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {isRoleDropdownOpen && (
                  <div className="absolute right-0 mt-1.5 w-64 bg-white text-slate-800 rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <div className="text-sm font-black text-slate-900 truncate">{user.name}</div>
                      <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
                      <div className="mt-1 inline-block text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 rounded-full px-2 py-0.5">
                        {roleLabel}
                      </div>
                    </div>

                    {isStaff && (
                      <button
                        onClick={() => handleStaffArea()}
                        className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-slate-50"
                      >
                        <LayoutDashboard className="w-4 h-4 text-emerald-600" />
                        <div>
                          <div className="font-semibold">Shop Dashboard</div>
                          <div className="text-[10px] text-slate-500">Analytics, Inventory, Khata, POS</div>
                        </div>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setIsRoleDropdownOpen(false);
                        setCurrentView('account');
                      }}
                      className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-slate-50"
                    >
                      <User className="w-4 h-4 text-emerald-600" />
                      <div>
                        <div className="font-semibold">My Account</div>
                        <div className="text-[10px] text-slate-500">Profile, theme, language, sign out</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setIsRoleDropdownOpen(false);
                        void logout();
                      }}
                      className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-red-50 text-red-700 border-t border-slate-100"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="font-semibold">Sign out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-24 h-6 bg-white/10 rounded-full animate-pulse" />
            )}
          </div>
        </div>
      </div>

      {/* Main Header Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          {/* Logo */}
          <div
            onClick={() => {
              if (userRole === 'customer') setCurrentView('home');
              else setCurrentView('admin-dashboard');
            }}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-9 h-9 bg-[#10b981] rounded-lg flex items-center justify-center font-bold text-white text-lg group-hover:scale-105 transition-transform">
              P
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg text-white tracking-tight">AgroFeed Pro</span>
              </div>
              <p className="text-[10px] font-medium text-slate-300 hidden sm:block">
                Cattle Feed & Farm Inventory Hub
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-md mx-4 relative">
            <input
              type="text"
              placeholder="Search products, orders, or farmers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-700/80 rounded-full text-white placeholder-slate-400 text-xs py-2 px-4 pl-9 focus:ring-2 focus:ring-[#10b981] outline-none transition-all"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            {searchQuery && (
              <button
                type="submit"
                className="absolute right-1.5 top-1 bg-[#10b981] hover:bg-[#059669] text-white text-[11px] font-semibold px-2.5 py-1 rounded-full"
              >
                Search
              </button>
            )}
          </form>

          {/* Desktop Nav Links */}
          {userRole === 'customer' ? (
            <nav className="hidden lg:flex items-center gap-6">
              <button
                onClick={() => setCurrentView('home')}
                className={`text-sm font-semibold transition-colors ${
                  currentView === 'home' ? 'text-[#34d399] border-b-2 border-[#34d399] py-1' : 'text-slate-200 hover:text-[#34d399]'
                }`}
              >
                {t('nav.home')}
              </button>
              <button
                onClick={() => setCurrentView('shop')}
                className={`text-sm font-semibold transition-colors ${
                  currentView === 'shop' ? 'text-[#34d399] border-b-2 border-[#34d399] py-1' : 'text-slate-200 hover:text-[#34d399]'
                }`}
              >
                {t('nav.shop')}
              </button>
              <button
                onClick={() => setCurrentView('nutrition-quiz')}
                className={`text-sm font-semibold flex items-center gap-1.5 transition-colors ${
                  currentView === 'nutrition-quiz'
                    ? 'text-[#34d399] border-b-2 border-[#34d399] py-1'
                    : 'text-slate-200 hover:text-[#34d399]'
                }`}
              >
                <Calculator className="w-4 h-4 text-[#34d399]" />
                {t('nav.quiz')}
              </button>
              <button
                onClick={() => setCurrentView('subscriptions')}
                className={`text-sm font-semibold flex items-center gap-1 transition-colors ${
                  currentView === 'subscriptions'
                    ? 'text-[#34d399] border-b-2 border-[#34d399] py-1'
                    : 'text-slate-200 hover:text-[#34d399]'
                }`}
              >
                <Repeat className="w-4 h-4 text-amber-400" />
                {t('nav.subscriptions')}
              </button>
              <button
                onClick={() => setCurrentView('services')}
                className={`text-sm font-semibold transition-colors ${
                  currentView === 'services' ? 'text-[#34d399] border-b-2 border-[#34d399] py-1' : 'text-slate-200 hover:text-[#34d399]'
                }`}
              >
                {t('nav.services')}
              </button>
              <button
                onClick={() => setCurrentView('offers')}
                className={`text-sm font-semibold flex items-center gap-1 transition-colors ${
                  currentView === 'offers' ? 'text-[#34d399] border-b-2 border-[#34d399] py-1' : 'text-slate-200 hover:text-[#34d399]'
                }`}
              >
                <Tag className="w-4 h-4 text-[#34d399]" />
                {t('nav.offers')}
              </button>
            </nav>
          ) : (
            <div className="hidden lg:flex items-center gap-3">
              <span className="text-xs bg-amber-100 text-amber-900 border border-amber-300 font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-amber-700" />
                {userRole === 'admin' ? 'Shop Admin Dashboard' : 'POS Counter Mode'}
              </span>
            </div>
          )}

          {/* Action Buttons (AI Assistant, Notification, Cart, Profile) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* The floating Dr. Pashu AI button is the single chat entry point. */}

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setIsNotifDropdownOpen(!isNotifDropdownOpen)}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl relative transition-colors cursor-pointer"
              >
                <Bell className="w-5 h-5" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadNotificationCount}
                  </span>
                )}
              </button>

              {isNotifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                    <span className="font-bold text-sm text-slate-800">Notifications</span>
                    <span className="text-xs text-slate-500">{unreadNotificationCount} new</span>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => markNotificationAsRead(notif.id)}
                        className={`p-2.5 rounded-xl text-xs cursor-pointer transition-colors ${
                          notif.read ? 'bg-slate-50 text-slate-600' : 'bg-emerald-50 text-slate-800 font-medium'
                        }`}
                      >
                        <div className="font-semibold text-slate-900 mb-0.5">{notif.title}</div>
                        <p className="text-slate-600 text-[11px] leading-snug">{notif.message}</p>
                        <span className="text-[10px] text-slate-400 mt-1 block">{notif.timestamp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Wishlist Button */}
            {userRole === 'customer' && (
              <button
                onClick={() => setCurrentView('customer-dashboard')}
                className="hidden sm:flex p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl relative transition-colors cursor-pointer"
                title="Wishlist"
              >
                <Heart className="w-5 h-5" />
                {wishlist.length > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-emerald-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {wishlist.length}
                  </span>
                )}
              </button>
            )}

            {/* Cart Button */}
            <button
              onClick={() => setIsCartDrawerOpen(true)}
              className="flex items-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white px-3.5 py-2 rounded-xl font-medium text-xs shadow-xs transition-colors cursor-pointer"
            >
              <div className="relative">
                <ShoppingBag className="w-4 h-4" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-2 -right-2.5 w-4 h-4 bg-amber-500 text-slate-950 font-black text-[10px] rounded-full flex items-center justify-center border border-white">
                    {cartItemCount}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline font-bold">Cart</span>
            </button>

            {/* User Profile / Dashboard Button */}
            <button
              onClick={() => {
                if (!user) {
                  openAuthModal('Sign in to see your orders, Khata balance and subscriptions.');
                  return;
                }
                setCurrentView(userRole === 'customer' ? 'customer-dashboard' : 'admin-dashboard');
              }}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
              title={
                !user
                  ? 'Sign in'
                  : userRole === 'customer'
                    ? 'Customer Account'
                    : 'Admin Portal'
              }
            >
              <User className="w-5 h-5" />
            </button>

            {/* Mobile Hamburger Menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-xl"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              placeholder="Search feed, calcium, bypass fat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 border border-slate-200 text-slate-800 text-sm rounded-xl pl-9 pr-4 py-2 outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </form>

          {userRole === 'customer' ? (
            <div className="grid grid-cols-2 gap-2 text-sm font-semibold pt-2">
              <button
                onClick={() => {
                  setCurrentView('home');
                  setIsMobileMenuOpen(false);
                }}
                className="p-2.5 text-left rounded-lg bg-slate-50 text-slate-800"
              >
                🏠 {t('nav.home')}
              </button>
              <button
                onClick={() => {
                  setCurrentView('shop');
                  setIsMobileMenuOpen(false);
                }}
                className="p-2.5 text-left rounded-lg bg-slate-50 text-slate-800"
              >
                🌾 {t('nav.shop')}
              </button>
              <button
                onClick={() => {
                  setCurrentView('nutrition-quiz');
                  setIsMobileMenuOpen(false);
                }}
                className="p-2.5 text-left rounded-lg bg-emerald-50 text-emerald-800"
              >
                🧮 {t('nav.quiz')}
              </button>
              <button
                onClick={() => {
                  setCurrentView('subscriptions');
                  setIsMobileMenuOpen(false);
                }}
                className="p-2.5 text-left rounded-lg bg-amber-50 text-amber-900"
              >
                🔄 {t('nav.subscriptions')}
              </button>
              <button
                onClick={() => {
                  setCurrentView('customer-dashboard');
                  setIsMobileMenuOpen(false);
                }}
                className="p-2.5 text-left rounded-lg bg-slate-50 text-slate-800"
              >
                👤 My Account / Khata
              </button>
              <button
                onClick={() => {
                  setCurrentView('offers');
                  setIsMobileMenuOpen(false);
                }}
                className="p-2.5 text-left rounded-lg bg-slate-50 text-slate-800"
              >
                🏷️ {t('nav.offers')}
              </button>
            </div>
          ) : (
            <div className="pt-2">
              <button
                onClick={() => {
                  setCurrentView('admin-dashboard');
                  setIsMobileMenuOpen(false);
                }}
                className="w-full p-3 bg-emerald-800 text-white font-bold rounded-xl text-center"
              >
                Go to SaaS Admin Portal
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
