import React from 'react';
import { useApp } from '../../context/AppContext';
import { ProductCategory } from '../../types';
import { useInView, useScrollProgress, parallaxOffset } from '../../hooks/useScrollProgress';
import { ArrowRight, Sparkles } from 'lucide-react';

const HEADING_TRAVEL = 16;

export const CategoryGrid: React.FC = () => {
  const { setCurrentView, setSelectedCategory, categories, isCatalogueLoading } = useApp();
  const section = useInView<HTMLElement>();
  const { ref: headingRef, progress } = useScrollProgress<HTMLDivElement>(section.inView);

  const handleCategoryClick = (categoryName: ProductCategory) => {
    setSelectedCategory(categoryName);
    setCurrentView('shop');
  };

  const headingOffset = parallaxOffset(progress, HEADING_TRAVEL);

  return (
    <section ref={section.ref} className="py-16 bg-transparent text-white border-b border-white/10 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            ref={headingRef}
            data-reveal
            className="text-center max-w-3xl mx-auto mb-12 will-change-transform"
            style={{ transform: `translate3d(0, ${headingOffset}px, 0)` }}
          >
          <div className="inline-flex items-center gap-1.5 bg-[#065f46] text-[#34d399] text-xs font-bold px-3 py-1 rounded-full mb-3 border border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5 text-[#34d399]" />
            <span>Shop by Category</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Feeds, Dairy Gear & Farm Supplies
          </h2>
          <p className="text-slate-300 text-sm sm:text-base mt-2">
            From precision cattle nutrition to the hardware, machinery and field gear a working
            farm actually runs on.
          </p>
        </div>

        {/* Tiles are not parallaxed: a translated grid child drops out of row
            alignment and the columns stop matching height. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Categories load from the API; show placeholders rather than a
              collapsed grid that pops in a moment later. */}
          {isCatalogueLoading &&
            Array.from({ length: 12 }).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className="h-64 rounded-2xl bg-white/5 border border-white/10 animate-pulse"
              />
            ))}
          {categories.map((cat, index) => (
            <div
              key={cat.id}
              data-reveal
              data-reveal-delay={String((index % 4) * 90)}
              onClick={() => handleCategoryClick(cat.id)}
              className="group bg-slate-900/40 backdrop-blur-md rounded-2xl overflow-hidden border border-slate-700/60 shadow-lg hover:shadow-2xl hover:border-[#10b981] transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="relative h-48 overflow-hidden bg-slate-800">
                <img
                  src={cat.image}
                  alt={cat.name}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  decoding="async"
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
