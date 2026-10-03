import React from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { ShoppingBag, Tag } from 'lucide-react';

/**
 * Customer-facing offers view, wired to the "Offers" nav item (which used to
 * render a blank page). Every card is a real catalogue row that currently
 * carries a discount, so the page can never advertise an offer that is not
 * actually in the database.
 */
export const OffersPage: React.FC = () => {
  const { products, addToCart, setSelectedProduct, isCatalogueLoading } = useApp();
  const { t } = useLanguage();

  const discounted = products
    .filter((p) => p.discountPercent > 0)
    .sort((a, b) => b.discountPercent - a.discountPercent);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-white">
      <div className="mb-8">
        <div className="inline-flex items-center gap-1.5 bg-[#065f46] text-[#34d399] text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/30 mb-3">
          <Tag className="w-3.5 h-3.5" />
          <span>{t('nav.offers')}</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black tracking-tight">{t('offers.title')}</h1>
        <p className="text-slate-300 text-sm mt-2">{t('offers.subtitle')}</p>
      </div>

      {isCatalogueLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-72 rounded-2xl bg-slate-900/40 border border-slate-700/60 animate-pulse" />
          ))}
        </div>
      )}

      {!isCatalogueLoading && discounted.length === 0 && (
        <p className="text-slate-400 text-sm">No active discounts right now. Check back soon.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {discounted.map((product) => (
          <div
            key={product.id}
            className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-700/60 overflow-hidden flex flex-col justify-between group hover:border-[#10b981] transition-all"
          >
            <div className="relative h-44 bg-slate-800 overflow-hidden">
              <img
                src={product.image}
                alt={product.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <span className="absolute top-3 left-3 bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-md">
                {product.discountPercent}% OFF
              </span>
            </div>
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-bold text-[#34d399] uppercase">{product.brand}</div>
                <h3
                  onClick={() => setSelectedProduct(product)}
                  className="text-sm font-bold mt-1 line-clamp-2 cursor-pointer hover:text-[#34d399]"
                >
                  {product.name}
                </h3>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-lg font-black">₹{product.price.toLocaleString('en-IN')}</div>
                  <div className="text-xs text-slate-400 line-through">₹{product.originalPrice.toLocaleString('en-IN')}</div>
                </div>
                <button
                  onClick={() => addToCart(product, product.selectedWeightKg || 50, 1)}
                  className="flex items-center gap-1.5 bg-[#10b981] hover:bg-[#059669] text-white font-bold text-xs px-3.5 py-2 rounded-xl cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>{t('cart.add')}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
