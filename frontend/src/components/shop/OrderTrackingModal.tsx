import React from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { ProductImage } from '../common/ProductImage';
import { formatVariantLabel } from '../../utils/variants';
import { STORE } from '../../data/store';
import { printBill } from '../../utils/printBill';
import { Truck, CheckCircle2, Phone, Printer, ArrowLeft, MessageCircle } from 'lucide-react';

export const OrderTrackingModal: React.FC = () => {
  const { activeOrderForTracking, setCurrentView } = useApp();
  const { t } = useLanguage();

  if (!activeOrderForTracking) {
    return (
      <div className="min-h-screen bg-cream py-16 text-center">
        <h1 className="text-xl text-ink">{t('tracking.emptyTitle')}</h1>
        <p className="mt-1 text-xs text-ink-soft">{t('tracking.emptyBody')}</p>
        <button onClick={() => setCurrentView('customer-dashboard')} className="btn btn-primary mt-4">
          {t('tracking.emptyCta')}
        </button>
      </div>
    );
  }

  const order = activeOrderForTracking;

  const steps = [
    { label: t('tracking.stepPlaced'), desc: '' },
    { label: t('tracking.stepConfirmed'), desc: '' },
    { label: t('tracking.stepPacked'), desc: '' },
    { label: t('tracking.stepShipped'), desc: '' },
    { label: t('tracking.stepOut'), desc: '' },
    { label: t('tracking.stepDelivered'), desc: '' },
  ];

  const shareBill = () => {
    if (order.paymentStatus !== 'Paid') {
      window.alert(t('tracking.billAlert'));
      return;
    }
    const lines = order.items
      .map((item) => `• ${item.productName} (${item.weightKg}kg x${item.quantity}) — ₹${item.totalPrice.toLocaleString('en-IN')}`)
      .join('\n');
    const text =
      `${STORE.name} bill — Order #${order.orderNumber}\n` +
      `${lines}\n` +
      `Subtotal: ₹${order.subtotal.toLocaleString('en-IN')} | Discount: ₹${order.discount} | GST: ₹${order.tax} | Delivery: ₹${order.deliveryCharge}\n` +
      `Total: ₹${order.totalAmount.toLocaleString('en-IN')}\n` +
      `Payment: ${order.paymentMethod} (${order.paymentStatus})`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-cream py-10">
      <div className="mx-auto max-w-4xl space-y-6 px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => setCurrentView('customer-dashboard')}
          className="flex items-center gap-1 text-xs font-bold text-ink-soft hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('tracking.backLink')}
        </button>

        <section className="card print-area space-y-6 p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-4 border-b border-line pb-6 sm:flex-row sm:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-pine-soft px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-pine">
                  {order.status}
                </span>
                <span className="text-[11px] text-ink-soft">#{order.orderNumber}</span>
              </div>
              <h1 className="mt-1 text-2xl text-ink">{t('tracking.title')}</h1>
              <p className="mt-0.5 text-xs text-ink-soft">
                {t('tracking.expectedDelivery', { date: order.estimatedDeliveryDate })}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button onClick={shareBill} className="btn btn-outline !px-3 !py-2 text-xs">
                <MessageCircle className="h-3.5 w-3.5" />
                {t('tracking.sendBill')}
              </button>
              <button onClick={() => printBill()} className="btn btn-outline !px-3 !py-2 text-xs">
                <Printer className="h-3.5 w-3.5" />
                {t('tracking.printInvoice')}
              </button>
            </div>
          </div>

          <div>
            <h2 className="mb-5 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft">
              {t('tracking.progressTitle')}
            </h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
              {steps.map((step, index) => {
                const stepNumber = index + 1;
                const done = stepNumber <= order.trackingStepIndex;
                return (
                  <div key={step.label} className="flex flex-col items-center text-center">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${
                        done ? 'bg-pine text-cream' : 'border border-line bg-cream text-ink-soft'
                      }`}
                    >
                      {done ? <CheckCircle2 className="h-5 w-5" /> : stepNumber}
                    </span>
                    <p className={`mt-2 text-[11px] font-bold ${done ? 'text-ink' : 'text-ink-soft'}`}>
                      {step.label}
                    </p>
                    <p className="mt-0.5 text-[10px] leading-snug text-ink-soft">{step.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {order.assignedDriver && (
            <div className="flex flex-col justify-between gap-4 rounded-2xl border border-pine/20 bg-pine-soft p-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pine text-cream">
                  <Truck className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-bold text-ink">{t('tracking.deliveryContact')}</p>
                  <p className="text-xs text-ink-soft">
                    {order.assignedDriver.name} · {order.assignedDriver.vehicleNo}
                  </p>
                </div>
              </div>

              <a href={`tel:${order.assignedDriver.phone}`} className="btn btn-primary !px-4 !py-2 text-xs">
                <Phone className="h-3.5 w-3.5" />
                {t('tracking.callPhone', { phone: order.assignedDriver.phone })}
              </a>
            </div>
          )}

          <div>
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft">
              {t('tracking.itemsTitle')}
            </h2>
            <div className="overflow-hidden rounded-2xl border border-line">
              {order.items.map((item, index) => (
                <div
                  key={`${item.productId}-${item.weightKg}-${index}`}
                  className="flex items-center justify-between gap-4 border-b border-line p-3.5 text-xs last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <ProductImage
                      src={item.image}
                      alt={item.productName}
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-xl object-cover"
                    />
                    <div>
                      <p className="font-bold text-ink">{item.productName}</p>
                      <p className="text-ink-soft">
                        {formatVariantLabel(item.weightKg, item.unit ?? 'kg')} × {item.quantity}
                      </p>
                    </div>
                  </div>
                  <p className="font-bold text-ink">₹{item.totalPrice.toLocaleString('en-IN')}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 border-t border-line pt-4 text-xs text-ink-soft">
            <div className="flex justify-between">
              <span>{t('tracking.subtotal')}</span>
              <span className="font-semibold text-ink">₹{order.subtotal.toLocaleString('en-IN')}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between">
                <span>{t('tracking.bulkDiscount')}</span>
                <span className="font-semibold text-pine">− ₹{order.discount.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>{t('tracking.gst')}</span>
              <span className="font-semibold text-ink">₹{order.tax.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span>{t('tracking.delivery')}</span>
              <span className="font-semibold text-ink">
                {order.deliveryCharge === 0 ? t('tracking.free') : `₹${order.deliveryCharge}`}
              </span>
            </div>
            <div className="flex justify-between border-t border-line pt-2 text-sm font-bold text-ink">
              <span>{t('tracking.totalLabel', { method: order.paymentMethod, status: order.paymentStatus })}</span>
              <span className="font-display text-lg">₹{order.totalAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
