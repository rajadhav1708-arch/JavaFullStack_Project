import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProviderWrapper as AuthProvider, useAuth } from './context/AuthContext';
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
import { LoginPage } from './components/auth/LoginPage';
import { useRevealOnScroll } from './hooks/useRevealOnScroll';
import { useScrollFrame } from './hooks/useScrollProgress';
import type { MainView } from './types';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const pageTransition = { type: 'tween', ease: 'anticipate', duration: 0.35 };

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
    <div className="fixed top-0 left-0 right-0 h-[3px] z-[60] pointer-events-none bg-white/5">
      <div
        ref={barRef}
        id="scroll-progress-bar"
        className="h-full w-full bg-gradient-to-r from-emerald-400 to-amber-300"
      />
    </div>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode; staffOnly?: boolean }> = ({ children, staffOnly }) => {
  const { user } = useAuth();
  const { setCurrentView } = useApp();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (staffOnly && user.role !== 'admin' && user.role !== 'employee') {
    return <Navigate to="/home" replace />;
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
  const { user, isAuthModalOpen, openAuthModal } = useAuth();
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

  return (
    <div className="min-h-screen flex flex-col bg-transparent font-sans text-slate-100 antialiased selection:bg-[#10b981] selection:text-white relative">
      <ScrollAnimationBackground />
      <ScrollProgressBar />

      <ToastContainer />
      <AuthModal />

      <Header />

      <main className="flex-1">
        <AnimatePresence mode="wait">
          <Routes location={location}>
            <Route path="/login" element={<PageWrapper><LoginPage /></PageWrapper>} />
            <Route path="/home" element={
              <PageWrapper>
                <div className="space-y-12 pb-12">
                  <HeroSection />
                  <CategoryGrid />
                  <FeaturedProducts />
                  <FarmerServicesSection />
                  <TestimonialsSection />
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
              <ProtectedRoute>
                <PageWrapper><CustomerDashboard /></PageWrapper>
              </ProtectedRoute>
            } />
            <Route path="/subscriptions" element={
              <ProtectedRoute>
                <PageWrapper><SubscriptionManager /></PageWrapper>
              </ProtectedRoute>
            } />
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
      </main>

      <ProductDetailModal />
      <CartDrawer />
      <AIChatbotWidget />
      <Footer />
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