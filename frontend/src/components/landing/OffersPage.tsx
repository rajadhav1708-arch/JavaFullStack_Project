import React from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { ProductImage } from '../common/ProductImage';
import { Tag, ShoppingBag } from 'lucide-react';

/**
 * Customer-facing offers view, wired to the "Offers" nav item. Every card is a
 * real catalogue row that currently carries a discount, so the page can never
 * advertise an offer that is not actually in the database.
 */
export const OffersPage: React.FC = () => {
  const { products, addToCart, setSelectedProduct, isCatalogueLoading } = useApp();
  const { t } = useLanguage();

  const discounted = products
    .filter((product) => product.discountPercent > 0)
    .sort((a, b) => b.discountPercent - a.discountPercent);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-pine/20 bg-pine-soft px-3 py-1 text-xs font-bold text-pine">
          <Tag className="h-3.5 w-3.5" />
          {t('nav.offers')}
        </span>
        <h1 className="text-2xl text-ink sm:text-4xl">{t('offers.title')}</h1>
        <p className="mt-2 text-sm text-ink-soft">{t('offers.subtitle')}</p>
      </div>

      {isCatalogueLoading && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-72 animate-pulse rounded-2xl bg-cream" />
          ))}
        </div>
      )}

      {!isCatalogueLoading && discounted.length === 0 && (
        <p className="text-sm text-ink-soft">
          No active discounts right now. Check the catalogue for regular prices.
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {discounted.map((product) => (
          <article
            key={product.id}
            className="card group flex flex-col justify-between overflow-hidden transition-shadow hover:shadow-lg"
          >
            <div className="relative h-44 overflow-hidden bg-cream">
              <ProductImage
                src={product.image}
                alt={product.name}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <span className="absolute left-3 top-3 rounded-md bg-ochre px-2 py-0.5 text-[10px] font-black text-ink">
                {product.discountPercent}% off
              </span>
            </div>
            <div className="flex flex-1 flex-col justify-between p-4">
              <div>
                <p className="text-[11px] font-bold uppercase text-pine">{product.brand}</p>
                <h3
                  onClick={() => setSelectedProduct(product)}
                  className="mt-1 line-clamp-2 cursor-pointer text-sm font-bold text-ink hover:text-pine"
                >
                  {product.name}
                </h3>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                <div>
                  <p className="text-lg font-bold text-ink">₹{product.price.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-ink-soft line-through">
                    ₹{product.originalPrice.toLocaleString('en-IN')}
                  </p>
                </div>
                <button
                  onClick={() => addToCart(product, product.selectedWeightKg || 50, 1)}
                  className="btn btn-primary !px-3.5 !py-2 text-xs"
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  {t('offers.add')}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
