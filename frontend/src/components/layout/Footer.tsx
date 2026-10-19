import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Phone, Mail, MapPin } from 'lucide-react';

export const Footer: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className="relative z-20 border-t border-white/10 backdrop-blur-xl bg-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Brand block */}
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-black text-xl shrink-0 backdrop-blur-sm">
            H
          </div>
          <div className="text-center">
            <span className="block font-extrabold text-xl text-white tracking-tight">Hindavi Tradors</span>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto mt-1.5">
              Cattle feed, dairy equipment, and farm inventory shop serving Kolhapur dairy farmers. Quality feed, fair credit, and village doorstep delivery.
            </p>
            <div className="pt-2 text-[10px] text-emerald-400/80 font-semibold flex items-center justify-center gap-1">
              <span>🌾 Hindavi Tradors — Your Village Feed Partner</span>
            </div>
          </div>
        </div>

        {/* Store Info */}
        <div className="py-10 border-y border-white/5 text-center">
          <h5 className="text-white text-xs font-bold uppercase tracking-wider mb-4">{t('footer.store')}</h5>
          <ul className="space-y-2 text-xs text-slate-300 mx-auto max-w-md">
            <li className="flex items-center justify-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Chinchpur, Sangamner, Maharashtra</span>
            </li>
            <li className="flex items-center justify-center gap-2">
              <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>1800-425-3333 / +91 98223 11000</span>
            </li>
            <li className="flex items-center justify-center gap-2">
              <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>pratikgunjal.demo@gmail.com</span>
            </li>
          </ul>
        </div>

        {/* Bottom copyright */}
        <div className="pt-10 border-t border-white/10 flex flex-col items-center justify-center text-[10px] text-slate-500 gap-3">
          <p>© 2026 Hindavi Tradors. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <span className="hover:text-slate-300 cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-slate-300 cursor-pointer transition-colors">Terms of Service</span>
            <span className="hover:text-slate-300 cursor-pointer transition-colors">GST Compliance</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
