import React from 'react';
import { Plus } from 'lucide-react';

export const OffersAndDiscounts: React.FC = () => {
  const coupons = [
    { code: 'KISAAN10', desc: '10% OFF on all Calcium & Supplement Gels', expiry: '2026-10-31', active: true },
    { code: 'MONSOON50', desc: '₹50 Flat OFF per 50kg Bypass Fat Bag', expiry: '2026-09-15', active: true },
    { code: 'GOKULSUBSCRIBE', desc: '5% Extra Off on Auto-Monthly Subscriptions', expiry: 'Ongoing', active: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">Promotions, Coupons & Loyalty</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure farmer promotional discount codes and milk collection bonus incentives.
          </p>
        </div>

        <button className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs px-5 py-3 rounded-2xl flex items-center gap-1.5 cursor-pointer shadow-md">
          <Plus className="w-4 h-4" />
          <span>Create Coupon Code</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {coupons.map((c, idx) => (
          <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="font-mono font-black text-emerald-800 text-sm bg-emerald-100 px-3 py-1 rounded-xl border border-emerald-300">
                {c.code}
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                Active
              </span>
            </div>

            <p className="text-xs font-bold text-slate-800">{c.desc}</p>
            <div className="text-[11px] text-slate-400">Expires: {c.expiry}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
