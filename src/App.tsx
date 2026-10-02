import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastContainer } from './components/common/ToastContainer';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { HeroSection } from './components/landing/HeroSection';
import { CategoryGrid } from './components/landing/CategoryGrid';
import { FeaturedProducts } from './components/landing/FeaturedProducts';
import { FarmerServicesSection } from './components/landing/FarmerServicesSection';
import { TestimonialsSection } from './components/landing/TestimonialsSection';
import { ProductListing } from './components/shop/ProductListing';
import { ProductDetailModal } from './components/shop/ProductDetailModal';
import { CartDrawer } from './components/shop/CartDrawer';
import { CheckoutModal } from './components/shop/CheckoutModal';
import { OrderTrackingModal } from './components/shop/OrderTrackingModal';
import { SmartRationQuiz } from './components/nutrition/SmartRationQuiz';
import { CustomerDashboard } from './components/customer/CustomerDashboard';
import { SubscriptionManager } from './components/subscriptions/SubscriptionManager';
import { AdminLayout } from './components/admin/AdminLayout';
import { AIChatbotWidget } from './components/chat/AIChatbotWidget';
import { ScrollAnimationBackground } from './components/landing/ScrollAnimationBackground';
import { AuthModal } from './components/auth/AuthModal';
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
};

/** Signed in, but staff only. A customer account must not reach shop records. */
const STAFF_ONLY: Partial<Record<MainView, string>> = {
  'admin-dashboard': 'The shop dashboard is for staff accounts only.',
};

const MainAppContent: React.FC = () => {
  const { currentView, setCurrentView } = useApp();
  const { user, openAuthModal } = useAuth();

  const isStaff = user?.role === 'admin' || user?.role === 'employee';

  // Never strand the user on a view they cannot use: explain why and return to
  // a public page rather than rendering something empty.
  React.useEffect(() => {
    const staffReason = STAFF_ONLY[currentView];
    if (staffReason) {
      if (!user) openAuthModal(SIGN_IN_REQUIRED[currentView]);
      else if (!isStaff) openAuthModal(staffReason);
      return;
    }
    if (!user && SIGN_IN_REQUIRED[currentView]) openAuthModal(SIGN_IN_REQUIRED[currentView]);
  }, [user, isStaff, currentView, openAuthModal]);

  const guard = (view: MainView, content: React.ReactNode) => {
    if (STAFF_ONLY[view] && !isStaff) return null;
    if (!user && SIGN_IN_REQUIRED[view]) return null;
    return content;
  };

  return (
    <div className="min-h-screen flex flex-col bg-transparent font-sans text-slate-100 antialiased selection:bg-[#10b981] selection:text-white relative">
      <ScrollAnimationBackground />

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
        {guard('order-tracking', <OrderTrackingModal />)}
        {guard('checkout', <CheckoutModal />)}
        {guard('customer-dashboard', <CustomerDashboard />)}
        {guard('subscriptions', <SubscriptionManager />)}
        {guard('admin-dashboard', <AdminLayout />)}
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
        <MainAppContent />
      </AppProvider>
    </AuthProvider>
  );
}