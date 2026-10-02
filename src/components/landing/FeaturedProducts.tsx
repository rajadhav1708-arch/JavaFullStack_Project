import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { RatingStars } from '../common/RatingStars';
import { Product } from '../../types';
import { ShoppingBag, Heart, Eye, ArrowRight, ShieldCheck } from 'lucide-react';

export const FeaturedProducts: React.FC = () => {
  const { products, addToCart, wishlist, toggleWishlist, setSelectedProduct, setCurrentView } = useApp();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const featuredList = products.slice(0, 4);

  return (
    <section className="py-16 bg-transparent text-white border-b border-white/10 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-10 gap-4" style={{ transform: `translateY(${scrollY * 0.03}px)` }}>
          <div>
            <div className="inline-flex items-center gap-1 text-[#34d399] text-xs font-bold uppercase tracking-wider bg-[#065f46] border border-emerald-500/30 px-2.5 py-1 rounded-md mb-2">
              Best Sellers
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Top Rated Cattle Feeds & Supplements
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm mt-1">
              Tested for milk fat % increase and daily yield improvement across 10,000+ dairy farms.
            </p>
          </div>

          <button
            onClick={() => setCurrentView('shop')}
            className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#10b981] hover:bg-[#059669] px-4 py-2.5 rounded-xl transition-colors cursor-pointer shadow-md"
          >
            <span>View All Store Feeds</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredList.map((product, index) => {
            const isWishlisted = wishlist.includes(product.id);
            const parallaxDirection = index % 2 === 0 ? 1 : -1;

            return (
              <div
                key={product.id}
                className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-700/60 shadow-lg hover:shadow-2xl hover:border-[#10b981] transition-all flex flex-col justify-between group overflow-hidden"
                style={{ transform: `translateY(${scrollY * 0.015 * parallaxDirection}px)` }}
              >
                {/* Image & Badges */}
                <div className="relative h-52 bg-slate-800 overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                    {product.discountPercent > 0 && (
                      <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs">
                        {product.discountPercent}% OFF
                      </span>
                    )}
                    {product.isBestSeller && (
                      <span className="bg-[#064e3b] border border-emerald-400/40 text-[#34d399] text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                        Best Seller
                      </span>
                    )}
                  </div>

                  {/* Wishlist & Quick View */}
                  <div className="absolute top-3 right-3 flex flex-col gap-1">
                    <button
                      onClick={() => toggleWishlist(product.id)}
                      className={`p-2 rounded-full shadow-md backdrop-blur-md transition-all cursor-pointer ${
                        isWishlisted
                          ? 'bg-red-500 text-white'
                          : 'bg-slate-900/80 text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <Heart className="w-4 h-4 fill-current" />
                    </button>
                    <button
                      onClick={() => setSelectedProduct(product)}
                      className="p-2 bg-slate-900/80 hover:bg-slate-800 text-slate-200 rounded-full shadow-md backdrop-blur-md transition-all cursor-pointer"
                      title="Quick View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Suitable Animal Pill */}
                  <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-md text-slate-200 text-[10px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 border border-white/10">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>Suitable: {product.suitableFor.join(', ')}</span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-[#34d399] uppercase tracking-wide">
                      {product.brand}
                    </div>
                    <h3
                      onClick={() => setSelectedProduct(product)}
                      className="text-sm font-bold text-white hover:text-[#34d399] transition-colors cursor-pointer mt-1 line-clamp-2"
                    >
                      {product.name}
                    </h3>

                    <div className="mt-2">
                      <RatingStars rating={product.rating} count={product.reviewCount} />
                    </div>

                    {/* Weight Selection */}
                    <div className="mt-3 flex items-center gap-1.5 flex-wrap text-xs">
                      <span className="text-[11px] text-slate-400">Weight:</span>
                      {product.weightOptions.map((opt) => (
                        <span
                          key={opt.weightKg}
                          className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-[11px]"
                        >
                          {opt.weightKg} kg
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Price & Add to Cart */}
                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-lg font-black text-white">
                        ₹{product.price.toLocaleString('en-IN')}
                      </div>
                      {product.originalPrice > product.price && (
                        <div className="text-xs text-slate-400 line-through">
                          ₹{product.originalPrice.toLocaleString('en-IN')}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => addToCart(product, product.selectedWeightKg || 50, 1)}
                      className="flex items-center gap-1.5 bg-[#10b981] hover:bg-[#059669] text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Add to Cart</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
