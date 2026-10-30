import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProviderWrapper as AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ToastContainer } from './components/common/ToastContainer';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { HeroSection } from './components/landing/HeroSection';
import { ScrollAnimationBackground } from './components/landing/ScrollAnimationBackground';
import { HomeTrustCta } from './components/landing/HomeTrustCta';
import { FarmerServicesSection } from './components/landing/FarmerServicesSection';
import { HowItWorksSection } from './components/landing/HowItWorksSection';
import { OffersPage } from './components/landing/OffersPage';
import { ProductListing } from './components/shop/ProductListing';
import { ProductDetailModal } from './components/shop/ProductDetailModal';
import { CartDrawer } from './components/shop/CartDrawer';
import { CheckoutModal } from './components/shop/CheckoutModal';
import { OrderTrackingModal } from './components/shop/OrderTrackingModal';
import { SmartRationQuiz } from './components/nutrition/SmartRationQuiz';
import { CustomerDashboard } from './components/customer/CustomerDashboard';
import { AccountPage } from './components/customer/AccountPage';
import { AdminLayout } from './components/admin/AdminLayout';
import { AIChatbotWidget } from './components/chat/AIChatbotWidget';
import { LoginPage } from './components/auth/LoginPage';
import { useRevealOnScroll } from './hooks/useRevealOnScroll';
import { useScrollFrame } from './hooks/useScrollProgress';
import type { MainView } from './types';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

// Framer's `ease` is a union of named easings and cubic-bezier tuples, so a
// bare object literal widens to `string` and is rejected. 'easeInOut' is the
// built-in the original was reaching for.
const pageTransition = { type: 'tween', ease: 'easeInOut', duration: 0.35 } as const;

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
    >
      {children}
    </motion.div>
  );
}

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
    <div className="no-print pointer-events-none fixed top-0 left-0 right-0 z-[60] h-[3px] bg-line/40">
      <div
        ref={barRef}
        id="scroll-progress-bar"
        className="h-full w-full bg-gradient-to-r from-pine to-ochre"
      />
    </div>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode; staffOnly?: boolean; customerOnly?: boolean }> = ({
  children,
  staffOnly,
  customerOnly,
}) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // Still restoring the session from the cookie — never bounce to login yet.
  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-pine border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (staffOnly && user.role !== 'admin' && user.role !== 'employee') {
    return <Navigate to="/home" replace />;
  }

  // Customer-only pages: staff belong in the admin dashboard, not "My Orders".
  if (customerOnly && (user.role === 'admin' || user.role === 'employee')) {
    return <Navigate to="/admin-dashboard" replace />;
  }

  return <>{children}</>;
};

const PATH_TO_VIEW: Record<string, MainView> = {
  '/home': 'home',
  '/shop': 'shop',
  '/nutrition-quiz': 'nutrition-quiz',
  '/services': 'services',
  '/offers': 'offers',
  '/checkout': 'checkout',
  '/order-tracking': 'order-tracking',
  '/customer-dashboard': 'customer-dashboard',
  '/subscriptions': 'subscriptions',
  '/admin-dashboard': 'admin-dashboard',
  '/account': 'account',
  '/login': 'login',
};

const MainRoutes: React.FC = () => {
  const { setCurrentView } = useApp();
  const { user } = useAuth();
  const location = useLocation();

  // Keep the legacy currentView state (header highlight) in sync with the URL,
  // which is the source of truth for what Routes renders.
  React.useEffect(() => {
    const view = PATH_TO_VIEW[location.pathname];
    if (view) setCurrentView(view);
  }, [location.pathname, setCurrentView]);

  useRevealOnScroll();

  React.useEffect(() => {
    if (sessionStorage.getItem('pashufeed_beacon')) return;
    sessionStorage.setItem('pashufeed_beacon', '1');
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: window.location.pathname }),
    }).catch(() => {});
  }, []);

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
  const isLogin = location.pathname === '/login';

  // The fixed scroll-scrubbed background paints below its ancestors'
  // backgrounds, so its page must not carry an opaque one (CSS paint order:
  // a positioned parent's background covers negative z-index children).
  // Other routes keep the solid cream shell.
  const shellBg = location.pathname === '/home' ? 'bg-transparent' : 'bg-cream';

  return (
    <div className={`app-shell relative flex min-h-screen flex-col ${shellBg} font-sans text-ink antialiased`}>
      {location.pathname === '/home' && <ScrollAnimationBackground />}

      <ScrollProgressBar />

      <ToastContainer />

      {!isLogin && <Header />}

      <main className="flex-1">
        <ErrorBoundary>
          <AnimatePresence mode="wait">
            <Routes location={location}>
              <Route path="/login" element={<PageWrapper><LoginPage /></PageWrapper>} />
              <Route path="/home" element={
                <PageWrapper>
                  <div className="space-y-12 pb-12">
                    <HeroSection />
                    {/* Empty scroll stage: after the hero (video card) leaves the
                        viewport, only the full-opacity scrubbed background is
                        visible here — no content renders until the stage ends. */}
                    <div id="home-stage" className="h-[120vh]" aria-hidden="true" />
                    {/* Revealed only after the stage parallax completes —
                        html[data-parallax-done] flips `.home-reveal` (index.css).
                        Stays visible if the animation cannot run. */}
                    <div className="home-reveal space-y-12">
                      <FarmerServicesSection />
                      <HowItWorksSection />
                      <HomeTrustCta />
                    </div>
                  </div>
                </PageWrapper>
              } />
              <Route path="/shop" element={
                <PageWrapper><ProductListing /></PageWrapper>
              } />
              <Route path="/nutrition-quiz" element={
                <PageWrapper><SmartRationQuiz /></PageWrapper>
              } />
              <Route path="/services" element={
                <PageWrapper><FarmerServicesSection /></PageWrapper>
              } />
              <Route path="/offers" element={
                <PageWrapper><OffersPage /></PageWrapper>
              } />
              <Route path="/order-tracking" element={
                <ProtectedRoute>
                  <PageWrapper><OrderTrackingModal /></PageWrapper>
                </ProtectedRoute>
              } />
              <Route path="/checkout" element={
                <ProtectedRoute>
                  <PageWrapper><CheckoutModal /></PageWrapper>
                </ProtectedRoute>
              } />
            <Route path="/customer-dashboard" element={
              <ProtectedRoute customerOnly>
                <PageWrapper><CustomerDashboard /></PageWrapper>
              </ProtectedRoute>
            } />
              <Route path="/subscriptions" element={<Navigate to="/shop" replace />} />
              <Route path="/admin-dashboard" element={
                <ProtectedRoute staffOnly>
                  <PageWrapper><AdminLayout /></PageWrapper>
                </ProtectedRoute>
              } />
              <Route path="/account" element={
                <ProtectedRoute>
                  <PageWrapper><AccountPage /></PageWrapper>
                </ProtectedRoute>
              } />
              <Route path="/" element={<Navigate to="/home" replace />} />
              <Route path="*" element={<Navigate to="/home" replace />} />
            </Routes>
          </AnimatePresence>
        </ErrorBoundary>
      </main>

      <ProductDetailModal />
      <CartDrawer />
      {!isLogin && <AIChatbotWidget />}
      {!isLogin && <Footer />}
    </div>
  );
};

export default function AppRoutes() {
  return (
    <AuthProvider>
      <AppProvider>
        <LanguageProvider>
          <MainRoutes />
        </LanguageProvider>
      </AppProvider>
    </AuthProvider>
  );
}