import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ToastContainer } from './components/common/ToastContainer';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { HeroSection } from './components/landing/HeroSection';
import { CategoryGrid } from './components/landing/CategoryGrid';
import { FeaturedProducts } from './components/landing/FeaturedProducts';
import { FarmerServicesSection } from './components/landing/FarmerServicesSection';
import { TestimonialsSection } from './components/landing/TestimonialsSection';
import { OffersPage } from './components/landing/OffersPage';
import { ProductListing } from './components/shop/ProductListing';
import { ProductDetailModal } from './components/shop/ProductDetailModal';
import { CartDrawer } from './components/shop/CartDrawer';
import { CheckoutModal } from './components/shop/CheckoutModal';
import { OrderTrackingModal } from './components/shop/OrderTrackingModal';
import { SmartRationQuiz } from './components/nutrition/SmartRationQuiz';
import { CustomerDashboard } from './components/customer/CustomerDashboard';
import { SubscriptionManager } from './components/subscriptions/SubscriptionManager';
import { AccountPage } from './components/customer/AccountPage';
import { AdminLayout } from './components/admin/AdminLayout';
import { AIChatbotWidget } from './components/chat/AIChatbotWidget';
import { ScrollAnimationBackground } from './components/landing/ScrollAnimationBackground';
import { AuthModal } from './components/auth/AuthModal';
import { useRevealOnScroll } from './hooks/useRevealOnScroll';
import { useScrollFrame } from './hooks/useScrollProgress';
import type { MainView } from './types';

/**
 * Browsing is public. These views only *write* data - placing an order, or
 * touching shop records - so they need an account. The server enforces the same
 * rule on the matching endpoints; this just avoids rendering a dead screen.
 */
const SIGN_IN_REQUIRED: Partial<Record<MainView, string>> = {
  checkout: 'Sign in to place your order and get the bill.',
  'customer-dashboard': 'Sign in to see your orders, Khata balance and subscriptions.',
  subscriptions: 'Sign in to manage your feed subscriptions.',
  'admin-dashboard': 'Sign in with a staff account to open the shop dashboard.',
  account: 'Sign in to manage your account.',
};

/** Signed in, but staff only. A customer account must not reach shop records. */
const STAFF_ONLY: Partial<Record<MainView, string>> = {
  'admin-dashboard': 'The shop dashboard is for staff accounts only.',
};

/** Thin emerald line at the very top showing how far the page is scrolled. */
const ScrollProgressBar: React.FC = () => {
  const barRef = React.useRef<HTMLDivElement>(null);
  useScrollFrame((scrollY: number) => {
    const el = barRef.current;
    if (!el) return;
    const doc = document.documentElement;
    const max = Math.max(1, doc.scrollHeight - window.innerHeight);
    el.style.transform = `scaleX(${Math.min(1, Math.max(0, scrollY / max))})`;
  });
  return (
    <div className="fixed top-0 left-0 right-0 h-[3px] z-[60] pointer-events-none bg-white/5">
      <div
        ref={barRef}
        id="scroll-progress-bar"
        className="h-full w-full bg-gradient-to-r from-emerald-400 to-amber-300"
      />
    </div>
  );
};

