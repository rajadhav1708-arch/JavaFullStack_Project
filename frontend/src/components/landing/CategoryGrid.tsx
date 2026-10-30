import React from 'react';
import { useApp } from '../../context/AppContext';
import { ProductCategory } from '../../types';
import { ArrowRight, Layers } from 'lucide-react';

export const CategoryGrid: React.FC = () => {
  const { setCurrentView, setSelectedCategory, categories, isCatalogueLoading } = useApp();

  const handleCategoryClick = (categoryName: ProductCategory) => {
    setSelectedCategory(categoryName);
    setCurrentView('shop');
  };

  return (
    <section className="border-b border-line py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div data-reveal className="max-w-xl">
            <p className="eyebrow">
              <Layers className="h-3.5 w-3.5" />
              Shop by category
            </p>
            <h2 className="mt-3 text-3xl text-ink sm:text-4xl">Feed, minerals, dairy gear &amp; field supplies</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              From daily compound feed to the hardware a working farm actually runs on.
            </p>
          </div>

          <button
            onClick={() => {
              setSelectedCategory('All');
              setCurrentView('shop');
            }}
            className="group inline-flex items-center gap-2 self-start text-xs font-bold text-pine sm:self-auto"
          >
            View full catalogue
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {isCatalogueLoading &&
            Array.from({ length: 8 }).map((_, index) => (
              <div key={`skeleton-${index}`} className="h-72 animate-pulse rounded-2xl border border-line bg-paper" />
            ))}

          {categories.map((cat, index) => (
            <article
              key={cat.id}
              data-reveal
              data-reveal-delay={String((index % 4) * 70)}
              onClick={() => handleCategoryClick(cat.id)}
              className="card group flex cursor-pointer flex-col overflow-hidden transition-all hover:-translate-y-1 hover:border-pine/40 hover:shadow-xl hover:shadow-ink/10"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-cream">
                <img
                  src={cat.image}
                  alt={cat.name}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute right-3 top-3 rounded-full bg-paper/95 px-2.5 py-1 text-[10px] font-bold text-pine shadow-sm">
                  {cat.productCount} {cat.productCount === 1 ? 'product' : 'products'}
                </span>
              </div>

              <div className="flex flex-1 flex-col justify-between p-5">
                <div>
                  <h3 className="text-base font-semibold text-ink transition-colors group-hover:text-pine">
                    {cat.name}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-ink-soft">{cat.description}</p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs font-bold text-pine">
                  <span>Browse products</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
