import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { ProductCategory, Product } from '../../types';
import { PRODUCT_CATEGORIES } from '../../data/mockData';
import { RatingStars } from '../common/RatingStars';
import {
  Search,
  Filter,
  SlidersHorizontal,
  Grid,
  List,
  Heart,
  Eye,
  ShoppingBag,
  RotateCcw,
  ShieldCheck,
  X,
} from 'lucide-react';

export const ProductListing: React.FC = () => {
  const {
    products,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    addToCart,
    wishlist,
    toggleWishlist,
    setSelectedProduct,
  } = useApp();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedBrand, setSelectedBrand] = useState<string>('All');
  const [selectedAnimal, setSelectedAnimal] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'popular' | 'price-asc' | 'price-desc' | 'rating'>('popular');
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState<boolean>(false);

  // Extract unique brands
  const brands = useMemo(() => {
    const list = Array.from(new Set(products.map((p) => p.brand)));
    return ['All', ...list];
  }, [products]);

  // Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Category filter
        if (selectedCategory !== 'All' && p.category !== selectedCategory) {
          return false;
        }
        // Brand filter
        if (selectedBrand !== 'All' && p.brand !== selectedBrand) {
          return false;
        }
        // Animal filter
        if (selectedAnimal !== 'All' && !p.suitableFor.includes(selectedAnimal as any)) {
          return false;
        }
        // In-stock filter
        if (onlyInStock && !p.inStock) {
          return false;
        }
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = p.name.toLowerCase().includes(q);
          const matchBrand = p.brand.toLowerCase().includes(q);
          const matchCat = p.category.toLowerCase().includes(q);
          const matchDesc = p.description.toLowerCase().includes(q);
          if (!matchName && !matchBrand && !matchCat && !matchDesc) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.price - b.price;
        if (sortBy === 'price-desc') return b.price - a.price;
        if (sortBy === 'rating') return b.rating - a.rating;
        return (b.reviewCount || 0) - (a.reviewCount || 0); // default popular
      });
  }, [products, selectedCategory, selectedBrand, selectedAnimal, onlyInStock, searchQuery, sortBy]);

  const resetFilters = () => {
    setSelectedCategory('All');
    setSelectedBrand('All');
    setSelectedAnimal('All');
    setOnlyInStock(false);
    setSearchQuery('');
  };

  return (
    <div className="bg-transparent text-slate-100 min-h-screen py-8 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb & Header Title */}
        <div className="mb-6">
          <div className="text-xs font-medium text-slate-500 mb-1">
            Home &gt; <span className="text-emerald-800 font-bold">Cattle Feed Store</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Cattle Feeds & Dairy Supplements
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm mt-1">
                Showing {filteredProducts.length} certified products for cows, buffaloes, and calves.
              </p>
            </div>

            {/* Quick Search Bar */}
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl pl-9 pr-8 py-2.5 outline-none focus:border-emerald-600 shadow-2xs"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Category Filter Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`whitespace-nowrap text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer ${
              selectedCategory === 'All'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            All Feeds
          </button>
          {PRODUCT_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`whitespace-nowrap text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Main Content Layout (Sidebar Filters + Grid/List) */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Desktop Filter Sidebar */}
          <div className="hidden lg:block space-y-6">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                  <SlidersHorizontal className="w-4 h-4 text-emerald-700" />
                  <span>Filter Products</span>
                </div>
                <button
                  onClick={resetFilters}
                  className="text-[11px] font-semibold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset All</span>
                </button>
              </div>

              {/* Animal Type Filter */}
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">
                  Suitable Animal
                </label>
                <div className="space-y-1.5 text-xs">
                  {['All', 'Cow', 'Buffalo', 'Calf', 'Pregnant Heifer'].map((animal) => (
                    <label
                      key={animal}
                      className="flex items-center gap-2 text-slate-700 hover:text-slate-900 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="animalType"
                        checked={selectedAnimal === animal}
                        onChange={() => setSelectedAnimal(animal)}
                        className="text-emerald-700 focus:ring-emerald-500"
                      />
                      <span>{animal === 'All' ? 'All Animals' : animal}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Brand Filter */}
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">
                  Brand
                </label>
                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 outline-none focus:border-emerald-600"
                >
                  {brands.map((b) => (
                    <option key={b} value={b}>
                      {b === 'All' ? 'All Brands' : b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Availability */}
              <div className="pt-3 border-t border-slate-100">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onlyInStock}
                    onChange={(e) => setOnlyInStock(e.target.checked)}
                    className="rounded text-emerald-700 focus:ring-emerald-500"
                  />
                  <span>In Stock Only</span>
                </label>
              </div>
            </div>
          </div>

          {/* Right Product Grid Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Top Toolbar (Sort + View Switcher + Mobile Filter Trigger) */}
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs flex items-center justify-between gap-4">
              <button
                onClick={() => setIsMobileFilterOpen(true)}
                className="lg:hidden flex items-center gap-1.5 bg-slate-100 text-slate-800 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200"
              >
                <Filter className="w-4 h-4 text-emerald-700" />
                <span>Filters</span>
              </button>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 hidden sm:inline">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 font-semibold text-xs rounded-xl px-3 py-2 outline-none"
                >
                  <option value="popular">Popularity & Yield</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                </select>
              </div>

              {/* Grid / List Switcher */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'grid' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-400 hover:text-slate-700'
                  }`}
                  title="Grid View"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'list' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-400 hover:text-slate-700'
                  }`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Empty State */}
            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs max-w-lg mx-auto">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">No Cattle Feeds Found</h3>
                <p className="text-slate-500 text-xs mt-1.5 max-w-sm mx-auto">
                  We couldn&apos;t find any products matching your search criteria or selected category filter.
                </p>
                <button
                  onClick={resetFilters}
                  className="mt-5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              /* GRID VIEW */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCardGrid key={product.id} product={product} />
                ))}
              </div>
            ) : (
              /* LIST VIEW */
              <div className="space-y-4">
                {filteredProducts.map((product) => (
                  <ProductCardList key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Modal */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-xs h-full p-6 space-y-6 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="font-bold text-slate-900 text-base">Filter Feeds</span>
              <button onClick={() => setIsMobileFilterOpen(false)}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Animal Type */}
            <div>
              <label className="text-xs font-bold text-slate-800 uppercase block mb-2">Suitable Animal</label>
              <div className="space-y-2 text-xs">
                {['All', 'Cow', 'Buffalo', 'Calf', 'Pregnant Heifer'].map((animal) => (
                  <label key={animal} className="flex items-center gap-2 text-slate-700">
                    <input
                      type="radio"
                      name="mAnimalType"
                      checked={selectedAnimal === animal}
                      onChange={() => setSelectedAnimal(animal)}
                      className="text-emerald-700"
                    />
                    <span>{animal}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={() => setIsMobileFilterOpen(false)}
              className="w-full bg-emerald-800 text-white font-bold text-xs py-3 rounded-xl"
            >
              Apply Filters ({filteredProducts.length})
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* Inner Subcomponent: Product Grid Card */
const ProductCardGrid: React.FC<{ product: Product }> = ({ product }) => {
  const { addToCart, wishlist, toggleWishlist, setSelectedProduct } = useApp();
  const [selectedWeight, setSelectedWeight] = useState<number>(product.selectedWeightKg || 50);

  const currentOption = product.weightOptions.find((w) => w.weightKg === selectedWeight) || product.weightOptions[0];
  const priceToDisplay = currentOption ? currentOption.price : product.price;
  const isWishlisted = wishlist.includes(product.id);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-xl hover:border-emerald-500/40 transition-all flex flex-col justify-between group overflow-hidden">
      {/* Image Container */}
      <div className="relative h-48 bg-slate-100 overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
          {product.discountPercent > 0 && (
            <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-md">
              {product.discountPercent}% OFF
            </span>
          )}
        </div>

        {/* Action icons */}
        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1">
          <button
            onClick={() => toggleWishlist(product.id)}
            className={`p-2 rounded-full shadow-md backdrop-blur-md transition-all cursor-pointer ${
              isWishlisted ? 'bg-red-500 text-white' : 'bg-white/80 text-slate-700 hover:bg-white'
            }`}
          >
            <Heart className="w-3.5 h-3.5 fill-current" />
          </button>
          <button
            onClick={() => setSelectedProduct(product)}
            className="p-2 bg-white/80 hover:bg-white text-slate-700 rounded-full shadow-md backdrop-blur-md transition-all cursor-pointer"
            title="Quick Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Animal Tag */}
        <div className="absolute bottom-2.5 left-2.5 bg-slate-900/80 backdrop-blur-md text-slate-200 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>{product.suitableFor.join(', ')}</span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="text-[11px] font-bold text-emerald-700 uppercase">{product.brand}</div>
          <h3
            onClick={() => setSelectedProduct(product)}
            className="text-sm font-bold text-slate-900 hover:text-emerald-700 transition-colors cursor-pointer mt-0.5 line-clamp-2"
          >
            {product.name}
          </h3>

          <div className="mt-2">
            <RatingStars rating={product.rating} count={product.reviewCount} />
          </div>

          {/* Weight selector */}
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400">Pack:</span>
            {product.weightOptions.map((opt) => (
              <button
                key={opt.weightKg}
                onClick={() => setSelectedWeight(opt.weightKg)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold border transition-colors cursor-pointer ${
                  selectedWeight === opt.weightKg
                    ? 'bg-emerald-800 text-white border-emerald-800'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
              >
                {opt.weightKg} kg
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Price & Add button */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <div>
            <div className="text-base font-black text-slate-900">₹{priceToDisplay.toLocaleString('en-IN')}</div>
            <div className="text-[10px] text-slate-400">Excl. GST & Freight</div>
          </div>

          <button
            onClick={() => addToCart(product, selectedWeight, 1)}
            className="flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all cursor-pointer active:scale-95"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Add to Cart</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/* Inner Subcomponent: Product List Card */
const ProductCardList: React.FC<{ product: Product }> = ({ product }) => {
  const { addToCart, wishlist, toggleWishlist, setSelectedProduct } = useApp();
  const [selectedWeight, setSelectedWeight] = useState<number>(product.selectedWeightKg || 50);

  const currentOption = product.weightOptions.find((w) => w.weightKg === selectedWeight) || product.weightOptions[0];
  const priceToDisplay = currentOption ? currentOption.price : product.price;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:shadow-lg transition-all flex flex-col sm:flex-row items-center justify-between gap-6">
      <div className="flex items-center gap-4 w-full sm:w-auto">
        <img
          src={product.image}
          alt={product.name}
          className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-xl shrink-0 border border-slate-100"
        />
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-emerald-700 uppercase bg-emerald-50 px-2 py-0.5 rounded-md">
            {product.brand}
          </span>
          <h3
            onClick={() => setSelectedProduct(product)}
            className="text-base font-bold text-slate-900 hover:text-emerald-700 transition-colors cursor-pointer"
          >
            {product.name}
          </h3>
          <p className="text-slate-500 text-xs line-clamp-2 max-w-md">{product.description}</p>
          <div className="pt-1">
            <RatingStars rating={product.rating} count={product.reviewCount} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0">
        <div className="text-right">
          <div className="text-lg font-black text-slate-900">₹{priceToDisplay.toLocaleString('en-IN')}</div>
          <div className="text-[10px] text-slate-400">In Stock ({product.stockCount} Bags)</div>
        </div>

        <button
          onClick={() => addToCart(product, selectedWeight, 1)}
          className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Add to Cart</span>
        </button>
      </div>
    </div>
  );
};
