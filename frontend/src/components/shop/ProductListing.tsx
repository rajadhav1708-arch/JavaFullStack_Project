import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { Product } from '../../types';
import { RatingStars } from '../common/RatingStars';
import { ProductImage } from '../common/ProductImage';
import { formatVariantLabel, formatCartVariantLabel } from '../../utils/variants';
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
  Tag,
  X,
} from 'lucide-react';

const ANIMAL_FILTERS = ['All', 'Cow', 'Buffalo', 'Calf', 'Pregnant Heifer'] as const;

export const ProductListing: React.FC = () => {
  const {
    products,
    categories,
    isCatalogueLoading,
    catalogueError,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
  } = useApp();
  const { t } = useLanguage();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [selectedAnimal, setSelectedAnimal] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'price-asc' | 'price-desc' | 'rating'>('newest');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const brands = useMemo(
    () => ['All', ...Array.from(new Set(products.map((product) => product.brand)))],
    [products]
  );

  const filteredProducts = useMemo(
    () =>
      products
        .filter((product) => {
          if (selectedCategory !== 'All' && product.category !== selectedCategory) return false;
          if (selectedBrand !== 'All' && product.brand !== selectedBrand) return false;
          if (
            selectedAnimal !== 'All' &&
            !product.suitableFor.includes(selectedAnimal as Product['suitableFor'][number])
          ) {
            return false;
          }
          if (onlyInStock && !product.inStock) return false;
          if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            return [product.name, product.brand, product.category, product.description].some((field) =>
              field.toLowerCase().includes(query)
            );
          }
          return true;
        })
        .sort((a, b) => {
          if (sortBy === 'price-asc') return a.price - b.price;
          if (sortBy === 'price-desc') return b.price - a.price;
          if (sortBy === 'rating') return b.rating - a.rating;
          if (sortBy === 'popular') return (b.reviewCount || 0) - (a.reviewCount || 0);

          return (
            Number(b.isNew) - Number(a.isNew) ||
            (a.sortOrder ?? 100) - (b.sortOrder ?? 100) ||
            Number(b.isBestSeller) - Number(a.isBestSeller) ||
            (b.reviewCount || 0) - (a.reviewCount || 0)
          );
        }),
    [products, selectedCategory, selectedBrand, selectedAnimal, onlyInStock, searchQuery, sortBy]
  );

  const resetFilters = () => {
    setSelectedCategory('All');
    setSelectedBrand('All');
    setSelectedAnimal('All');
    setOnlyInStock(false);
    setSearchQuery('');
  };

  if (isCatalogueLoading) {
    return (
      <div className="min-h-screen bg-cream py-24 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-pine border-t-transparent" />
        <p className="mt-4 text-sm text-ink-soft">{t('shop.loading')}</p>
      </div>
    );
  }

  if (catalogueError) {
    return (
      <div className="min-h-screen bg-cream py-24">
        <div className="mx-auto max-w-md text-center">
          <h1 className="text-lg font-bold text-ink">{t('shop.errorTitle')}</h1>
          <p className="mt-2 text-sm text-ink-soft">{catalogueError}</p>
          <button onClick={() => window.location.reload()} className="btn btn-primary mt-5">
            {t('shop.errorCta')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <p className="text-[11px] font-semibold text-ink-soft">
            {t('shop.breadcrumbHome')} /{' '}
            <span className="text-pine">
              {selectedCategory === 'All' ? t('shop.breadcrumbCatalogue') : selectedCategory}
            </span>
          </p>
          <div className="mt-1 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-2xl text-ink sm:text-3xl">{t('shop.title')}</h1>
              <p className="mt-1 text-xs text-ink-soft sm:text-sm">
                {filteredProducts.length === 1
                  ? t('shop.productCountOne')
                  : t('shop.productCount', { count: filteredProducts.length })}
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
              <input
                type="text"
                placeholder={t('shop.searchPlaceholder')}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="field !pl-9 !pr-8"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink"
                  aria-label={t('common.close')}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-1">
          <CategoryPill active={selectedCategory === 'All'} onClick={() => setSelectedCategory('All')}>
            {t('shop.allProducts')}
          </CategoryPill>
          {categories.map((category) => (
            <CategoryPill
              key={category.id}
              active={selectedCategory === category.id}
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.name}
            </CategoryPill>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          <aside className="hidden space-y-6 lg:block">
            <div className="card space-y-6 p-5">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <span className="flex items-center gap-2 text-sm font-bold text-ink">
                  <SlidersHorizontal className="h-4 w-4 text-pine" />
                  {t('shop.filters')}
                </span>
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-1 text-[11px] font-semibold text-pine hover:underline"
                >
                  <RotateCcw className="h-3 w-3" />
                  {t('shop.reset')}
                </button>
              </div>

              <AnimalFilter value={selectedAnimal} onChange={setSelectedAnimal} />

              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink">{t('shop.brand')}</p>
                <select value={selectedBrand} onChange={(event) => setSelectedBrand(event.target.value)} className="field">
                {brands.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand === 'All' ? t('shop.allBrands') : brand}
                  </option>
                ))}
              </select>
              </div>

              <label className="flex cursor-pointer items-center gap-2 border-t border-line pt-3 text-xs font-semibold text-ink">
                <input
                  type="checkbox"
                  checked={onlyInStock}
                  onChange={(event) => setOnlyInStock(event.target.checked)}
                  className="accent-pine"
                />
                {t('shop.inStockOnly')}
              </label>
            </div>
          </aside>

          <div className="space-y-6 lg:col-span-3">
            <div className="card flex items-center justify-between gap-4 p-3.5">
              <button
                onClick={() => setIsMobileFilterOpen(true)}
                className="btn btn-outline !px-3 !py-2 text-xs lg:hidden"
              >
                <Filter className="h-4 w-4 text-pine" />
                {t('shop.filters')}
              </button>

              <div className="flex items-center gap-2 text-xs">
                <span className="hidden text-ink-soft sm:inline">{t('shop.sort')}</span>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
                  className="field !w-auto !py-2 font-semibold"
                >
                  <option value="newest">{t('shop.sortNewest')}</option>
                  <option value="popular">{t('shop.sortMostReviewed')}</option>
                  <option value="price-asc">{t('shop.sortPriceLowHigh')}</option>
                  <option value="price-desc">{t('shop.sortPriceHighLow')}</option>
                  <option value="rating">{t('shop.sortHighestRated')}</option>
                </select>
              </div>

              <div className="flex items-center gap-1 rounded-xl bg-cream p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`rounded-lg p-1.5 transition-colors ${
                    viewMode === 'grid' ? 'bg-paper text-pine shadow-sm' : 'text-ink-soft hover:text-ink'
                  }`}
                  title={t('shop.gridView')}
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`rounded-lg p-1.5 transition-colors ${
                    viewMode === 'list' ? 'bg-paper text-pine shadow-sm' : 'text-ink-soft hover:text-ink'
                  }`}
                  title={t('shop.listView')}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="card mx-auto max-w-lg p-12 text-center">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-pine-soft text-pine">
                  <Search className="h-7 w-7" />
                </span>
                <h2 className="mt-4 text-lg font-bold text-ink">{t('shop.emptyTitle')}</h2>
                <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-ink-soft">
                  {t('shop.emptyBody')}
                </p>
                <button onClick={resetFilters} className="btn btn-primary mt-5">
                  {t('shop.emptyCta')}
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredProducts.map((product) => (
                  <ProductCardGrid key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredProducts.map((product) => (
                  <ProductCardList key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-ink/40 backdrop-blur-sm" onClick={() => setIsMobileFilterOpen(false)}>
          <div
            className="h-full w-full max-w-xs space-y-6 overflow-y-auto bg-paper p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <span className="text-base font-bold text-ink">{t('shop.filters')}</span>
              <button onClick={() => setIsMobileFilterOpen(false)} aria-label={t('common.close')}>
                <X className="h-5 w-5 text-ink-soft" />
              </button>
            </div>

            <AnimalFilter value={selectedAnimal} onChange={setSelectedAnimal} />

            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink">{t('shop.brand')}</p>
              <select value={selectedBrand} onChange={(event) => setSelectedBrand(event.target.value)} className="field">
                {brands.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand === 'All' ? t('shop.allBrands') : brand}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-ink">
              <input
                type="checkbox"
                checked={onlyInStock}
                onChange={(event) => setOnlyInStock(event.target.checked)}
                className="accent-pine"
              />
              {t('shop.inStockOnly')}
            </label>

            <button onClick={() => setIsMobileFilterOpen(false)} className="btn btn-primary w-full">
              {filteredProducts.length === 1
                ? t('shop.showCountOne')
                : t('shop.showCount', { count: filteredProducts.length })}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const CategoryPill: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({
  active,
  onClick,
  children,
}) => (
  <button
    onClick={onClick}
    className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-colors ${
      active ? 'bg-pine text-cream' : 'border border-line bg-paper text-ink-soft hover:border-pine/40 hover:text-ink'
    }`}
  >
    {children}
  </button>
);

