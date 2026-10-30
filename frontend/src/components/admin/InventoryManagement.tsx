import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Search, Download, Package } from 'lucide-react';

export const InventoryManagement: React.FC = () => {
  const { products, categories, addToast } = useApp();

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('All');

  const filtered = products.filter((product) => {
    if (selectedCat !== 'All' && product.category !== selectedCat) return false;
    if (search.trim()) {
      const query = search.toLowerCase();
      return (
        product.name.toLowerCase().includes(query) ||
        product.brand.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const exportCSV = () => {
    const rows = [
      'SKU,Name,Brand,Category,Stock,Price,Batch,Expiry',
      ...products.map(
        (product) =>
          `${product.sku},"${product.name}",${product.brand},${product.category},${product.stockCount},${product.price},${product.batchNumber},${product.expiryDate}`
      ),
    ];
    const link = document.createElement('a');
    link.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.join('\n')));
    link.setAttribute('download', 'hindavi_inventory.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Exported inventory to CSV', 'success');
  };

  return (
    <div className="space-y-6">
      <div className="card flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl text-ink sm:text-2xl">Inventory</h1>
          <p className="mt-0.5 text-xs text-ink-soft">
            Live stock levels from the catalogue. Stock is updated automatically when orders are
            placed online or at the counter.
          </p>
        </div>

        <button onClick={exportCSV} className="btn btn-outline !px-4 !py-2.5 text-xs">
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      <div className="card flex flex-col items-center justify-between gap-4 p-4 sm:flex-row">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <input
            type="text"
            placeholder="Search SKU, product or brand…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="field !pl-9"
          />
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <span className="whitespace-nowrap text-xs font-bold text-ink-soft">Category</span>
          <select
            value={selectedCat}
            onChange={(event) => setSelectedCat(event.target.value)}
            className="field !w-auto !py-2 font-bold"
          >
            <option value="All">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <Package className="h-8 w-8 text-ink-soft" />
            <p className="text-sm font-bold text-ink">Nothing matches</p>
            <p className="text-xs text-ink-soft">Try a different search term or category.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-cream/60 font-bold text-ink">
                <tr>
                  <th className="p-4">Product</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Batch</th>
                  <th className="p-4">Stock</th>
                  <th className="p-4">Price</th>
                  <th className="p-4">Expiry</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line font-medium text-ink-soft">
                {filtered.map((product) => {
                  const isLowStock = product.stockCount <= product.minStockLevel;
                  return (
                    <tr key={product.id} className="transition-colors hover:bg-cream/40">
                      <td className="p-4">
                        <div className="text-xs font-bold text-ink">{product.name}</div>
                        <div className="text-[10px] text-ink-soft">
                          {product.sku} · {product.brand}
                        </div>
                      </td>
                      <td className="p-4">{product.category}</td>
                      <td className="p-4 font-mono text-[11px]">{product.batchNumber || '—'}</td>
                      <td className="p-4 font-bold text-ink">
                        {product.stockCount} {product.unit === 'kg' ? 'bags' : 'units'}
                      </td>
                      <td className="p-4 font-bold text-ink">₹{product.price.toLocaleString('en-IN')}</td>
                      <td className="p-4">{product.expiryDate || '—'}</td>
                      <td className="p-4">
                        {isLowStock ? (
                          <span className="rounded-md bg-clay/10 px-2 py-0.5 text-[10px] font-bold text-clay">
                            Low stock
                          </span>
                        ) : (
                          <span className="rounded-md bg-pine-soft px-2 py-0.5 text-[10px] font-bold text-pine">
                            In stock
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
