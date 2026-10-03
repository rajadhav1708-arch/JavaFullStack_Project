import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, ProductCategory } from '../../types';
import {
  Plus,
  Search,
  Download,
  Trash2,
  X,
} from 'lucide-react';

export const InventoryManagement: React.FC = () => {
  const { products, categories, setProducts, addToast } = useApp();

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New product form
  const [newProd, setNewProd] = useState({
    name: '',
    brand: 'PashuPoshan',
    category: 'Dairy Cattle Feed' as ProductCategory,
    price: 1850,
    weightKg: 50,
    stockCount: 100,
    minStockLevel: 20,
    sku: 'PP-NEW-50KG',
    batchNumber: 'BT-2026-0901',
    expiryDate: '2027-04-01',
    image: 'https://images.unsplash.com/photo-1546445317-29f4545f9d52?auto=format&fit=crop&q=80&w=800',
  });

  const filtered = products.filter((p) => {
    if (selectedCat !== 'All' && p.category !== selectedCat) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    }
    return true;
  });

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProd.name.trim()) return;

    const created: Product = {
      id: `prod-${Date.now()}`,
      name: newProd.name,
      brand: newProd.brand,
      category: newProd.category,
      suitableFor: ['Cow', 'Buffalo'],
      description: 'High-quality certified compound cattle feed.',
      nutritionalInfo: {
        crudeProtein: '20.0%',
        crudeFiber: '10.0%',
        crudeFat: '4.5%',
        calcium: '1.2%',
        phosphorus: '0.8%',
        tdnEnergy: '75.0%',
        vitamins: 'Vitamins A, D3, E',
      },
      ingredients: ['Maize Bran', 'Mustard Cake', 'Mineral Mixture'],
      feedingInstructions: 'Feed 1kg per 2.5L milk yield daily.',
      benefits: ['Boosts daily milk yield', 'Maintains milk fat test'],
      weightOptions: [{ weightKg: newProd.weightKg, price: newProd.price, stock: newProd.stockCount }],
      selectedWeightKg: newProd.weightKg,
      price: newProd.price,
      originalPrice: newProd.price + 200,
      discountPercent: 10,
      rating: 4.8,
      reviewCount: 12,
      inStock: newProd.stockCount > 0,
      stockCount: newProd.stockCount,
      minStockLevel: newProd.minStockLevel,
      sku: newProd.sku,
      batchNumber: newProd.batchNumber,
      expiryDate: newProd.expiryDate,
      image: newProd.image,
    };

    setProducts((prev) => [created, ...prev]);
    setIsAddModalOpen(false);
    addToast(`Added new feed product: ${created.name}`, 'success');
  };

  const handleDeleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    addToast('Product removed from inventory', 'info');
  };

  const exportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['SKU,Name,Brand,Category,Stock,Price,Batch,Expiry']
        .concat(products.map((p) => `${p.sku},"${p.name}",${p.brand},${p.category},${p.stockCount},${p.price},${p.batchNumber},${p.expiryDate}`))
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'PashuFeed_Inventory_2026.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Exported inventory report to CSV', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">Inventory & Batch Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor bag stocks, batch numbers, expiry dates, and low-stock reorder thresholds.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Feed Product</span>
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Search SKU, Feed name, Brand..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl pl-9 pr-4 py-2 outline-none focus:border-emerald-600"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Category:</span>
          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3 py-2 outline-none w-full sm:w-auto"
          >
            <option value="All">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-900 font-bold border-b border-slate-200">
              <tr>
                <th className="p-4">SKU / Feed Name</th>
                <th className="p-4">Category</th>
                <th className="p-4">Batch #</th>
                <th className="p-4">Stock Bags</th>
                <th className="p-4">Selling Price</th>
                <th className="p-4">Expiry Date</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filtered.map((prod) => {
                const isLowStock = prod.stockCount <= prod.minStockLevel;

                return (
                  <tr key={prod.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 text-xs">{prod.name}</div>
                      <div className="text-[10px] text-slate-400">SKU: {prod.sku} | {prod.brand}</div>
                    </td>
                    <td className="p-4">{prod.category}</td>
                    <td className="p-4 font-mono text-[11px] text-slate-600">{prod.batchNumber}</td>
                    <td className="p-4 font-bold text-slate-900">{prod.stockCount} Bags</td>
                    <td className="p-4 font-bold text-emerald-800">₹{prod.price}</td>
                    <td className="p-4 text-slate-600">{prod.expiryDate}</td>
                    <td className="p-4">
                      {isLowStock ? (
                        <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                          Low Stock
                        </span>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                          In Stock
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDeleteProduct(prod.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg cursor-pointer"
                        title="Delete Feed"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-black text-slate-900">Add New Feed Product to Inventory</h2>

            <form onSubmit={handleAddProduct} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={newProd.name}
                  onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                  placeholder="e.g. PashuPoshan High-Fat Concentrate"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category</label>
                  <select
                    value={newProd.category}
                    onChange={(e) => setNewProd({ ...newProd, category: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Brand</label>
                  <input
                    type="text"
                    value={newProd.brand}
                    onChange={(e) => setNewProd({ ...newProd, brand: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    value={newProd.price}
                    onChange={(e) => setNewProd({ ...newProd, price: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Initial Stock Bags</label>
                  <input
                    type="number"
                    value={newProd.stockCount}
                    onChange={(e) => setNewProd({ ...newProd, stockCount: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 text-white font-bold rounded-xl shadow-md"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