const MainAppContent: React.FC = () => {
  const { currentView, setCurrentView } = useApp();
  const { user, openAuthModal } = useAuth();

  useRevealOnScroll();

  // One page-view beacon per browser tab: the owner's Access tab counts these.
  React.useEffect(() => {
    if (sessionStorage.getItem('pashufeed_beacon')) return;
    sessionStorage.setItem('pashufeed_beacon', '1');
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: window.location.pathname }),
    }).catch(() => {});
  }, []);

  // Any <img> whose source 404s (dead CDN id, missing asset) gracefully swaps
  // to the local placeholder instead of showing the browser's broken-image icon.
  React.useEffect(() => {
    const onError = (event: Event): void => {
      const target = event.target;
      if (target instanceof HTMLImageElement && !target.src.endsWith('placeholder.svg')) {
        target.src = '/images/placeholder.svg';
      }
    };
    document.addEventListener('error', onError, true);
    return () => document.removeEventListener('error', onError, true);
  }, []);

  const isStaff = user?.role === 'admin' || user?.role === 'employee';

  // When the auth gate fires we remember where the user was trying to go:
  // - sign in succeeds  -> they are sent to the page they asked for,
  // - the modal is dismissed -> they are returned to the home page.
  const pendingViewRef = React.useRef<MainView | null>(null);

  React.useEffect(() => {
    const staffReason = STAFF_ONLY[currentView];
    if (staffReason && !user) {
      pendingViewRef.current = currentView;
      openAuthModal(SIGN_IN_REQUIRED[currentView]);
      return;
    }
    if (staffReason && !isStaff) {
      // Signed in, but a customer cannot use the shop dashboard.
      pendingViewRef.current = null;
      openAuthModal(staffReason);
      setCurrentView('home');
      return;
    }
    if (!user && SIGN_IN_REQUIRED[currentView]) {
      pendingViewRef.current = currentView;
      openAuthModal(SIGN_IN_REQUIRED[currentView]);
    }
  }, [user, isStaff, currentView, openAuthModal, setCurrentView]);

  const { isAuthModalOpen } = useAuth();

  // Successful sign-in sends the user to the page the gate interrupted.
  React.useEffect(() => {
    if (!user || !pendingViewRef.current) return;
    const target = pendingViewRef.current;
    pendingViewRef.current = null;
    const denied = STAFF_ONLY[target] && !isStaff;
    if (denied) {
      setCurrentView('home');
    } else {
      setCurrentView(target);
    }
  }, [user, isStaff, setCurrentView]);

  // Closing the modal without signing in returns the user to home.
  const wasModalOpenRef = React.useRef(false);
  React.useEffect(() => {
    const justClosed = wasModalOpenRef.current && !isAuthModalOpen;
    wasModalOpenRef.current = isAuthModalOpen;
    if (justClosed && pendingViewRef.current && !user) {
      pendingViewRef.current = null;
      setCurrentView('home');
    }
  }, [isAuthModalOpen, user, setCurrentView]);

  const guard = (view: MainView, content: React.ReactNode) => {
    if (STAFF_ONLY[view] && !isStaff) return null;
    if (!user && SIGN_IN_REQUIRED[view]) return null;
    return content;
  };

  return (
    <div className="min-h-screen flex flex-col bg-transparent font-sans text-slate-100 antialiased selection:bg-[#10b981] selection:text-white relative">
      <ScrollAnimationBackground />
      <ScrollProgressBar />

      {/* Global Toast System */}
      <ToastContainer />

      {/* Sign in / register dialog */}
      <AuthModal />

      {/* Navigation Header */}
      <Header />

      {/* Main View Router */}
      <main className="flex-1">
        {currentView === 'home' && (
          <div className="space-y-12 pb-12">
            <HeroSection />
            <CategoryGrid />
            <FeaturedProducts />
            <FarmerServicesSection />
            <TestimonialsSection />
          </div>
        )}

        {currentView === 'shop' && <ProductListing />}
        {currentView === 'nutrition-quiz' && <SmartRationQuiz />}
        {currentView === 'services' && <FarmerServicesSection />}
        {currentView === 'offers' && <OffersPage />}
        {currentView === 'order-tracking' && guard('order-tracking', <OrderTrackingModal />)}
        {currentView === 'checkout' && guard('checkout', <CheckoutModal />)}
        {currentView === 'customer-dashboard' && guard('customer-dashboard', <CustomerDashboard />)}
        {currentView === 'subscriptions' && guard('subscriptions', <SubscriptionManager />)}
        {currentView === 'admin-dashboard' && guard('admin-dashboard', <AdminLayout />)}
        {currentView === 'account' && guard('account', <AccountPage />)}
      </main>

      {/* Global Overlays & Widgets */}
      <ProductDetailModal />
      <CartDrawer />
      <AIChatbotWidget />

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <LanguageProvider>
          <MainAppContent />
        </LanguageProvider>
      </AppProvider>
    </AuthProvider>
  );
}