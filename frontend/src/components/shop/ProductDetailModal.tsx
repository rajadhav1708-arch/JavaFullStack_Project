import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { RatingStars } from '../common/RatingStars';
import { ProductImage } from '../common/ProductImage';
import { formatVariantLabel, isConsumable } from '../../utils/variants';
import {
  X,
  ShoppingBag,
  Heart,
  Check,
  Award,
  Repeat,
  Sparkles,
  Info,
  Wrench,
} from 'lucide-react';

export const ProductDetailModal: React.FC = () => {
  const {
    selectedProduct,
    setSelectedProduct,
    addToCart,
    wishlist,
    toggleWishlist,
    addSubscription,
    setCurrentView,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'desc' | 'nutrition' | 'usage' | 'reviews'>('desc');
  const [selectedWeight, setSelectedWeight] = useState<number>(selectedProduct?.selectedWeightKg || 50);
  const [quantity, setQuantity] = useState<number>(1);
  const [isSubscribeMode, setIsSubscribeMode] = useState<boolean>(false);
  const [subFrequencyDays, setSubFrequencyDays] = useState<number>(30);

  if (!selectedProduct) return null;

  const consumable = isConsumable(selectedProduct);
  const isWishlisted = wishlist.includes(selectedProduct.id);
  const selectedWeightOpt =
    selectedProduct.weightOptions.find((w) => w.weightKg === selectedWeight) || selectedProduct.weightOptions[0];
  const unitPrice = selectedWeightOpt ? selectedWeightOpt.price : selectedProduct.price;
  const totalPrice = unitPrice * quantity;
  // Subscriptions only make sense for something that is re-ordered and used up.
  const showSubscribe = consumable;
  const activeUnit = selectedWeightOpt?.unit ?? selectedProduct.unit;

  const handleAddToCart = () => {
    if (isSubscribeMode) {
      addSubscription(selectedProduct, selectedWeight, quantity, subFrequencyDays);
    } else {
      addToCart(selectedProduct, selectedWeight, quantity);
    }
  };

  const handleBuyNow = () => {
    addToCart(selectedProduct, selectedWeight, quantity);
    setSelectedProduct(null);
    setCurrentView('checkout');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto border border-slate-200 relative flex flex-col my-auto">
        {/* Close Button */}
        <button
          onClick={() => setSelectedProduct(null)}
          className="absolute top-4 right-4 z-10 w-9 h-9 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8 space-y-8">
          {/* Top Main Section: Image + Primary Details */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Product Image */}
            <div className="md:col-span-5 relative">
              <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 relative group">
                <ProductImage
                  src={selectedProduct.image}
                  alt={selectedProduct.name}
                  full
                  eager
                  className="w-full h-80 object-cover"
                />
                <button
                  onClick={() => toggleWishlist(selectedProduct.id)}
                  className={`absolute top-3 right-3 p-2.5 rounded-full shadow-lg backdrop-blur-md transition-all cursor-pointer ${
                    isWishlisted ? 'bg-red-500 text-white' : 'bg-white/90 text-slate-700 hover:bg-white'
                  }`}
                >
                  <Heart className="w-5 h-5 fill-current" />
                </button>

                {selectedProduct.discountPercent > 0 && (
                  <span className="absolute top-3 left-3 bg-amber-500 text-slate-950 font-black text-xs px-2.5 py-1 rounded-md">
                    {selectedProduct.discountPercent}% OFF
                  </span>
                )}
              </div>

              {/* Lab Trust Badges */}
              <div className="mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2.5">
                {consumable ? (
                  <Award className="w-5 h-5 text-emerald-700 shrink-0" />
                ) : (
                  <Wrench className="w-5 h-5 text-emerald-700 shrink-0" />
                )}
                <div>
                  <div className="font-bold">
                    {consumable ? 'BIS Type-II Lab Certified' : 'Manufacturer Warranty Support'}
                  </div>
                  <div className="text-[11px] text-emerald-700">
                    {consumable
                      ? `Batch #${selectedProduct.batchNumber} | Expiry: ${selectedProduct.expiryDate}`
                      : `Batch #${selectedProduct.batchNumber} | SKU: ${selectedProduct.sku}`}
                  </div>
                </div>
              </div>
            </div>

            {/* Main Info */}
            <div className="md:col-span-7 space-y-4">
              <div>
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider bg-emerald-100 px-2.5 py-1 rounded-md">
                  {selectedProduct.brand}
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
                  {selectedProduct.name}
                </h1>
                <div className="mt-2 flex items-center gap-3">
                  <RatingStars rating={selectedProduct.rating} count={selectedProduct.reviewCount} />
                  <span className="text-xs text-slate-400">|</span>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    {selectedProduct.inStock ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>
              </div>

              {/* Price Row */}
              <div className="flex items-baseline gap-3 pt-2">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">
                  ₹{unitPrice.toLocaleString('en-IN')}
                </span>
                {selectedProduct.originalPrice > unitPrice && (
                  <span className="text-sm text-slate-400 line-through">
                    ₹{selectedProduct.originalPrice.toLocaleString('en-IN')}
                  </span>
                )}
                <span className="text-xs text-slate-500">per {activeUnit} (Incl. Taxes)</span>
              </div>

              {/* Feature highlights */}
              <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                {selectedProduct.highlights.slice(0, 3).map((highlight) => (
                  <li
                    key={highlight}
                    className="flex items-start gap-1.5 text-[11px] font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-px" />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>

              {/* Pack options */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Select Pack Size:
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedProduct.weightOptions.map((opt) => (
                    <button
                      key={opt.weightKg}
                      onClick={() => setSelectedWeight(opt.weightKg)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        selectedWeight === opt.weightKg
                          ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
                          : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {formatVariantLabel(opt.weightKg, opt.unit)} — ₹{opt.price}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity Counter */}
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-slate-700 uppercase">Quantity:</span>
                <div className="flex items-center border border-slate-300 rounded-xl bg-slate-50 overflow-hidden">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-1.5 text-slate-700 hover:bg-slate-200 font-bold"
                  >
                    -
                  </button>
                  <span className="px-4 py-1.5 font-bold text-sm text-slate-900">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-3 py-1.5 text-slate-700 hover:bg-slate-200 font-bold"
                  >
                    +
                  </button>
                </div>
                <span className="text-xs font-bold text-slate-500">
                  Total: ₹{totalPrice.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Subscribe & Save Toggle. Only consumables can be re-ordered on a cycle,
                  so a sprayer or a coil of wire never shows this. */}
              {showSubscribe && (
                <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs space-y-2">
                  <label className="flex items-center gap-2 font-bold text-amber-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSubscribeMode}
                      onChange={(e) => setIsSubscribeMode(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <Repeat className="w-4 h-4 text-amber-700" />
                    <span>Subscribe & Auto-Deliver Monthly (Extra 5% Discount)</span>
                  </label>

                  {isSubscribeMode && (
                    <div className="pt-2 border-t border-amber-200/60 flex items-center gap-3">
                      <span className="text-slate-700 font-medium">Frequency:</span>
                      {[15, 30, 45, 60].map((days) => (
                        <button
                          key={days}
                          onClick={() => setSubFrequencyDays(days)}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${
                            subFrequencyDays === days
                              ? 'bg-amber-600 text-white'
                              : 'bg-white text-slate-800 border border-amber-200'
                          }`}
                        >
                          Every {days} Days
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleAddToCart}
                  className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs sm:text-sm py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-95"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{isSubscribeMode ? 'Start Subscription' : 'Add to Cart'}</span>
                </button>

                <button
                  onClick={handleBuyNow}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-95"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Buy Now (Checkout)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Tabs. A sprayer has no nutritional analysis and no feeding rate,
              so those tabs are only offered for things that are consumed. */}
          <div className="border-t border-slate-200 pt-6">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-none">
              <button
                onClick={() => setActiveTab('desc')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'desc'
                    ? 'bg-emerald-800 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Description & Benefits
              </button>
              {consumable ? (
                <>
                  <button
                    onClick={() => setActiveTab('nutrition')}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === 'nutrition'
                        ? 'bg-emerald-800 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Nutritional Breakdown
                  </button>
                  <button
                    onClick={() => setActiveTab('usage')}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === 'usage'
                        ? 'bg-emerald-800 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {selectedProduct.category === 'Veterinary Care' || selectedProduct.category === 'Dairy Hygiene'
                      ? 'Usage & Dosage'
                      : 'Feeding Guidelines'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setActiveTab('usage')}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'usage'
                      ? 'bg-emerald-800 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  How To Use
                </button>
              )}
              <button
                onClick={() => setActiveTab('reviews')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'reviews'
                    ? 'bg-emerald-800 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Reviews ({selectedProduct.reviewCount})
              </button>
            </div>

            {/* Tab 1: Description & Benefits */}
            {activeTab === 'desc' && (
              <div className="pt-5 space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
                <p>{selectedProduct.description}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {selectedProduct.benefits.map((b, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2 text-xs font-medium text-slate-800"
                    >
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 2: Nutritional Breakdown Table */}
            {activeTab === 'nutrition' && (
              <div className="pt-5">
                <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden text-xs">
                  <div className="grid grid-cols-2 bg-slate-100 p-3 font-bold text-slate-800 border-b border-slate-200">
                    <span>Nutritional Component</span>
                    <span>Guaranteed Analysis</span>
                  </div>
                  <div className="divide-y divide-slate-200">
                    <div className="grid grid-cols-2 p-3 text-slate-700">
                      <span className="font-semibold">Crude Protein</span>
                      <span className="font-bold text-emerald-800">{selectedProduct.nutritionalInfo.crudeProtein}</span>
                    </div>
                    <div className="grid grid-cols-2 p-3 text-slate-700">
                      <span className="font-semibold">Crude Fat</span>
                      <span className="font-bold text-emerald-800">{selectedProduct.nutritionalInfo.crudeFat}</span>
                    </div>
                    <div className="grid grid-cols-2 p-3 text-slate-700">
                      <span className="font-semibold">Crude Fiber</span>
                      <span>{selectedProduct.nutritionalInfo.crudeFiber}</span>
                    </div>
                    <div className="grid grid-cols-2 p-3 text-slate-700">
                      <span className="font-semibold">Calcium</span>
                      <span>{selectedProduct.nutritionalInfo.calcium}</span>
                    </div>
                    <div className="grid grid-cols-2 p-3 text-slate-700">
                      <span className="font-semibold">Phosphorus</span>
                      <span>{selectedProduct.nutritionalInfo.phosphorus}</span>
                    </div>
                    <div className="grid grid-cols-2 p-3 text-slate-700">
                      <span className="font-semibold">Total Digestible Nutrients (TDN)</span>
                      <span className="font-bold text-emerald-800">{selectedProduct.nutritionalInfo.tdnEnergy}</span>
                    </div>
                    <div className="grid grid-cols-2 p-3 text-slate-700">
                      <span className="font-semibold">Fortified Vitamins</span>
                      <span>{selectedProduct.nutritionalInfo.vitamins}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Feeding guidelines / How to use */}
            {activeTab === 'usage' && (
              <div className="pt-5 space-y-4 text-xs sm:text-sm text-slate-700">
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 font-medium text-emerald-900">
                  <div className="font-bold mb-1 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-emerald-700" />
                    {consumable ? 'Recommended Dosage Instructions' : 'How To Use'}
                  </div>
                  <p>{selectedProduct.feedingInstructions}</p>
                </div>

                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  {consumable ? 'Raw Ingredients Used:' : 'Materials & Build:'}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedProduct.ingredients.map((ing, i) => (
                    <span
                      key={i}
                      className="bg-slate-100 text-slate-800 text-xs font-semibold px-3 py-1 rounded-lg border border-slate-200"
                    >
                      {ing}
                    </span>
                  ))}
                </div>

                {!consumable && selectedProduct.tags.length > 0 && (
                  <>
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Highlights:</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.tags.map((tag) => (
                        <span
                          key={tag}
                          className="bg-emerald-50 text-emerald-800 text-xs font-semibold px-3 py-1 rounded-lg border border-emerald-200"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Tab 4: Farmer Reviews */}
            {activeTab === 'reviews' && (
              <div className="pt-5 space-y-4">
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="text-center">
                    <div className="text-3xl font-black text-slate-900">{selectedProduct.rating}</div>
                    <RatingStars rating={selectedProduct.rating} />
                    <div className="text-[10px] text-slate-500 mt-1">{selectedProduct.reviewCount} Ratings</div>
                  </div>
                  <div className="text-xs text-slate-600 leading-relaxed border-l border-slate-200 pl-4">
                    <strong>100% Verified Farmer Reviews.</strong>{' '}
                    {consumable
                      ? 'Tested across high-yielding HF cows and Murrah buffalo breeds.'
                      : 'Reported by dairy farmers and field crews across the region.'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
