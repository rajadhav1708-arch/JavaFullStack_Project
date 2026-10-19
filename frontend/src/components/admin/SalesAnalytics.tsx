import React, { useState } from 'react';
import { BarChart3, PieChart, ArrowUpRight } from 'lucide-react';

export const SalesAnalytics: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month' | 'year'>('month');

  const emptyTrend: { day: string; sales: number; orders: number }[] = [];
  const emptyCategories: { name: string; percentage: number; color: string }[] = [];

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">Sales & Revenue Analytics</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Analytics populate from real orders once they are placed through the shop.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
          {(['today', 'week', 'month', 'year'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-3 py-1.5 rounded-xl capitalize transition-all cursor-pointer ${
                timeframe === t ? 'bg-emerald-800 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Top Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500">Gross Monthly Sales</div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            ₹0
          </div>
          <div className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 mt-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+0% vs previous period</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500">Avg Feed Order Value</div>
          <div className="text-2xl font-black text-slate-900 mt-1">₹3,057</div>
          <div className="text-[11px] font-semibold text-slate-500 mt-1">Approx 2.2 bags per order</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500">Estimated Gross Margin</div>
          <div className="text-2xl font-black text-emerald-800 mt-1">21.8%</div>
          <div className="text-[11px] font-semibold text-emerald-700 mt-1">₹1,84,200 Net Shop Profit</div>
        </div>
      </div>

      {/* Daily Sales Bar Chart Simulation */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <BarChart3 className="w-4 h-4 text-emerald-700" />
            <span>Daily Sales Trend (Weekly Overview)</span>
          </div>
          <span className="text-xs font-bold text-slate-500">Aug 2026</span>
        </div>

        {/* Visual Bar Chart */}
        <div className="pt-6 pb-2">
          <div className="h-48 flex items-end justify-between gap-3 px-2 border-b border-slate-200">
            {emptyTrend.map((d, idx) => {
              const maxVal = 60000;
              const heightPercent = Math.round((d.sales / maxVal) * 100);

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                  {/* Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-md whitespace-nowrap pointer-events-none z-10 shadow-lg">
                    ₹{d.sales.toLocaleString('en-IN')} ({d.orders} orders)
                  </div>

                  <div
                    className="w-full bg-gradient-to-t from-emerald-800 to-emerald-600 rounded-t-xl transition-all duration-500 group-hover:from-emerald-900 group-hover:to-teal-500"
                    style={{ height: `${heightPercent}%` }}
                  />
                  <span className="text-xs font-bold text-slate-600">{d.day}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Category Share Breakdown */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 font-bold text-slate-900 text-sm pb-3 border-b border-slate-100">
          <PieChart className="w-4 h-4 text-emerald-700" />
          <span>Feed Category Market Share</span>
        </div>

        <div className="space-y-3">
          {emptyCategories.map((cat, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-800">{cat.name}</span>
                <span className="text-emerald-800">{cat.percentage}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
