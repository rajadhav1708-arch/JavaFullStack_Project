import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { BarChart3, PieChart, Receipt } from 'lucide-react';

const TIMEFRAMES = ['today', 'week', 'month'] as const;
type Timeframe = (typeof TIMEFRAMES)[number];

const daysAgo = (days: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

const withinTimeframe = (orderDate: string, timeframe: Timeframe): boolean => {
  const order = new Date(orderDate);
  if (Number.isNaN(order.getTime())) return false;
  if (timeframe === 'today') {
    const today = new Date();
    return order.toDateString() === today.toDateString();
  }
  if (timeframe === 'week') return order >= daysAgo(7);
  return order >= daysAgo(30);
};

export const SalesAnalytics: React.FC = () => {
  const { orders, products } = useApp();
  const [timeframe, setTimeframe] = useState<Timeframe>('month');

  const filteredOrders = useMemo(
    () => orders.filter((order) => withinTimeframe(order.date, timeframe)),
    [orders, timeframe]
  );

  const grossSales = filteredOrders.reduce((sum, order) => sum + order.totalAmount, 0);
  const orderCount = filteredOrders.length;
  const averageOrder = orderCount > 0 ? Math.round(grossSales / orderCount) : 0;

  const dailyTrend = useMemo(() => {
    const buckets = new Map<string, { sales: number; orders: number }>();
    filteredOrders.forEach((order) => {
      const key = order.date;
      const bucket = buckets.get(key) ?? { sales: 0, orders: 0 };
      bucket.sales += order.totalAmount;
      bucket.orders += 1;
      buckets.set(key, bucket);
    });
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7)
      .map(([day, data]) => ({ day: day.slice(5), ...data }));
  }, [filteredOrders]);

  const categoryShare = useMemo(() => {
    const totals = new Map<string, number>();
    filteredOrders.forEach((order) => {
      order.items.forEach((item) => {
        const product = products.find((p) => p.id === item.productId);
        const category = product?.category ?? 'Other';
        totals.set(category, (totals.get(category) ?? 0) + item.totalPrice);
      });
    });
    const total = Array.from(totals.values()).reduce((sum, value) => sum + value, 0) || 1;
    const colors = ['#1f4d3a', '#c8842a', '#b4552d', '#55635b', '#14382a'];
    return Array.from(totals.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, value], index) => ({
        name,
        percentage: Math.round((value / total) * 100),
        color: colors[index % colors.length],
      }));
  }, [filteredOrders, products]);

  const maxTrend = Math.max(...dailyTrend.map((entry) => entry.sales), 1);

  return (
    <div className="space-y-6">
      <div className="card flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl text-ink sm:text-2xl">Sales and revenue</h1>
          <p className="mt-0.5 text-xs text-ink-soft">
            Computed from real orders recorded in the shop system.
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-2xl bg-cream p-1 text-xs font-bold">
          {TIMEFRAMES.map((value) => (
            <button
              key={value}
              onClick={() => setTimeframe(value)}
              className={`rounded-xl px-3 py-1.5 capitalize transition-colors ${
                timeframe === value ? 'bg-pine text-cream' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <div className="text-xs font-bold text-ink-soft">Gross sales</div>
          <div className="mt-1 text-2xl font-bold text-ink">₹{grossSales.toLocaleString('en-IN')}</div>
          <div className="mt-1 text-[11px] text-ink-soft">Last {timeframe}</div>
        </div>

        <div className="card p-5">
          <div className="text-xs font-bold text-ink-soft">Orders</div>
          <div className="mt-1 text-2xl font-bold text-ink">{orderCount}</div>
          <div className="mt-1 text-[11px] text-ink-soft">In the selected period</div>
        </div>

        <div className="card p-5">
          <div className="text-xs font-bold text-ink-soft">Average order</div>
          <div className="mt-1 text-2xl font-bold text-ink">₹{averageOrder.toLocaleString('en-IN')}</div>
          <div className="mt-1 text-[11px] text-ink-soft">Gross sales ÷ orders</div>
        </div>
      </div>

      <div className="card space-y-4 p-6">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
            <BarChart3 className="h-4 w-4 text-pine" />
            Daily sales
          </h2>
          <span className="text-xs font-bold text-ink-soft">Last 7 days with orders</span>
        </div>

        {dailyTrend.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Receipt className="h-8 w-8 text-ink-soft" />
            <p className="text-sm font-bold text-ink">No orders in this period</p>
            <p className="text-xs text-ink-soft">The chart fills in as orders are placed.</p>
          </div>
        ) : (
          <div className="flex h-48 items-end justify-between gap-3 border-b border-line px-2 pt-6">
            {dailyTrend.map((entry) => (
              <div key={entry.day} className="group relative flex flex-1 flex-col items-center gap-2">
                <div className="pointer-events-none absolute -top-10 z-10 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[10px] font-bold text-cream opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                  ₹{entry.sales.toLocaleString('en-IN')} ({entry.orders} order
                  {entry.orders === 1 ? '' : 's'})
                </div>
                <div
                  className="w-full rounded-t-xl bg-pine transition-all duration-500 group-hover:bg-pine-deep"
                  style={{ height: `${Math.round((entry.sales / maxTrend) * 100)}%` }}
                />
                <span className="text-xs font-bold text-ink-soft">{entry.day}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card space-y-4 p-6">
        <h2 className="flex items-center gap-2 border-b border-line pb-3 text-sm font-bold text-ink">
          <PieChart className="h-4 w-4 text-pine" />
          Sales by product category
        </h2>

        {categoryShare.length === 0 ? (
          <p className="py-6 text-center text-xs text-ink-soft">
            Category shares appear once products have been ordered.
          </p>
        ) : (
          <div className="space-y-3">
            {categoryShare.map((category) => (
              <div key={category.name} className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-ink">{category.name}</span>
                  <span className="text-pine">{category.percentage}%</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-cream">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${category.percentage}%`, backgroundColor: category.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
