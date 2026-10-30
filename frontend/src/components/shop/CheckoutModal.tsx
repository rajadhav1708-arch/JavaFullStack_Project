import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ShippingAddress, Order } from '../../types';
import { summariseCartUnits } from '../../utils/variants';
import { STORE } from '../../data/store';
import {
  MapPin,
  Truck,
  CreditCard,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  MessageCircle,
} from 'lucide-react';

const GST_RATE = 0.05;
const BULK_DISCOUNT_THRESHOLD = 5000;
const BULK_DISCOUNT_RATE = 0.05;
const EXPRESS_CHARGE = 250;

const emptyAddress = (fullName: string, village: string): ShippingAddress => ({
  fullName,
  phone: '',
  villageTown: village,
  talukaDistrict: '',
  state: 'Maharashtra',
  pincode: '',
  landmark: '',
});

export const CheckoutModal: React.FC = () => {
  const { cart, cartTotal, placeOrder, setCurrentView, setActiveOrderForTracking } = useApp();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [address, setAddress] = useState<ShippingAddress>(() =>
    emptyAddress(user?.name ?? '', user?.village ?? '')
  );
  const [deliveryType, setDeliveryType] = useState<Order['deliveryType']>('Standard Farm Delivery');
  const [paymentMethod, setPaymentMethod] = useState<Order['paymentMethod']>('Cash on Delivery');
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);

  const cartUnits = summariseCartUnits(cart);

  const totals = useMemo(() => {
    const subtotal = cartTotal;
    const discount =
      subtotal > BULK_DISCOUNT_THRESHOLD
        ? Math.round(subtotal * BULK_DISCOUNT_RATE * 100) / 100
        : 0;
    const deliveryCharge = deliveryType === 'Express Tractor Express' ? EXPRESS_CHARGE : 0;
    const taxBase = Math.max(0, subtotal - discount);
    const tax = Math.round(taxBase * GST_RATE * 100) / 100;
    const total = Math.round((taxBase + deliveryCharge + tax) * 100) / 100;
    return { subtotal, discount, deliveryCharge, tax, total };
  }, [cartTotal, deliveryType]);

  const addressError = useMemo(() => {
    if (!address.fullName.trim()) return t('checkout.errorName');
    if (address.phone.replace(/\D/g, '').length < 10) return t('checkout.errorPhone');
    if (!address.villageTown.trim()) return t('checkout.errorVillage');
    if (!address.talukaDistrict.trim()) return t('checkout.errorTaluka');
    if (!/^\d{5,6}$/.test(address.pincode.trim())) return t('checkout.errorPincode');
    return null;
  }, [address, t]);

  const shareBillOnWhatsApp = (order: Order) => {
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

  const handleCompleteOrder = async () => {
    if (isPlacing) return;
    setIsPlacing(true);
    setPlaceError(null);
    try {
      const order = await placeOrder(address, paymentMethod, deliveryType);
      setCreatedOrder(order);
      setStep(4);
    } catch (error) {
      setPlaceError(error instanceof Error ? error.message : t('checkout.orderError'));
    } finally {
      setIsPlacing(false);
    }
  };

  const handleTrackOrder = () => {
    if (createdOrder) {
      setActiveOrderForTracking(createdOrder);
      setCurrentView('order-tracking');
    }
  };

  const steps = [t('checkout.stepAddress'), t('checkout.stepDelivery'), t('checkout.stepPayment'), t('checkout.stepConfirmed')];

  return (
    <div className="min-h-screen bg-cream py-10">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="card mb-6 p-4 sm:p-5">
          <div className="mx-auto flex max-w-xl items-center gap-2">
            {steps.map((label, index) => {
              const number = index + 1;
              const active = step >= number;
              return (
                <React.Fragment key={label}>
                  <div className={`flex items-center gap-1.5 ${active ? 'text-pine' : 'text-ink-soft'}`}>
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                        active ? 'bg-pine text-cream' : 'bg-cream text-ink-soft'
                      }`}
                    >
                      {number}
                    </span>
                    <span className="hidden text-[11px] font-bold sm:inline">{label}</span>
                  </div>
                  {number < steps.length && <div className="h-px flex-1 bg-line" />}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {step === 1 && (
          <section className="card space-y-6 p-6 sm:p-8">
            <div className="flex items-start gap-3 border-b border-line pb-4">
              <MapPin className="mt-0.5 h-5 w-5 text-pine" />
              <div>
                <h1 className="text-xl text-ink">{t('checkout.addressTitle')}</h1>
                <p className="text-xs text-ink-soft">{t('checkout.addressHelp')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t('checkout.fieldName')} value={address.fullName} onChange={(v) => setAddress({ ...address, fullName: v })} autoComplete="name" />
              <Field label={t('checkout.fieldPhone')} value={address.phone} onChange={(v) => setAddress({ ...address, phone: v })} autoComplete="tel" inputMode="tel" placeholder={t('checkout.placeholderPhone')} />
              <Field className="sm:col-span-2" label={t('checkout.fieldVillage')} value={address.villageTown} onChange={(v) => setAddress({ ...address, villageTown: v })} autoComplete="address-line1" />
              <Field label={t('checkout.fieldTaluka')} value={address.talukaDistrict} onChange={(v) => setAddress({ ...address, talukaDistrict: v })} autoComplete="address-line2" />
              <Field label={t('checkout.fieldState')} value={address.state} onChange={(v) => setAddress({ ...address, state: v })} autoComplete="address-level1" />
              <Field label={t('checkout.fieldPincode')} value={address.pincode} onChange={(v) => setAddress({ ...address, pincode: v })} autoComplete="postal-code" inputMode="numeric" />
              <Field label={t('checkout.fieldLandmark')} value={address.landmark ?? ''} onChange={(v) => setAddress({ ...address, landmark: v })} placeholder={t('checkout.placeholderLandmark')} />
            </div>

            <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-clay">{addressError ?? ' '}</p>
              <button
                onClick={() => setStep(2)}
                disabled={Boolean(addressError)}
                className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('checkout.continueDelivery')}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="card space-y-6 p-6 sm:p-8">
            <div className="flex items-start gap-3 border-b border-line pb-4">
              <Truck className="mt-0.5 h-5 w-5 text-pine" />
              <div>
                <h1 className="text-xl text-ink">{t('checkout.deliveryTitle')}</h1>
                <p className="text-xs text-ink-soft">
                  {cartUnits.join(' · ')}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Choice
                selected={deliveryType === 'Standard Farm Delivery'}
                onSelect={() => setDeliveryType('Standard Farm Delivery')}
                title={t('checkout.deliveryStandard')}
                body={t('checkout.deliveryStandardBody')}
                price={t('checkout.deliveryFree')}
                icon="🚜"
              />
              <Choice
                selected={deliveryType === 'Express Tractor Express'}
                onSelect={() => setDeliveryType('Express Tractor Express')}
                title={t('checkout.deliveryExpress')}
                body={t('checkout.deliveryExpressBody')}
                price={t('checkout.deliveryExpressFee')}
                icon="⚡"
                tone="ochre"
              />
              <Choice
                selected={deliveryType === 'Store Pickup'}
                onSelect={() => setDeliveryType('Store Pickup')}
                title={t('checkout.deliveryPickup')}
                body={t('checkout.deliveryPickupBody')}
                price={t('checkout.deliveryFree')}
                icon="🏪"
                tone="muted"
              />
            </div>

            <div className="flex items-center justify-between border-t border-line pt-4">
              <button onClick={() => setStep(1)} className="btn btn-outline !px-3 !py-2 text-xs">
                <ArrowLeft className="h-4 w-4" />
                {t('checkout.back')}
              </button>
              <button onClick={() => setStep(3)} className="btn btn-primary">
                {t('checkout.continuePayment')}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="card space-y-6 p-6 sm:p-8">
            <div className="flex items-start gap-3 border-b border-line pb-4">
              <CreditCard className="mt-0.5 h-5 w-5 text-pine" />
              <div>
                <h1 className="text-xl text-ink">{t('checkout.paymentTitle')}</h1>
                <p className="text-xs text-ink-soft">{t('checkout.paymentNote')}</p>
              </div>
            </div>

            <div className="space-y-3">
              <Choice
                selected={paymentMethod === 'Cash on Delivery'}
                onSelect={() => setPaymentMethod('Cash on Delivery')}
                title={t('checkout.paymentCash')}
                body={t('checkout.paymentCashBody')}
                price={t('checkout.paymentNoCharge')}
                icon="💵"
              />
              <Choice
                selected={paymentMethod === 'Khata Credit'}
                onSelect={() => setPaymentMethod('Khata Credit')}
                title={t('checkout.paymentKhata')}
                body={t('checkout.paymentKhataBody')}
                price={t('checkout.paymentApproval')}
                icon="📖"
                tone="ochre"
              />
            </div>

            <div className="space-y-2 rounded-2xl border border-line bg-cream/70 p-4 text-xs">
              <Row label={t('checkout.itemsSubtotal', { n: cart.length })} value={`₹${totals.subtotal.toLocaleString('en-IN')}`} />
              {totals.discount > 0 && <Row label={t('checkout.bulkDiscount')} value={`− ₹${totals.discount.toLocaleString('en-IN')}`} />}
              <Row label={t('checkout.gstLabel')} value={`₹${totals.tax.toLocaleString('en-IN')}`} />
              <Row label={t('checkout.deliveryLabel')} value={totals.deliveryCharge === 0 ? t('checkout.deliveryFree') : `₹${totals.deliveryCharge}`} />
              <div className="flex items-center justify-between border-t border-line pt-2 text-sm font-bold text-ink">
                <span>{t('checkout.totalPayable')}</span>
                <span className="font-display text-lg">₹{totals.total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
              <button onClick={() => setStep(2)} className="btn btn-outline !px-3 !py-2 text-xs">
                <ArrowLeft className="h-4 w-4" />
                {t('checkout.back')}
              </button>

              <div className="flex flex-col items-stretch gap-2 sm:items-end">
                {placeError && <p className="text-xs font-semibold text-clay">{placeError}</p>}
                <button onClick={handleCompleteOrder} disabled={isPlacing} className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60">
                  {isPlacing ? t('checkout.placingOrder') : t('checkout.placeOrder')}
                  <ShieldCheck className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>
        )}

        {step === 4 && createdOrder && (
          <section className="card mx-auto max-w-2xl space-y-6 p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-pine-soft text-pine">
              <CheckCircle2 className="h-9 w-9" />
            </div>

            <div>
              <span className="rounded-full bg-pine-soft px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-pine">
                {t('checkout.confirmedBadge')}
              </span>
              <h1 className="mt-3 text-2xl text-ink">{t('checkout.orderNumber', { n: createdOrder.orderNumber })}</h1>
              <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-ink-soft">
                {t('checkout.thankYou', { name: createdOrder.customerName })}
              </p>
            </div>

            <div className="space-y-2 rounded-2xl border border-line bg-cream/70 p-4 text-left text-xs">
              <Row label={t('checkout.deliverTo')} value={createdOrder.shippingAddress.villageTown} />
              <Row label={t('checkout.payment')} value={`${createdOrder.paymentMethod} (${createdOrder.paymentStatus})`} />
              <Row label={t('checkout.total')} value={`₹${createdOrder.totalAmount.toLocaleString('en-IN')}`} />
              <Row label={t('checkout.expectedDelivery')} value={createdOrder.estimatedDeliveryDate} />
            </div>

            <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
              <button onClick={handleTrackOrder} className="btn btn-primary w-full sm:w-auto">
                <Truck className="h-4 w-4" />
                {t('checkout.trackOrder')}
              </button>
              <button onClick={() => shareBillOnWhatsApp(createdOrder)} className="btn btn-outline w-full sm:w-auto">
                <MessageCircle className="h-4 w-4" />
                {t('checkout.sendWhatsapp')}
              </button>
              <button onClick={() => setCurrentView('home')} className="btn btn-outline w-full sm:w-auto">
                {t('checkout.backHome')}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

const Field: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
}> = ({ label, value, onChange, className = '', placeholder, autoComplete, inputMode }) => (
  <label className={`block ${className}`}>
    <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink-soft">{label}</span>
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      inputMode={inputMode}
      className="field"
    />
  </label>
);

const Choice: React.FC<{
  selected: boolean;
  onSelect: () => void;
  title: string;
  body: string;
  price: string;
  icon: string;
  tone?: 'pine' | 'ochre' | 'muted';
}> = ({ selected, onSelect, title, body, price, icon, tone = 'pine' }) => (
  <button
    type="button"
    onClick={onSelect}
    className={`flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition-colors ${
      selected ? 'border-pine bg-pine-soft/60 ring-2 ring-pine/15' : 'border-line bg-cream/40 hover:border-pine/40'
    }`}
  >
    <span className="flex items-center gap-3">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${
          tone === 'ochre' ? 'bg-ochre-soft' : tone === 'muted' ? 'bg-cream' : 'bg-pine-soft'
        }`}
      >
        {icon}
      </span>
      <span>
        <span className="block text-sm font-bold text-ink">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">{body}</span>
      </span>
    </span>
    <span className="shrink-0 text-xs font-bold text-ink">{price}</span>
  </button>
);

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 text-ink-soft">
    <span>{label}</span>
    <span className="text-right font-semibold text-ink">{value}</span>
  </div>
);
