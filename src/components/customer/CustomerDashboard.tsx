import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShoppingBag,
  ShieldCheck,
  Repeat,
  Award,
  Truck,
} from 'lucide-react';

export const CustomerDashboard: React.FC = () => {
  const {
    orders,
    khataRecords,
    subscriptions,
    wishlist,
    products,
    setActiveOrderForTracking,
    setCurrentView,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'orders' | 'khata' | 'subscriptions' | 'wishlist'>('orders');

  // Customer specific khata record (Suresh Patil sample)
  const myKhata = khataRecords[0];

  return (
    <div className="bg-transparent text-slate-100 min-h-screen py-10 relative z-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Profile Welcome Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-emerald-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-400 text-slate-950 font-black text-2xl flex items-center justify-center border-2 border-white shadow-md">
              SP
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black">Suresh Kumar Patil</h1>
                <span className="bg-emerald-800 border border-emerald-600 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md">
                  Gold Dairy Farmer
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">Kagal Village, Kolhapur | Dairy Herd: 18 Cows & Buffaloes</p>
            </div>
          </div>

          <button
            onClick={() => setCurrentView('shop')}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-5 py-3 rounded-2xl flex items-center gap-2 cursor-pointer shadow-md"
          >
            <ShoppingBag className="w-4 h-4 text-amber-300" />
            <span>Order Feed</span>
          </button>
        </div>

        {/* Dashboard Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold text-slate-600">Total Orders</span>
              <ShoppingBag className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="text-2xl font-black text-slate-900">{orders.length} Orders</div>
            <span className="text-[10px] text-emerald-700 font-semibold">Active village deliveries</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold text-slate-600">Khata Due Balance</span>
              <ShieldCheck className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-900">
              ₹{myKhata ? myKhata.totalOutstanding.toLocaleString('en-IN') : 0}
            </div>
            <span className="text-[10px] text-slate-500">Due Date: {myKhata?.dueDate}</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold text-slate-600">Loyalty Points</span>
              <Award className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="text-2xl font-black text-slate-900">1,480 PTS</div>
            <span className="text-[10px] text-emerald-700 font-semibold">₹148 Instant Cash Redeemable</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold text-slate-600">Auto Subscriptions</span>
              <Repeat className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="text-2xl font-black text-slate-900">{subscriptions.length} Active</div>
            <span className="text-[10px] text-emerald-700 font-semibold">Next: {subscriptions[0]?.nextDeliveryDate}</span>
          </div>
        </div>

        {/* Customer Portal Tabs */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'orders' ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              My Orders ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab('khata')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'khata' ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Khata Credit Ledger
            </button>
            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'subscriptions' ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Feed Subscriptions
            </button>
            <button
              onClick={() => setActiveTab('wishlist')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'wishlist' ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Saved Wishlist ({wishlist.length})
            </button>
          </div>

          {/* TAB 1: ORDERS */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              {orders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md">
                        {ord.status}
                      </span>
                      <span className="text-xs text-slate-400">Order #{ord.orderNumber}</span>
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      {ord.items.map((i) => `${i.productName} (x${i.quantity})`).join(', ')}
                    </div>
                    <div className="text-xs text-slate-500">
                      Placed on: {ord.date} | Payment: {ord.paymentMethod} ({ord.paymentStatus})
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 gap-2">
                    <div className="text-base font-black text-slate-900">₹{ord.totalAmount.toLocaleString('en-IN')}</div>
                    <button
                      onClick={() => {
                        setActiveOrderForTracking(ord);
                        setCurrentView('order-tracking');
                      }}
                      className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1 cursor-pointer"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Track Order</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: KHATA LEDGER */}
          {activeTab === 'khata' && myKhata && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
                <div>
                  <div className="font-bold text-emerald-900 text-sm">Credit Limit: ₹{myKhata.totalCreditLimit.toLocaleString('en-IN')}</div>
                  <div className="text-emerald-700 mt-0.5">Approved for milk collection deduction</div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-slate-500 font-semibold">Outstanding Due:</div>
                  <div className="text-xl font-black text-amber-900">₹{myKhata.totalOutstanding.toLocaleString('en-IN')}</div>
                </div>
              </div>

              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Khata Transaction Log</h4>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                {myKhata.transactions.map((tx) => (
                  <div key={tx.id} className="p-3.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{tx.notes}</div>
                      <div className="text-[11px] text-slate-400">{tx.date}</div>
                    </div>
                    <div className={`font-black ${tx.type === 'Purchase' ? 'text-amber-800' : 'text-emerald-700'}`}>
                      {tx.type === 'Purchase' ? `+₹${tx.amount}` : `-₹${tx.amount}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: SUBSCRIPTIONS */}
          {activeTab === 'subscriptions' && (
            <div className="space-y-3 text-xs">
              {subscriptions.map((sub) => (
                <div key={sub.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{sub.productName}</div>
                    <div className="text-slate-500">Every {sub.frequencyDays} Days | Next: {sub.nextDeliveryDate}</div>
                  </div>
                  <div className="font-black text-slate-900 text-sm">₹{sub.pricePerDelivery}</div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: WISHLIST */}
          {activeTab === 'wishlist' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {wishlist.map((id) => {
                const prod = products.find((p) => p.id === id);
                if (!prod) return null;
                return (
                  <div key={id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3">
                    <img src={prod.image} alt={prod.name} className="w-16 h-16 object-cover rounded-xl" />
                    <div>
                      <div className="font-bold text-slate-900 text-xs">{prod.name}</div>
                      <div className="font-black text-slate-900 text-xs mt-1">₹{prod.price}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