const AnimalFilter: React.FC<{ value: string; onChange: (value: string) => void }> = ({ value, onChange }) => {
  const { t } = useLanguage();
  const animalLabels: Record<string, string> = {
    All: t('shop.animalAll'),
    Cow: t('shop.animalCow'),
    Buffalo: t('shop.animalBuffalo'),
    Calf: t('shop.animalCalf'),
    'Pregnant Heifer': t('shop.animalHeifer'),
  };
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink">{t('shop.suitableFor')}</p>
      <p className="mb-2 text-[11px] leading-relaxed text-ink-soft">{t('shop.suitableForHelp')}</p>
      <div className="space-y-1.5 text-xs">
        {ANIMAL_FILTERS.map((animal) => (
          <label key={animal} className="flex cursor-pointer items-center gap-2 text-ink-soft hover:text-ink">
            <input
              type="radio"
              name="animalType"
              checked={value === animal}
              onChange={() => onChange(animal)}
              className="accent-pine"
            />
            <span>{animalLabels[animal] ?? animal}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

const ProductCardGrid: React.FC<{ product: Product }> = ({ product }) => {
  const { addToCart, wishlist, toggleWishlist, setSelectedProduct } = useApp();
  const { t } = useLanguage();
  const [selectedWeight, setSelectedWeight] = useState<number>(product.selectedWeightKg || 50);

  const currentOption =
    product.weightOptions.find((option) => option.weightKg === selectedWeight) || product.weightOptions[0];
  const priceToDisplay = currentOption ? currentOption.price : product.price;
  const inStock = currentOption ? currentOption.stock > 0 : product.inStock;
  const isWishlisted = wishlist.includes(product.id);

  return (
    <article className="card group flex flex-col overflow-hidden transition-shadow hover:shadow-lg">
      <div className="relative h-48 overflow-hidden bg-cream">
        <ProductImage
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {product.isNew ? (
          <span className="absolute left-2.5 top-2.5 rounded-md bg-pine px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-cream">
            {t('shop.newBadge')}
          </span>
        ) : (
          product.discountPercent > 0 && (
            <span className="absolute left-2.5 top-2.5 rounded-md bg-ochre px-2 py-0.5 text-[10px] font-black text-ink">
              {t('shop.off', { n: product.discountPercent })}
            </span>
          )
        )}

        <div className="absolute right-2.5 top-2.5 flex flex-col gap-1">
          <button
            onClick={() => toggleWishlist(product.id)}
            className={`rounded-full p-2 shadow-md backdrop-blur transition-colors ${
              isWishlisted ? 'bg-clay text-paper' : 'bg-paper/85 text-ink-soft hover:bg-paper'
            }`}
            aria-label={isWishlisted ? t('product.unsaveAria') : t('product.saveAria')}
          >
            <Heart className={`h-3.5 w-3.5 ${isWishlisted ? 'fill-current' : ''}`} />
          </button>
          <button
            onClick={() => setSelectedProduct(product)}
            className="rounded-full bg-paper/85 p-2 text-ink-soft shadow-md backdrop-blur transition-colors hover:bg-paper"
            title={t('product.closeAria')}
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
        </div>

        {product.suitableFor.length > 0 ? (
          <span className="absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-full bg-ink/80 px-2 py-0.5 text-[10px] font-semibold text-cream backdrop-blur">
            <ShieldCheck className="h-3 w-3 text-ochre" />
            {product.suitableFor.join(', ')}
          </span>
        ) : (
          product.tags.length > 0 && (
            <span className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center gap-1 truncate rounded-full bg-ink/80 px-2 py-0.5 text-[10px] font-semibold text-cream backdrop-blur">
              <Tag className="h-3 w-3 shrink-0 text-ochre" />
              <span className="truncate">{product.tags.slice(0, 2).join(' · ')}</span>
            </span>
          )
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-pine">{product.brand}</p>
          <h3
            onClick={() => setSelectedProduct(product)}
            className="mt-0.5 line-clamp-2 cursor-pointer text-sm font-bold text-ink transition-colors hover:text-pine"
          >
            {product.name}
          </h3>

          <div className="mt-2">
            <RatingStars rating={product.rating} count={product.reviewCount} />
          </div>

          <ul className="mt-2.5 space-y-1">
            {product.highlights.slice(0, 2).map((highlight) => (
              <li key={highlight} className="flex items-start gap-1.5 text-[11px] leading-snug text-ink-soft">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-ochre" />
                <span className="line-clamp-1">{highlight}</span>
              </li>
            ))}
          </ul>

          {product.weightOptions.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-ink-soft">{t('shop.packLabel')}</span>
              {product.weightOptions.map((option) => (
                <button
                  key={option.weightKg}
                  onClick={() => setSelectedWeight(option.weightKg)}
                  className={`rounded-md border px-2 py-0.5 text-[11px] font-bold transition-colors ${
                    selectedWeight === option.weightKg
                      ? 'border-pine bg-pine text-cream'
                      : 'border-line bg-cream text-ink-soft hover:bg-paper'
                  }`}
                >
                  {formatVariantLabel(option.weightKg, option.unit)}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
          <div>
            <p className="text-base font-bold text-ink">₹{priceToDisplay.toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-ink-soft">{t('shop.exclGst')}</p>
          </div>

          <button
            onClick={() => addToCart(product, selectedWeight, 1)}
            disabled={!inStock}
            className="btn btn-primary !px-3 !py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            {inStock ? t('shop.addToCart') : t('shop.outOfStock')}
          </button>
        </div>
      </div>
    </article>
  );
};

const ProductCardList: React.FC<{ product: Product }> = ({ product }) => {
  const { addToCart, wishlist, toggleWishlist, setSelectedProduct } = useApp();
  const { t } = useLanguage();
  const [selectedWeight, setSelectedWeight] = useState<number>(product.selectedWeightKg || 50);

  const currentOption =
    product.weightOptions.find((option) => option.weightKg === selectedWeight) || product.weightOptions[0];
  const priceToDisplay = currentOption ? currentOption.price : product.price;
  const inStock = currentOption ? currentOption.stock > 0 : product.inStock;
  const isWishlisted = wishlist.includes(product.id);

  return (
    <article className="card flex flex-col items-center justify-between gap-6 p-4 transition-shadow hover:shadow-lg sm:flex-row">
      <div className="flex w-full items-center gap-4 sm:w-auto">
        <ProductImage
          src={product.image}
          alt={product.name}
          className="h-24 w-24 shrink-0 rounded-xl border border-line object-cover sm:h-32 sm:w-32"
        />
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-pine-soft px-2 py-0.5 text-[10px] font-bold uppercase text-pine">
              {product.brand}
            </span>
            {product.isNew && (
              <span className="rounded-md bg-pine px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cream">
                {t('shop.newBadge')}
              </span>
            )}
            {product.suitableFor.length > 0 ? (
              <span className="rounded-md bg-cream px-2 py-0.5 text-[10px] font-bold uppercase text-ink-soft">
                {product.suitableFor.join(', ')}
              </span>
            ) : (
              product.tags.slice(0, 2).map((tag) => (
                <span key={tag} className="rounded-md bg-cream px-2 py-0.5 text-[10px] font-bold uppercase text-ink-soft">
                  {tag}
                </span>
              ))
            )}
          </div>
          <h3
            onClick={() => setSelectedProduct(product)}
            className="cursor-pointer text-base font-bold text-ink transition-colors hover:text-pine"
          >
            {product.name}
          </h3>
          <p className="line-clamp-2 max-w-md text-xs text-ink-soft">{product.description}</p>
          <RatingStars rating={product.rating} count={product.reviewCount} />
        </div>
      </div>

      <div className="flex w-full items-center justify-between gap-6 border-t border-line pt-3 sm:w-auto sm:justify-end sm:border-t-0 sm:pt-0">
        <div className="text-right">
          <p className="text-lg font-bold text-ink">₹{priceToDisplay.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-ink-soft">
            {formatCartVariantLabel(product, selectedWeight)} ·{' '}
            {inStock ? t('shop.inStockCount', { n: product.stockCount }) : t('shop.outOfStock')}
          </p>
          <button
            onClick={() => toggleWishlist(product.id)}
            className={`mt-1 text-[10px] font-bold ${isWishlisted ? 'text-clay' : 'text-ink-soft hover:text-ink'}`}
          >
            {isWishlisted ? t('shop.saved') : t('shop.saveItem')}
          </button>
        </div>

        <button
          onClick={() => addToCart(product, selectedWeight, 1)}
          disabled={!inStock}
          className="btn btn-primary !px-4 !py-2.5 text-xs disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ShoppingBag className="h-4 w-4" />
          {inStock ? 'Add to cart' : 'Out of stock'}
        </button>
      </div>
    </article>
  );
};
