import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Phone, Plus, X } from 'lucide-react';
import { Supplier } from '../../types';

export const SupplierManagement: React.FC = () => {
  const { addToast } = useApp();
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);

  const suppliers: Supplier[] = [
    {
      id: 'sup-1',
      name: 'Godrej Agrovet Cattle Feeds',
      category: 'Compound Pellet Feeds',
      contactPerson: 'Mr. Rajesh Sharma (Zonal Sales Mgr)',
      phone: '+91 98900 12345',
      email: 'orders@godrejagrovet.com',
      address: 'MIDC Industrial Zone, Pune',
      leadTimeDays: 2,
      activeOrders: 1,
      rating: 4.9,
    },
    {
      id: 'sup-2',
      name: 'PashuPoshan Feed Mills Pvt Ltd',
      category: 'High Protein Feed & Minerals',
      contactPerson: 'Sanjay Deshmukh',
      phone: '+91 94220 55432',
      email: 'supply@pashuposhan.co.in',
      address: 'Gokul Shirgaon MIDC, Kolhapur',
      leadTimeDays: 1,
      activeOrders: 2,
      rating: 4.8,
    },
    {
      id: 'sup-3',
      name: 'VetVital Care Pharma',
      category: 'Liquid Calcium & Bypass Fat Powder',
      contactPerson: 'Dr. Vivek Kulkarni',
      phone: '+91 98233 88120',
      email: 'pharma@vetvital.com',
      address: 'Bhosari Industrial Estate, Pune',
      leadTimeDays: 3,
      activeOrders: 0,
      rating: 4.7,
    },
  ];

  const handleCreatePo = (e: React.FormEvent) => {
    e.preventDefault();
    setIsPoModalOpen(false);
    addToast('Bulk Purchase Order (PO #PO-2026-88) dispatched to Supplier via Email/SMS!', 'success');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">Supplier & Manufacturer Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Procurement purchase orders (POs), lead times, and raw material supply chain.
          </p>
        </div>

        <button
          onClick={() => setIsPoModalOpen(true)}
          className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs px-5 py-3 rounded-2xl flex items-center gap-1.5 cursor-pointer shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>New Bulk Purchase Order (PO)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {suppliers.map((sup) => (
          <div key={sup.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md">
                {sup.category}
              </span>
              <span className="text-xs font-bold text-slate-500">Lead: {sup.leadTimeDays} Days</span>
            </div>

            <div>
              <h3 className="font-bold text-slate-900 text-base">{sup.name}</h3>
              <div className="text-xs text-slate-500 mt-0.5">{sup.contactPerson}</div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Phone:</span>
                <span className="font-bold text-slate-900">{sup.phone}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Active Bulk Orders:</span>
                <span className="font-bold text-emerald-800">{sup.activeOrders} Dispatches</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* New PO Modal */}
      {isPoModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setIsPoModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-black text-slate-900">Create Bulk Feed Purchase Order</h2>

            <form onSubmit={handleCreatePo} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Feed Manufacturer</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none">
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Order Quantity (50kg Bags)</label>
                <input
                  type="number"
                  defaultValue={200}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPoModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 font-bold text-slate-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-800 text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Send Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
