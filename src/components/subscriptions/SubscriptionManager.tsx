import React from 'react';
import { useApp } from '../../context/AppContext';
import { Repeat, Calendar, CheckCircle2, PauseCircle, Trash2, ArrowRight } from 'lucide-react';

export const SubscriptionManager: React.FC = () => {
  const { subscriptions, cancelSubscription, setCurrentView } = useApp();

  return (
    <div className="bg-transparent text-slate-100 min-h-screen py-10 relative z-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <div>
            <div className="inline-flex items-center gap-1 text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-md text-xs font-bold mb-1">
              <Repeat className="w-3.5 h-3.5" />
              <span>Automated Feed Deliveries</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900">My Feed Subscriptions</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Scheduled monthly tractor deliveries to your village barn with 5% recurring discount.
            </p>
          </div>

          <button
            onClick={() => setCurrentView('shop')}
            className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            <span>Subscribe New Feed</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {subscriptions.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs">
            <Repeat className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-900 text-base">No Active Feed Subscriptions</h3>
            <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
              Never run out of cattle feed during peak lactation. Set up auto-delivery every 15, 30, or 60 days.
            </p>
            <button
              onClick={() => setCurrentView('shop')}
              className="mt-4 bg-emerald-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer"
            >
              Explore Feed Store
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md">
                      {sub.status}
                    </span>
                    <span className="text-xs text-slate-400">Every {sub.frequencyDays} Days</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{sub.productName}</h3>
                  <div className="text-xs text-slate-500">
                    {sub.weightKg} kg Bag x{sub.quantity} | Delivery: {sub.deliveryAddress}
                  </div>
                  <div className="text-xs font-semibold text-amber-800 flex items-center gap-1 pt-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-600" />
                    <span>Next Auto-Dispatch Date: {sub.nextDeliveryDate}</span>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 gap-3">
                  <div className="text-lg font-black text-slate-900">
                    ₹{sub.pricePerDelivery.toLocaleString('en-IN')}
                    <span className="text-[10px] text-slate-400 font-normal block">per cycle</span>
                  </div>

                  <button
                    onClick={() => cancelSubscription(sub.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                    title="Cancel Subscription"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
