import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Truck, Phone, Package } from 'lucide-react';

const ORDER_STATUSES = [
  'Placed',
  'Confirmed',
  'Packed',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
] as const;

export const DeliveryManagement: React.FC = () => {
  const { orders, refreshOrders, addToast } = useApp();
  const { csrfToken } = useAuth();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  /** The owner drives the live-tracking timeline: each change here is the
   *  status the customer sees on their tracking page. Server is the source of
   *  truth, so the local list is re-fetched afterwards. */
  const updateStatus = async (orderId: string, status: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId.replace('ord-', '')}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {} ) },
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
        headers: { 'Content-Type': 'application/json', ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {} ) },
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

  const openOrders = orders.filter(
    (order) => order.status !== 'Delivered' && order.status !== 'Cancelled'
  );

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h1 className="text-xl text-ink sm:text-2xl">Dispatch</h1>
        <p className="mt-0.5 text-xs text-ink-soft">
          Track every open order, update its delivery status (which the customer sees on their
          tracking page), and confirm payments received at the door.
        </p>
      </div>

      <div className="card p-6">
        <h2 className="border-b border-line pb-3 text-sm font-bold text-ink">
          Open orders ({openOrders.length})
        </h2>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Package className="h-8 w-8 text-ink-soft" />
            <p className="text-sm font-bold text-ink">No orders yet</p>
            <p className="text-xs text-ink-soft">
              Orders placed through the shop or the counter will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {orders.map((order) => (
              <div
                key={order.id}
                className="flex flex-col justify-between gap-4 py-4 text-xs sm:flex-row sm:items-center"
              >
                <div className="min-w-0">
                  <p className="font-bold text-ink">
                    {order.customerName} (#{order.orderNumber})
                  </p>
                  <p className="text-ink-soft">
                    {order.shippingAddress.villageTown} · {order.deliveryType} · Est:{' '}
                    {order.estimatedDeliveryDate}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-xl border border-line bg-cream px-2.5 py-1 font-bold text-ink-soft">
                    {order.assignedDriver ? (
                      <span className="flex items-center gap-1">
                        <Truck className="h-3.5 w-3.5" />
                        {order.assignedDriver.name}
                      </span>
                    ) : (
                      'Unassigned'
                    )}
                  </span>
                  <span
                    className={`rounded-xl border px-2.5 py-1 font-bold ${
                      order.paymentStatus === 'Paid'
                        ? 'border-pine/20 bg-pine-soft text-pine'
                        : 'border-ochre/30 bg-ochre-soft text-ink'
                    }`}
                  >
                    {order.paymentStatus === 'Paid'
                      ? 'Paid'
                      : `Awaiting payment (${order.paymentMethod})`}
                  </span>
                  <select
                    value={order.status}
                    disabled={updatingId === order.id}
                    onChange={(event) => void updateStatus(order.id, event.target.value)}
                    className="field !w-auto !py-1.5 font-bold disabled:opacity-50"
                  >
                    {ORDER_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  {order.paymentStatus !== 'Paid' && (
                    <button
                      onClick={() => void confirmPayment(order.id)}
                      disabled={updatingId === order.id}
                      className="btn btn-primary !px-3 !py-1.5 text-[11px] disabled:opacity-50"
                    >
                      Confirm payment
                    </button>
                  )}
                  <span className="font-bold text-ink">
                    ₹{order.totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
