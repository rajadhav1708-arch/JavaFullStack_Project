import React from 'react';
import { useApp } from '../../context/AppContext';
import { Phone, Mail, MapPin, ShieldCheck, Truck, Clock, Award, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  const { setCurrentView } = useApp();

  return (
    <footer className="bg-transparent text-slate-300 border-t border-white/10 pt-12 pb-8 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Trust Value Props */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pb-12 border-b border-white/10 text-center md:text-left">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">BIS Certified Nutrition</h4>
              <p className="text-xs text-slate-300 mt-1">100% lab-tested feed pellets & chelated trace minerals.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Village Express Delivery</h4>
              <p className="text-xs text-slate-300 mt-1">Direct tractor-trolley delivery to your dairy farm barn.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Farmer Khata Credit</h4>
              <p className="text-xs text-slate-300 mt-1">Buy feed on credit & pay after milk collection billing.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">365 Days Support</h4>
              <p className="text-xs text-slate-300 mt-1">Free consultation with veterinary nutrition experts.</p>
            </div>
          </div>
        </div>

        {/* Footer Links Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 py-10">
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-emerald-800 flex items-center justify-center text-amber-300 font-black text-lg">
                P
              </div>
              <span className="font-extrabold text-xl text-white">PashuFeed Pro</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Empowering 10,000+ dairy farmers with scientifically balanced cattle feed, bypass fat supplements, mineral mixtures, and automated shop POS management.
            </p>
            <div className="pt-2 text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <span>🌾 Built for India&apos;s Dairy Cooperatives & Individual Farmers</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h5 className="text-white text-xs font-bold uppercase tracking-wider mb-4">Feed Categories</h5>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => setCurrentView('shop')} className="hover:text-emerald-400 transition-colors">
                  Dairy Cattle Pellets
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentView('shop')} className="hover:text-emerald-400 transition-colors">
                  Buffalo High-Fat Feed
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentView('shop')} className="hover:text-emerald-400 transition-colors">
                  Calf Starter Feeds
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentView('shop')} className="hover:text-emerald-400 transition-colors">
                  Bypass Fat & Proteins
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentView('shop')} className="hover:text-emerald-400 transition-colors">
                  Calcium & Mineral Mixture
                </button>
              </li>
            </ul>
          </div>

          {/* Smart Features */}
          <div>
            <h5 className="text-white text-xs font-bold uppercase tracking-wider mb-4">Smart Farmer Tools</h5>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => setCurrentView('nutrition-quiz')} className="hover:text-emerald-400 transition-colors">
                  AI Ration Calculator
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentView('subscriptions')} className="hover:text-emerald-400 transition-colors">
                  Monthly Feed Auto-Delivery
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentView('customer-dashboard')} className="hover:text-emerald-400 transition-colors">
                  Farmer Khata Ledger
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentView('services')} className="hover:text-emerald-400 transition-colors">
                  Veterinary Consultation
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentView('offers')} className="hover:text-emerald-400 transition-colors">
                  Bulk Purchase Coupons
                </button>
              </li>
            </ul>
          </div>

          {/* Store Info */}
          <div>
            <h5 className="text-white text-xs font-bold uppercase tracking-wider mb-4">Central Feed Hub</h5>
            <ul className="space-y-3 text-xs">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Plot 42, Agro-Industrial Park, MIDC Kagal, Kolhapur 416216</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>1800-425-3333 / +91 98223 11000</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>support@pashufeedpro.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <p>© 2026 PashuFeed Pro Systems. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-400 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-slate-400 cursor-pointer">Terms of Service</span>
            <span className="hover:text-slate-400 cursor-pointer">GST Compliance</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
