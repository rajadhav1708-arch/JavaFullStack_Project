import React from 'react';
import { useApp } from '../../context/AppContext';
import { MOCK_SALES_ANALYTICS } from '../../data/mockData';
import {
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  ArrowUpRight,
  Plus,
  Truck,
} from 'lucide-react';

export const AdminOverview: React.FC = () => {
  const { products, orders, khataRecords, setAdminTab } = useApp();

  const lowStockProducts = products.filter((p) => p.stockCount <= p.minStockLevel);
  const overdueKhataCount = khataRecords.filter((k) => k.status === 'Overdue').length;

  return (
    <div className="space-y-6">
      {/* Top Welcome Bar */}
      <div className="bg-[#064e3b] text-white p-6 rounded-2xl shadow-sm border border-[#065f46] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Central Shop Operations Dashboard</h1>
          <p className="text-xs text-[#a7f3d0] mt-1">
            Real-time sales, inventory batch tracking, POS counter billing, and farmer credit ledger.
          </p>
        </div>

        <button
          onClick={() => setAdminTab('pos')}
          className="bg-[#10b981] hover:bg-[#059669] text-white font-bold text-xs px-5 py-2.5 rounded-lg flex items-center gap-2 cursor-pointer shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>+ New Sale / POS Counter</span>
        </button>
      </div>

      {/* KPI Stats Cards - High Density Theme */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium uppercase tracking-wider flex items-center justify-between">
            <span>Total Revenue (MTD)</span>
            <TrendingUp className="w-3.5 h-3.5 text-[#10b981]" />
          </div>
          <div className="text-2xl font-bold mt-1 text-slate-900">
            ₹{MOCK_SALES_ANALYTICS.todaySales.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-green-600 font-semibold mt-1 flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3" />
            <span>+12.4% from last month</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium uppercase tracking-wider flex items-center justify-between">
            <span>Active Credit Ledger</span>
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-2xl font-bold mt-1 text-slate-900">
            ₹{MOCK_SALES_ANALYTICS.totalKhataOutstanding.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-amber-600 font-semibold mt-1">
            {overdueKhataCount} farmers overdue (&gt;30 days)
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium uppercase tracking-wider flex items-center justify-between">
            <span>Low Stock Alerts</span>
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
          </div>
          <div className="text-2xl font-bold mt-1 text-red-600">
            {lowStockProducts.length < 10 ? `0${lowStockProducts.length}` : lowStockProducts.length}
          </div>
          <div className="text-[10px] text-slate-500 font-semibold mt-1">
            Reorder priority required
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium uppercase tracking-wider flex items-center justify-between">
            <span>Pending Deliveries</span>
            <Truck className="w-3.5 h-3.5 text-[#10b981]" />
          </div>
          <div className="text-2xl font-bold mt-1 text-slate-900">{orders.length}</div>
          <div className="text-[10px] text-green-600 font-semibold mt-1">
            Village Freight Dispatches Active
          </div>
        </div>
      </div>

      {/* Grid Section: High Density Sales Table + Inventory At A Glance Widget */}
      <div className="grid grid-cols-12 gap-6">
        {/* Recent Sales Table (8 Cols) */}
        <div className="col-span-12 lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-sm">Recent Sales & Transactions</h3>
            <button
              onClick={() => setAdminTab('orders')}
              className="text-xs text-[#10b981] font-semibold hover:underline cursor-pointer"
            >
              View All
            </button>
          </div>

          <div className="overflow-x-auto p-2">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[11px] uppercase text-slate-400 border-b border-slate-100">
                  <th className="p-3 font-semibold">Order ID</th>
                  <th className="p-3 font-semibold">Customer</th>
                  <th className="p-3 font-semibold">Product Details</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {orders.slice(0, 5).map((ord) => (
                  <tr key={ord.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-700">{ord.orderNumber}</td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-800">{ord.customerName}</div>
                      <div className="text-[10px] text-slate-400">{ord.customerVillage}</div>
                    </td>
                    <td className="p-3 text-slate-600 max-w-[180px] truncate">
                      {ord.items.map((i) => i.name).join(', ')}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          ord.status === 'Delivered'
                            ? 'bg-green-100 text-green-700'
                            : ord.status === 'Shipped'
                            ? 'bg-amber-100 text-amber-700'
                            : ord.status === 'Processing'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </td>
                    <td className="p-3 text-right font-semibold text-slate-900">
                      ₹{ord.totalAmount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Widgets (4 Cols) */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          {/* Smart Recommender Widget */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="font-bold text-slate-800 text-sm mb-3">Smart Feed Recommender</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Active Analysis</span>
                <span className="font-bold text-[#10b981]">72% Profiled</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="w-[72%] h-full bg-[#10b981] rounded-full"></div>
              </div>
              <p className="text-[11px] text-slate-500 mt-2 italic leading-relaxed">
                &quot;High-protein bypass fat supplements recommended for crossbreed cows during monsoon high-humidity lactation.&quot;
              </p>
              <button
                onClick={() => setAdminTab('inventory')}
                className="w-full py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 mt-2 hover:bg-slate-100 cursor-pointer"
              >
                Run Recommendation Tool
              </button>
            </div>
          </div>

          {/* Dark Forest Green Inventory Card */}
          <div className="bg-[#064e3b] rounded-xl shadow-sm p-5 text-white relative overflow-hidden flex-1">
            <div className="relative z-10">
              <h3 className="font-bold text-sm mb-1">Inventory At A Glance</h3>
              <p className="text-[10px] text-[#a7f3d0] mb-4">50kg Feed Bags Stock Health</p>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-[#065f46]">
                  <div>
                    <div className="font-medium text-[#34d399]">High-Pro Pellets</div>
                    <div className="text-[10px] opacity-70">In Stock: 142 bags</div>
                  </div>
                  <div className="text-right font-bold text-xs text-[#34d399]">94%</div>
                </div>

                <div className="flex items-center justify-between text-xs pb-2 border-b border-[#065f46]">
                  <div>
                    <div className="font-medium text-amber-300">Mineral Mix XL</div>
                    <div className="text-[10px] opacity-70">In Stock: 8 units</div>
                  </div>
                  <div className="text-right font-bold text-xs text-amber-300">Low</div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div>
                    <div className="font-medium text-red-300">Lactation Booster</div>
                    <div className="text-[10px] opacity-70">In Stock: 2 bags</div>
                  </div>
                  <div className="text-right font-bold text-xs text-red-300">Reorder</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
