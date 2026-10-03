import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Truck, Phone } from 'lucide-react';

const ORDER_STATUSES = ['Placed', 'Confirmed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'] as const;

export const DeliveryManagement: React.FC = () => {
  const { orders, refreshOrders, addToast } = useApp();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  /** The owner drives the live-tracking timeline: each change here is the
   *  status the customer sees on their tracking page. Server is the source of
   *  truth, so the local list is re-fetched afterwards. */
  const updateStatus = async (orderId: string, status: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId.replace('ord-', '')}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        addToast(body.message ?? 'Could not update status.', 'error');
        return;
      }
      addToast(`Order ${orderId} marked ${status}`, 'success');
      await refreshOrders();
    } catch {
      addToast('Network error updating status.', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  /** Owner confirms the farmer has actually paid (COD at door, UPI/card,
   *  or an approved Khata credit). Only then does the customer bill unlock. */
  const confirmPayment = async (orderId: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId.replace('ord-', '')}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: 'Paid' }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        addToast(body.message ?? 'Could not confirm payment.', 'error');
        return;
      }
      addToast(`Payment confirmed for ${orderId}. Bill is now unlocked for the farmer.`, 'success');
      await refreshOrders();
    } catch {
      addToast('Network error confirming payment.', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

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
                <span className={`font-bold px-2.5 py-1 rounded-xl border ${
                  ord.paymentStatus === 'Paid'
                    ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                    : 'text-amber-800 bg-amber-50 border-amber-200'
                }`}>
                  {ord.paymentStatus === 'Paid' ? 'Bill Paid' : `Awaiting payment (${ord.paymentMethod})`}
                </span>
                <select
                  value={ord.status}
                  disabled={updatingId === ord.id}
                  onChange={(e) => void updateStatus(ord.id, e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-900 font-semibold outline-none focus:border-emerald-600 disabled:opacity-50"
                >
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {ord.paymentStatus !== 'Paid' && (
                  <button
                    onClick={() => void confirmPayment(ord.id)}
                    disabled={updatingId === ord.id}
                    className="bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white font-bold px-3 py-1.5 rounded-xl cursor-pointer"
                  >
                    Confirm Payment
                  </button>
                )}
                <span className="font-black text-slate-900">₹{ord.totalAmount}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
