import React from 'react';
import { useApp } from '../../context/AppContext';
import { RatingStars } from '../common/RatingStars';
import { ProductImage } from '../common/ProductImage';
import { formatVariantLabel } from '../../utils/variants';
import { ShoppingBag, Heart, Eye, ArrowRight, ShieldCheck, Tag, Leaf } from 'lucide-react';

export const FeaturedProducts: React.FC = () => {
  const {
    products,
    addToCart,
    wishlist,
    toggleWishlist,
    setSelectedProduct,
    setCurrentView,
    isCatalogueLoading,
  } = useApp();

  const picks = products.slice(0, 4);

  return (
    <section className="border-b border-line py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div data-reveal className="max-w-xl">
            <p className="eyebrow">
              <Leaf className="h-3.5 w-3.5" />
              Catalogue picks
            </p>
            <h2 className="mt-3 text-3xl text-ink sm:text-4xl">Feed and field essentials, priced plainly</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              A short list from the full catalogue — every pack size and price is shown before you add it to the cart.
            </p>
          </div>

          <button onClick={() => setCurrentView('shop')} className="btn btn-outline self-start sm:self-auto">
            View full catalogue
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {isCatalogueLoading &&
            Array.from({ length: 4 }).map((_, index) => (
              <div key={`skeleton-${index}`} className="h-96 animate-pulse rounded-2xl border border-line bg-paper" />
            ))}

          {picks.map((product, index) => {
            const isWishlisted = wishlist.includes(product.id);

            return (
              <article
                key={product.id}
                data-reveal
                data-reveal-delay={String(index * 70)}
                className="card group flex flex-col overflow-hidden transition-all hover:-translate-y-1 hover:border-pine/40 hover:shadow-xl hover:shadow-ink/10"
              >
                <div className="relative aspect-square overflow-hidden bg-cream">
                  <ProductImage
                    src={product.image}
                    alt={product.name}
                    className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                  />

                  <div className="absolute left-3 top-3 flex flex-col gap-1.5">
                    {product.discountPercent > 0 && (
                      <span className="rounded-md bg-ochre px-2 py-0.5 text-[10px] font-black text-white">
                        {product.discountPercent}% off
                      </span>
                    )}
                    {product.isBestSeller && (
                      <span className="rounded-md border border-pine/20 bg-pine-soft px-2 py-0.5 text-[10px] font-bold text-pine">
                        Best seller
                      </span>
                    )}
                  </div>

                  <div className="absolute right-3 top-3 flex flex-col gap-1">
                    <button
                      onClick={() => toggleWishlist(product.id)}
                      className={`rounded-full p-2 shadow-sm transition-colors ${
                        isWishlisted ? 'bg-clay text-white' : 'bg-paper/95 text-ink-soft hover:text-clay'
                      }`}
                      aria-label={isWishlisted ? 'Remove from list' : 'Save to list'}
                    >
                      <Heart className="h-4 w-4 fill-current" />
                    </button>
                    <button
                      onClick={() => setSelectedProduct(product)}
                      className="rounded-full bg-paper/95 p-2 text-ink-soft shadow-sm transition-colors hover:text-pine"
                      title="Quick view"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>

                  {product.suitableFor.length > 0 ? (
                    <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-paper/95 px-2.5 py-1 text-[10px] font-semibold text-ink shadow-sm">
                      <ShieldCheck className="h-3 w-3 text-pine" />
                      <span className="truncate">For {product.suitableFor.join(', ')}</span>
                    </div>
                  ) : (
                    product.tags.length > 0 && (
                      <div className="absolute bottom-3 left-3 right-3 flex items-center gap-1 rounded-full bg-paper/95 px-2.5 py-1 text-[10px] font-semibold text-ink shadow-sm">
                        <Tag className="h-3 w-3 shrink-0 text-pine" />
                        <span className="truncate">{product.tags.slice(0, 2).join(' · ')}</span>
                      </div>
                    )
                  )}
                </div>

                <div className="flex flex-1 flex-col justify-between p-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-ochre">{product.brand}</p>
                    <h3
                      onClick={() => setSelectedProduct(product)}
                      className="mt-1 line-clamp-2 cursor-pointer text-sm font-bold text-ink transition-colors hover:text-pine"
                    >
                      {product.name}
                    </h3>

                    <div className="mt-2">
                      <RatingStars rating={product.rating} count={product.reviewCount} />
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="text-[11px] text-ink-soft">Pack:</span>
                      {product.weightOptions.map((opt) => (
                        <span
                          key={opt.weightKg}
                          className="rounded-md border border-line bg-cream px-2 py-0.5 text-[11px] font-semibold text-ink"
                        >
                          {formatVariantLabel(opt.weightKg, opt.unit)}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                    <div>
                      <p className="font-display text-lg font-semibold text-ink">
                        ₹{product.price.toLocaleString('en-IN')}
                      </p>
                      {product.originalPrice > product.price && (
                        <p className="text-xs text-ink-soft line-through">
                          ₹{product.originalPrice.toLocaleString('en-IN')}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() =>
                        addToCart(product, product.selectedWeightKg || product.weightOptions[0]?.weightKg || 1, 1)
                      }
                      className="btn btn-primary !px-3 !py-2 text-[11px]"
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                      Add
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
