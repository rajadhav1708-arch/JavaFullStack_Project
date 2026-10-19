import React from 'react';
import { useApp } from '../../context/AppContext';
import { ProductImage } from '../common/ProductImage';
import { formatVariantLabel } from '../../utils/variants';
import { Truck, CheckCircle2, Phone, Printer, ArrowLeft } from 'lucide-react';

export const OrderTrackingModal: React.FC = () => {
  const { activeOrderForTracking, setCurrentView } = useApp();

  if (!activeOrderForTracking) {
    return (
      <div className="bg-slate-50 min-h-screen py-16 text-center">
        <h2 className="text-xl font-bold text-slate-800">No Active Order Selected</h2>
        <button
          onClick={() => setCurrentView('home')}
          className="mt-4 bg-emerald-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl"
        >
          Return to Home
        </button>
      </div>
    );
  }

  const order = activeOrderForTracking;

  const steps = [
    { label: 'Order Placed', desc: 'Received at Shop System' },
    { label: 'Confirmed', desc: 'Khata / Payment Approved' },
    { label: 'Packed & Weighed', desc: 'Feed Bags Prepared' },
    { label: 'Shipped', desc: 'Loaded on Dispatch Freight' },
    { label: 'Out for Village Delivery', desc: 'Driver en route to Barn' },
    { label: 'Delivered', desc: 'Handed to Farmer' },
  ];

  return (
    <div className="bg-slate-50 min-h-screen py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <button
          onClick={() => setCurrentView('customer-dashboard')}
          className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Customer Orders</span>
        </button>

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md">
                  {order.status}
                </span>
                <span className="text-xs text-slate-400">Order #{order.orderNumber}</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 mt-1">Order Dispatch Tracking</h1>
              <p className="text-xs text-slate-500 mt-0.5">Estimated Barn Arrival: {order.estimatedDeliveryDate}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (order.paymentStatus !== 'Paid') {
                    // The bill does not exist until the owner confirms payment.
                    alert('Bill will be generated once the shop owner confirms your payment.');
                    return;
                  }
                  const lines = order.items
                    .map((i) => `• ${i.productName} (${i.weightKg}kg x${i.quantity}) — ₹${i.totalPrice.toLocaleString('en-IN')}`)
                    .join('\n');
                  const text =
                    `PashuFeed Pro bill — Order #${order.orderNumber}\n` +
                    `${lines}\n` +
                    `Subtotal: ₹${order.subtotal.toLocaleString('en-IN')} | Discount: ₹${order.discount} | GST: ₹${order.tax} | Delivery: ₹${order.deliveryCharge}\n` +
                    `Total: ₹${order.totalAmount.toLocaleString('en-IN')}\n` +
                    `Payment: ${order.paymentMethod} (${order.paymentStatus})`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
                }}
                className="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer"
              >
                <span>Send Bill on WhatsApp</span>
              </button>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Thermal Invoice</span>
              </button>
            </div>
          </div>

          {/* Interactive Delivery Timeline */}
          <div className="py-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-6">Delivery Progress Timeline</h3>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 relative">
              {steps.map((st, idx) => {
                const stepNum = idx + 1;
                const isDone = stepNum <= order.trackingStepIndex;

                return (
                  <div key={idx} className="flex flex-col items-center text-center space-y-2">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-xs transition-colors ${
                        isDone ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}
                    >
                      {isDone ? <CheckCircle2 className="w-5 h-5" /> : stepNum}
                    </div>
                    <div>
                      <div className={`text-xs font-bold ${isDone ? 'text-slate-900' : 'text-slate-400'}`}>
                        {st.label}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{st.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Driver Contact Box */}
          {order.assignedDriver && (
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-800 text-amber-300 font-bold flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Assigned Delivery Driver</div>
                  <div className="text-xs text-slate-600">
                    {order.assignedDriver.name} | Vehicle: {order.assignedDriver.vehicleNo}
                  </div>
                </div>
              </div>

              <a
                href={`tel:${order.assignedDriver.phone}`}
                className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call Driver ({order.assignedDriver.phone})</span>
              </a>
            </div>
          )}

          {/* Order Items Table */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Order Items</h3>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
              {order.items.map((item, idx) => (
                <div key={idx} className="p-3.5 flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-3">
                    <ProductImage src={item.image} alt={item.productName} width={48} height={48} className="w-12 h-12 object-cover rounded-xl" />
                    <div>
                      <div className="font-bold text-slate-900">{item.productName}</div>
                      <div className="text-slate-500">
                        {formatVariantLabel(item.weightKg, item.unit ?? 'kg')} × {item.quantity}
                      </div>
                    </div>
                  </div>
                  <div className="font-black text-slate-900">₹{item.totalPrice.toLocaleString('en-IN')}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
