import React from 'react';
import { useApp } from '../../context/AppContext';
import type { Order } from '../../types';
import { TrendingUp, AlertTriangle, ShieldCheck, Truck, Package, Plus } from 'lucide-react';

/** Badge colour per order status. Every status gets an explicit colour: the old
 *  conditional chain fell through to red, which painted every order still in
 *  flight (Placed, Packed, Out for Delivery) as if it had failed. */
const STATUS_BADGE: Record<Order['status'], string> = {
  Placed: 'bg-cream text-ink-soft',
  Confirmed: 'bg-pine-soft text-pine',
  Packed: 'bg-pine-soft text-pine',
  Shipped: 'bg-ochre-soft text-ink',
  'Out for Delivery': 'bg-ochre-soft text-ink',
  Delivered: 'bg-pine text-cream',
  Cancelled: 'bg-clay/10 text-clay',
};

export const AdminOverview: React.FC = () => {
  const { products, orders, khataRecords, setAdminTab } = useApp();

  const lowStockProducts = products.filter((product) => product.stockCount <= product.minStockLevel);
  const overdueKhataCount = khataRecords.filter((record) => record.paymentStatus === 'Overdue').length;
  const totalOrderValue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const totalKhataOutstanding = khataRecords.reduce((sum, record) => sum + record.totalOutstanding, 0);
  const openOrders = orders.filter(
    (order) => order.status !== 'Delivered' && order.status !== 'Cancelled'
  );

  return (
    <div className="space-y-6">
      <div className="card flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1 className="mt-2 text-xl text-ink sm:text-2xl">Shop overview</h1>
          <p className="mt-1 text-xs text-ink-soft">
            Live figures from orders, stock and the credit ledger.
          </p>
        </div>

        <button onClick={() => setAdminTab('pos')} className="btn btn-primary self-start sm:self-auto">
          <Plus className="h-4 w-4" />
          New counter sale
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="card p-4">
          <div className="flex items-center justify-between text-ink-soft">
            <span className="text-xs font-bold uppercase tracking-wide">Order value</span>
            <TrendingUp className="h-3.5 w-3.5 text-pine" />
          </div>
          <p className="mt-1 text-2xl font-bold text-ink">₹{totalOrderValue.toLocaleString('en-IN')}</p>
          <p className="mt-1 text-[10px] font-semibold text-ink-soft">Across all recorded orders</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between text-ink-soft">
            <span className="text-xs font-bold uppercase tracking-wide">Khata due</span>
            <ShieldCheck className="h-3.5 w-3.5 text-ochre" />
          </div>
          <p className="mt-1 text-2xl font-bold text-ink">
            ₹{totalKhataOutstanding.toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-[10px] font-semibold text-ink-soft">
            {overdueKhataCount} overdue ({khataRecords.length} accounts)
          </p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between text-ink-soft">
            <span className="text-xs font-bold uppercase tracking-wide">Low stock</span>
            <AlertTriangle className="h-3.5 w-3.5 text-clay" />
          </div>
          <p className="mt-1 text-2xl font-bold text-clay">{lowStockProducts.length}</p>
          <p className="mt-1 text-[10px] font-semibold text-ink-soft">At or below reorder level</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between text-ink-soft">
            <span className="text-xs font-bold uppercase tracking-wide">Open orders</span>
            <Truck className="h-3.5 w-3.5 text-pine" />
          </div>
          <p className="mt-1 text-2xl font-bold text-ink">{openOrders.length}</p>
          <p className="mt-1 text-[10px] font-semibold text-ink-soft">Awaiting delivery or cancellation</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="card col-span-12 flex flex-col overflow-hidden lg:col-span-8">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-sm font-bold text-ink">Recent orders</h2>
            <button onClick={() => setAdminTab('delivery')} className="text-xs font-semibold text-pine hover:underline">
              View all
            </button>
          </div>

          {orders.length === 0 ? (
            <p className="p-8 text-center text-xs text-ink-soft">No orders recorded yet.</p>
          ) : (
            <div className="overflow-x-auto p-2">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-line text-[11px] uppercase text-ink-soft">
                    <th className="p-3 font-semibold">Order</th>
                    <th className="p-3 font-semibold">Customer</th>
                    <th className="p-3 font-semibold">Items</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {orders.slice(0, 5).map((order) => (
                    <tr key={order.id} className="border-b border-line/60 transition-colors hover:bg-cream/40">
                      <td className="p-3 font-mono font-bold text-ink-soft">{order.orderNumber}</td>
                      <td className="p-3">
                        <div className="font-semibold text-ink">{order.customerName}</div>
                        <div className="text-[10px] text-ink-soft">{order.customerVillage}</div>
                      </td>
                      <td className="max-w-[180px] truncate p-3 text-ink-soft">
                        {order.items.map((item) => item.productName).join(', ')}
                      </td>
                      <td className="p-3">
                        <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_BADGE[order.status]}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="p-3 text-right font-semibold text-ink">
                        ₹{order.totalAmount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card col-span-12 p-5 lg:col-span-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
            <Package className="h-4 w-4 text-pine" />
            Low stock watchlist
          </h2>

          {lowStockProducts.length === 0 ? (
            <p className="text-xs text-ink-soft">All products are above their reorder level.</p>
          ) : (
            <div className="space-y-3">
              {lowStockProducts.slice(0, 6).map((product) => (
                <div key={product.id} className="flex items-center justify-between border-b border-line pb-2 text-xs last:border-b-0">
                  <div>
                    <div className="font-medium text-ink">{product.name}</div>
                    <div className="text-[10px] text-ink-soft">
                      {product.stockCount} in stock · reorder at {product.minStockLevel}
                    </div>
                  </div>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                      product.stockCount === 0 ? 'bg-clay/10 text-clay' : 'bg-ochre-soft text-ink'
                    }`}
                  >
                    {product.stockCount === 0 ? 'Out' : 'Low'}
                  </span>
                </div>
              ))}
              <button onClick={() => setAdminTab('inventory')} className="btn btn-outline w-full !py-2 text-xs">
                Open inventory
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
