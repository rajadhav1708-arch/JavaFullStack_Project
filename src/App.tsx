import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
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

const MainAppContent: React.FC = () => {
  const { currentView } = useApp();

  return (
    <div className="min-h-screen flex flex-col bg-transparent font-sans text-slate-100 antialiased selection:bg-[#10b981] selection:text-white relative">
      <ScrollAnimationBackground />

      {/* Global Toast System */}
      <ToastContainer />

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
        {currentView === 'ration-calculator' && <SmartRationQuiz />}
        {currentView === 'checkout' && <CheckoutModal />}
        {currentView === 'order-tracking' && <OrderTrackingModal />}
        {currentView === 'customer-dashboard' && <CustomerDashboard />}
        {currentView === 'subscriptions' && <SubscriptionManager />}
        {currentView === 'admin' && <AdminLayout />}
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
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
