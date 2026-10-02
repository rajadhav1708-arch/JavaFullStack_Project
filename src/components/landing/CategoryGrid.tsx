import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ProductCategory } from '../../types';
import { ArrowRight, Sparkles } from 'lucide-react';

export const CategoryGrid: React.FC = () => {
  const { setCurrentView, setSelectedCategory, categories, isCatalogueLoading } = useApp();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleCategoryClick = (categoryName: ProductCategory) => {
    setSelectedCategory(categoryName);
    setCurrentView('shop');
  };

  return (
    <section className="py-16 bg-transparent text-white border-b border-white/10 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12" style={{ transform: `translateY(${scrollY * 0.05}px)` }}>
          <div className="inline-flex items-center gap-1.5 bg-[#065f46] text-[#34d399] text-xs font-bold px-3 py-1 rounded-full mb-3 border border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5 text-[#34d399]" />
            <span>Targeted Cattle Nutrition</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Explore Feeds by Animal Needs
          </h2>
          <p className="text-slate-300 text-sm sm:text-base mt-2">
            Select high-performance feeds engineered specifically for high-yielding cows, buffaloes, growing calves, or heat cycle maintenance.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" ref={containerRef}>
          {/* Categories load from the API; show placeholders rather than a
              collapsed grid that pops in a moment later. */}
          {isCatalogueLoading &&
            Array.from({ length: 8 }).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className="h-64 rounded-2xl bg-white/5 border border-white/10 animate-pulse"
              />
            ))}
          {categories.map((cat, index) => (
            <div
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className="group bg-slate-900/40 backdrop-blur-md rounded-2xl overflow-hidden border border-slate-700/60 shadow-lg hover:shadow-2xl hover:border-[#10b981] transition-all cursor-pointer flex flex-col justify-between"
              style={{ transform: `translateY(${scrollY * 0.02 * (index % 2 === 0 ? 1 : -1)}px)` }}
            >
              <div className="relative h-48 overflow-hidden bg-slate-800">
                <img
                  src={cat.image}
                  alt={cat.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-full border border-white/10 shadow-sm">
                  {cat.productCount} Products
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-[#34d399] transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-slate-300 text-xs leading-relaxed mt-1.5 line-clamp-2">
                    {cat.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-bold text-[#34d399] group-hover:text-emerald-300">
                  <span>Browse Products</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
