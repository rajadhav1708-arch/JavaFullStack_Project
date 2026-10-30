import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { RatingStars } from '../common/RatingStars';
import { ProductImage } from '../common/ProductImage';
import { formatVariantLabel, isConsumable } from '../../utils/variants';
import { X, ShoppingBag, Heart, Check, Info, Package, ShoppingCart } from 'lucide-react';

export const ProductDetailModal: React.FC = () => {
  const { selectedProduct, setSelectedProduct, addToCart, wishlist, toggleWishlist, setCurrentView } = useApp();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'desc' | 'nutrition' | 'usage' | 'reviews'>('desc');
  const [selectedWeight, setSelectedWeight] = useState<number>(selectedProduct?.selectedWeightKg || 50);
  const [quantity, setQuantity] = useState(1);

  if (!selectedProduct) return null;

  const consumable = isConsumable(selectedProduct);
  const isWishlisted = wishlist.includes(selectedProduct.id);
  const selectedOption =
    selectedProduct.weightOptions.find((option) => option.weightKg === selectedWeight) ||
    selectedProduct.weightOptions[0];
  const unitPrice = selectedOption ? selectedOption.price : selectedProduct.price;
  const totalPrice = unitPrice * quantity;
  const activeUnit = selectedOption?.unit ?? selectedProduct.unit;
  const availableStock = selectedOption ? selectedOption.stock : selectedProduct.stockCount;
  const inStock = availableStock > 0;

  const handleAddToCart = () => {
    addToCart(selectedProduct, selectedWeight, quantity);
  };

  const handleBuyNow = () => {
    addToCart(selectedProduct, selectedWeight, quantity);
    setSelectedProduct(null);
    setCurrentView('checkout');
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/50 p-3 backdrop-blur-sm sm:p-6"
      onClick={() => setSelectedProduct(null)}
    >
      <div
        className="relative my-auto flex w-full max-w-4xl flex-col overflow-y-auto rounded-3xl border border-line bg-paper shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          onClick={() => setSelectedProduct(null)}
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-cream text-ink-soft transition-colors hover:bg-line hover:text-ink"
          aria-label={t('product.closeAria')}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="space-y-8 p-6 sm:p-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
            <div className="relative md:col-span-5">
              <div className="relative overflow-hidden rounded-2xl border border-line bg-cream">
                <ProductImage
                  src={selectedProduct.image}
                  alt={selectedProduct.name}
                  full
                  eager
                  className="h-80 w-full object-cover"
                />
                <button
                  onClick={() => toggleWishlist(selectedProduct.id)}
                  className={`absolute right-3 top-3 rounded-full p-2.5 shadow-lg backdrop-blur transition-colors ${
                    isWishlisted ? 'bg-clay text-paper' : 'bg-paper/90 text-ink-soft hover:bg-paper'
                  }`}
                  aria-label={isWishlisted ? t('product.unsaveAria') : t('product.saveAria')}
                >
                  <Heart className={`h-5 w-5 ${isWishlisted ? 'fill-current' : ''}`} />
                </button>

                {selectedProduct.discountPercent > 0 && (
                  <span className="absolute left-3 top-3 rounded-md bg-ochre px-2.5 py-1 text-xs font-black text-ink">
                    {t('shop.off', { n: selectedProduct.discountPercent })}
                  </span>
                )}
              </div>

              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-line bg-cream/60 p-3 text-xs">
                <Package className="mt-0.5 h-5 w-5 shrink-0 text-pine" />
                <div>
                  <p className="font-bold text-ink">{t('product.batchTitle')}</p>
                  <p className="mt-0.5 text-[11px] text-ink-soft">
                    SKU {selectedProduct.sku} · Batch {selectedProduct.batchNumber || '—'}
                  </p>
                  <p className="text-[11px] text-ink-soft">
                    {consumable
                      ? t('product.bestBefore', { date: selectedProduct.expiryDate || '—' })
                      : t('product.warrantyNote')}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 md:col-span-7">
              <div>
                <span className="rounded-md bg-pine-soft px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-pine">
                  {selectedProduct.brand}
                </span>
                <h1 className="mt-2 text-xl text-ink sm:text-2xl">{selectedProduct.name}</h1>
                <div className="mt-2 flex items-center gap-3">
                  <RatingStars rating={selectedProduct.rating} count={selectedProduct.reviewCount} />
                  <span className="text-ink-soft">|</span>
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                      inStock ? 'bg-pine-soft text-pine' : 'bg-clay/10 text-clay'
                    }`}
                  >
                    {inStock ? t('product.inStock') : t('product.outOfStock')}
                  </span>
                </div>
              </div>

              <div className="flex items-baseline gap-3 pt-2">
                <span className="font-display text-3xl font-semibold text-ink">
                  ₹{unitPrice.toLocaleString('en-IN')}
                </span>
                {selectedProduct.originalPrice > unitPrice && (
                  <span className="text-sm text-ink-soft line-through">
                    ₹{selectedProduct.originalPrice.toLocaleString('en-IN')}
                  </span>
                )}
                <span className="text-xs text-ink-soft">{t('product.perUnit', { unit: activeUnit })}</span>
              </div>

              <ul className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-3">
                {selectedProduct.highlights.slice(0, 3).map((highlight) => (
                  <li
                    key={highlight}
                    className="flex items-start gap-1.5 rounded-lg border border-line bg-cream/60 px-2.5 py-2 text-[11px] font-medium text-ink-soft"
                  >
                    <Check className="mt-px h-3.5 w-3.5 shrink-0 text-pine" />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>

              {selectedProduct.weightOptions.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-ink">{t('product.packSize')}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedProduct.weightOptions.map((option) => (
                      <button
                        key={option.weightKg}
                        onClick={() => {
                          setSelectedWeight(option.weightKg);
                          setQuantity(1);
                        }}
                        className={`rounded-xl border px-4 py-2 text-xs font-bold transition-colors ${
                          selectedWeight === option.weightKg
                            ? 'border-pine bg-pine text-cream'
                            : 'border-line bg-cream text-ink-soft hover:bg-paper'
                        }`}
                      >
                        {formatVariantLabel(option.weightKg, option.unit)} — ₹{option.price.toLocaleString('en-IN')}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-4">
                <span className="text-[11px] font-bold uppercase tracking-wide text-ink">{t('product.quantity')}</span>
                <div className="flex items-center overflow-hidden rounded-xl border border-line bg-cream">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-1.5 font-bold text-ink-soft hover:bg-paper hover:text-ink"
                    aria-label={t('product.decreaseAria')}
                  >
                    −
                  </button>
                  <span className="px-4 py-1.5 text-sm font-bold text-ink">{quantity}</span>
                  <button
                    onClick={() => setQuantity(availableStock > 0 ? Math.min(availableStock, quantity + 1) : quantity + 1)}
                    className="px-3 py-1.5 font-bold text-ink-soft hover:bg-paper hover:text-ink"
                    aria-label={t('product.increaseAria')}
                  >
                    +
                  </button>
                </div>
                <span className="text-xs font-bold text-ink-soft">
                  {t('product.subtotal', { total: totalPrice.toLocaleString('en-IN') })}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button onClick={handleAddToCart} disabled={!inStock} className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50">
                  <ShoppingBag className="h-4 w-4" />
                  {t('product.addToCart')}
                </button>
                <button onClick={handleBuyNow} disabled={!inStock} className="btn btn-accent disabled:cursor-not-allowed disabled:opacity-50">
                  <ShoppingCart className="h-4 w-4" />
                  {t('product.buyNow')}
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-line pt-6">
            <div className="flex items-center gap-2 overflow-x-auto border-b border-line pb-2">
              <TabButton active={activeTab === 'desc'} onClick={() => setActiveTab('desc')}>
                {t('product.tabDescription')}
              </TabButton>
              {consumable ? (
                <>
                  <TabButton active={activeTab === 'nutrition'} onClick={() => setActiveTab('nutrition')}>
                    {t('product.tabNutrition')}
                  </TabButton>
                  <TabButton active={activeTab === 'usage'} onClick={() => setActiveTab('usage')}>
                    {selectedProduct.category === 'Veterinary Care' || selectedProduct.category === 'Dairy Hygiene'
                      ? t('product.tabUsage')
                      : t('product.tabFeeding')}
                  </TabButton>
                </>
              ) : (
                <TabButton active={activeTab === 'usage'} onClick={() => setActiveTab('usage')}>
                  {t('product.tabHowToUse')}
                </TabButton>
              )}
              <TabButton active={activeTab === 'reviews'} onClick={() => setActiveTab('reviews')}>
                {t('product.tabRatings', { n: selectedProduct.reviewCount })}
              </TabButton>
            </div>

            {activeTab === 'desc' && (
              <div className="space-y-4 pt-5 text-xs leading-relaxed text-ink-soft sm:text-sm">
                <p>{selectedProduct.description}</p>
                <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
                  {selectedProduct.benefits.map((benefit) => (
                    <div
                      key={benefit}
                      className="flex items-start gap-2 rounded-xl border border-line bg-cream/60 p-3 text-xs font-medium text-ink-soft"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-pine" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'nutrition' && (
              <div className="pt-5">
                <div className="overflow-hidden rounded-2xl border border-line text-xs">
                  <div className="grid grid-cols-2 border-b border-line bg-cream p-3 font-bold text-ink">
                    <span>{t('product.nutritionComponent')}</span>
                    <span>{t('product.nutritionAnalysis')}</span>
                  </div>
                  <div className="divide-y divide-line">
                    {[
                      [t('product.nutritionCrudeProtein'), selectedProduct.nutritionalInfo.crudeProtein],
                      [t('product.nutritionCrudeFat'), selectedProduct.nutritionalInfo.crudeFat],
                      [t('product.nutritionCrudeFibre'), selectedProduct.nutritionalInfo.crudeFiber],
                      [t('product.nutritionCalcium'), selectedProduct.nutritionalInfo.calcium],
                      [t('product.nutritionPhosphorus'), selectedProduct.nutritionalInfo.phosphorus],
                      [t('product.nutritionTdn'), selectedProduct.nutritionalInfo.tdnEnergy],
                      [t('product.nutritionVitamins'), selectedProduct.nutritionalInfo.vitamins],
                    ].map(([label, value]) => (
                      <div key={label} className="grid grid-cols-2 p-3 text-ink-soft">
                        <span className="font-semibold">{label}</span>
                        <span className="font-bold text-ink">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'usage' && (
              <div className="space-y-4 pt-5 text-xs text-ink-soft sm:text-sm">
                <div className="rounded-2xl border border-pine/20 bg-pine-soft p-4 font-medium text-ink">
                  <p className="mb-1 flex items-center gap-1.5 font-bold">
                    <Info className="h-4 w-4 text-pine" />
                    {consumable ? t('product.dosageHeading') : t('product.tabHowToUse')}
                  </p>
                  <p>{selectedProduct.feedingInstructions}</p>
                </div>

                <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink">
                  {consumable ? t('product.ingredientsHeading') : t('product.tabHowToUse')}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {selectedProduct.ingredients.map((ingredient) => (
                    <span
                      key={ingredient}
                      className="rounded-lg border border-line bg-cream px-3 py-1 text-xs font-semibold text-ink-soft"
                    >
                      {ingredient}
                    </span>
                  ))}
                </div>

                {!consumable && selectedProduct.tags.length > 0 && (
                  <>
                    <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink">{t('product.highlightsHeading')}</h2>
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-lg border border-pine/20 bg-pine-soft px-3 py-1 text-xs font-semibold text-pine"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="pt-5">
                <div className="flex items-center gap-4 rounded-2xl border border-line bg-cream/60 p-4">
                  <div className="text-center">
                    <p className="font-display text-3xl font-semibold text-ink">{selectedProduct.rating}</p>
                    <RatingStars rating={selectedProduct.rating} />
                    <p className="mt-1 text-[10px] text-ink-soft">
                      {t('product.ratingsCount', { n: selectedProduct.reviewCount })}
                    </p>
                  </div>
                  <p className="border-l border-line pl-4 text-xs leading-relaxed text-ink-soft">
                    {t('product.ratingsNote')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({
  active,
  onClick,
  children,
}) => (
  <button
    onClick={onClick}
    className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-colors ${
      active ? 'bg-pine text-cream' : 'text-ink-soft hover:bg-cream hover:text-ink'
    }`}
  >
    {children}
  </button>
);
