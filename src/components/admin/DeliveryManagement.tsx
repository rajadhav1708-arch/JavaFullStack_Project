import React from 'react';
import { useApp } from '../../context/AppContext';
import { Truck, MapPin, Phone, User, CheckCircle2, Clock } from 'lucide-react';

export const DeliveryManagement: React.FC = () => {
  const { orders } = useApp();

  const drivers = [
    { name: 'Ramesh Sawant', vehicle: 'MH-09-EQ-4421 (Mahindra Tractor)', phone: '+91 98223 99881', status: 'On Route' },
    { name: 'Ganesh Patil', vehicle: 'MH-09-CD-8812 (Bolero Pickup)', phone: '+91 94211 77234', status: 'Available' },
    { name: 'Sanjay More', vehicle: 'MH-09-XY-1209 (Tractor-Trolley)', phone: '+91 97632 33411', status: 'Loading' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900">Local Village Freight & Dispatch</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Assign delivery drivers, track tractor-trolley dispatches, and manage farm barn dropoffs.
        </p>
      </div>

      {/* Fleet Vehicles Status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {drivers.map((d, idx) => (
          <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                {d.status}
              </span>
              <Truck className="w-4 h-4 text-emerald-700" />
            </div>

            <div>
              <div className="font-bold text-slate-900 text-sm">{d.name}</div>
              <div className="text-xs text-slate-500">{d.vehicle}</div>
            </div>

            <div className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-emerald-700" />
              <span>{d.phone}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Active Dispatch Queue */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">Active Order Dispatches</h3>
        <div className="divide-y divide-slate-100">
          {orders.map((ord) => (
            <div key={ord.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
              <div>
                <div className="font-bold text-slate-900">{ord.customerName} (#{ord.orderNumber})</div>
                <div className="text-slate-500">{ord.shippingAddress.villageTown} | Est: {ord.estimatedDeliveryDate}</div>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl">
                  Driver: {ord.assignedDriver?.name || 'Unassigned'}
                </span>
                <span className="font-black text-slate-900">₹{ord.totalAmount}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
