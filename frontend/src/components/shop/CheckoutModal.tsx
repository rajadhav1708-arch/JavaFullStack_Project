import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ShippingAddress, Order } from '../../types';
import {
  MapPin,
  Truck,
  CreditCard,
  CheckCircle2,
  ShieldCheck,
  Phone,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';

export const CheckoutModal: React.FC = () => {
  const { cart, cartTotal, placeOrder, setCurrentView, setActiveOrderForTracking } = useApp();

  /** Opens WhatsApp with the order bill pre-filled, ready to send to the
   *  farmer's phone. No API needed: wa.me does the compose. */
  const shareBillOnWhatsApp = (order: Order) => {
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
  };

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [address, setAddress] = useState<ShippingAddress>({
    fullName: 'Suresh Kumar Patil',
    phone: '+91 98223 44512',
    villageTown: 'Kagal Village, Sugar Factory Area',
    talukaDistrict: 'Kagal, Kolhapur',
    state: 'Maharashtra',
    pincode: '416216',
    landmark: 'Opposite Primary Milk Collection Center',
  });

  const [deliveryType, setDeliveryType] = useState<Order['deliveryType']>('Standard Farm Delivery');
  const [paymentMethod, setPaymentMethod] = useState<Order['paymentMethod']>('Khata Credit');
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);

  const totalWeightKg = cart.reduce((acc, item) => acc + item.weightKg * item.quantity, 0);
  const deliveryFee = deliveryType === 'Express Tractor Express' ? 250 : 0;
  const finalAmount = cartTotal + deliveryFee;

  const handleCompleteOrder = async () => {
    if (isPlacing) return;
    setIsPlacing(true);
    setPlaceError(null);
    try {
      const order = await placeOrder(address, paymentMethod, deliveryType);
      setCreatedOrder(order);
      setStep(4);
    } catch (error) {
      setPlaceError(error instanceof Error ? error.message : 'Could not place the order. Please try again.');
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

  return (
    <div className="bg-slate-50 min-h-screen py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Progress Header Steps */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs mb-8">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 max-w-xl mx-auto">
            <div className={`flex items-center gap-1.5 ${step >= 1 ? 'text-emerald-800' : ''}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-emerald-800 text-white' : 'bg-slate-200'}`}>
                1
              </div>
              <span className="hidden sm:inline">Farm Address</span>
            </div>
            <div className="h-0.5 bg-slate-200 flex-1 mx-2" />
            <div className={`flex items-center gap-1.5 ${step >= 2 ? 'text-emerald-800' : ''}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-emerald-800 text-white' : 'bg-slate-200'}`}>
                2
              </div>
              <span className="hidden sm:inline">Delivery Speed</span>
            </div>
            <div className="h-0.5 bg-slate-200 flex-1 mx-2" />
            <div className={`flex items-center gap-1.5 ${step >= 3 ? 'text-emerald-800' : ''}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-emerald-800 text-white' : 'bg-slate-200'}`}>
                3
              </div>
              <span className="hidden sm:inline">Payment Method</span>
            </div>
            <div className="h-0.5 bg-slate-200 flex-1 mx-2" />
            <div className={`flex items-center gap-1.5 ${step === 4 ? 'text-emerald-800' : ''}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center ${step === 4 ? 'bg-emerald-800 text-white' : 'bg-slate-200'}`}>
                4
              </div>
              <span className="hidden sm:inline">Confirmed</span>
            </div>
          </div>
        </div>

        {/* STEP 1: ADDRESS */}
        {step === 1 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <MapPin className="w-6 h-6 text-emerald-700" />
              <div>
                <h2 className="text-xl font-bold text-slate-900">Step 1: Farm Delivery Address</h2>
                <p className="text-xs text-slate-500">Provide exact village & landmark for direct tractor delivery.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Farmer / Customer Name</label>
                <input
                  type="text"
                  value={address.fullName}
                  onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-emerald-600 font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Mobile Phone Number</label>
                <input
                  type="text"
                  value={address.phone}
                  onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-emerald-600 font-semibold text-slate-900"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700 block mb-1">Village / Town & House/Barn Address</label>
                <input
                  type="text"
                  value={address.villageTown}
                  onChange={(e) => setAddress({ ...address, villageTown: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-emerald-600 font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Taluka & District</label>
                <input
                  type="text"
                  value={address.talukaDistrict}
                  onChange={(e) => setAddress({ ...address, talukaDistrict: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-emerald-600 font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Pincode</label>
                <input
                  type="text"
                  value={address.pincode}
                  onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-emerald-600 font-semibold text-slate-900"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700 block mb-1">Landmark (e.g. Milk Collection Center / Sugar Mill)</label>
                <input
                  type="text"
                  value={address.landmark}
                  onChange={(e) => setAddress({ ...address, landmark: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-emerald-600 font-semibold text-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                onClick={() => setStep(2)}
                className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs px-6 py-3.5 rounded-2xl flex items-center gap-2 cursor-pointer"
              >
                <span>Continue to Delivery Speed</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: DELIVERY TYPE */}
        {step === 2 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <Truck className="w-6 h-6 text-emerald-700" />
              <div>
                <h2 className="text-xl font-bold text-slate-900">Step 2: Delivery Option</h2>
                <p className="text-xs text-slate-500">Choose how your feed bags ({totalWeightKg} kg) will be delivered.</p>
              </div>
            </div>

            <div className="space-y-3">
              <label
                onClick={() => setDeliveryType('Standard Farm Delivery')}
                className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                  deliveryType === 'Standard Farm Delivery'
                    ? 'border-emerald-700 bg-emerald-50/60 ring-2 ring-emerald-600/20'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold">
                    🚜
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">Standard Village Farm Delivery</div>
                    <div className="text-xs text-slate-500">Delivered by local village vehicle within 24-36 hours</div>
                  </div>
                </div>
                <span className="font-bold text-emerald-800 text-xs">FREE</span>
              </label>

              <label
                onClick={() => setDeliveryType('Express Tractor Express')}
                className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                  deliveryType === 'Express Tractor Express'
                    ? 'border-emerald-700 bg-emerald-50/60 ring-2 ring-emerald-600/20'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-900 font-bold">
                    ⚡
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">Express Tractor-Trolley Delivery</div>
                    <div className="text-xs text-slate-500">Same-day urgent priority dispatch for bulk feed bags</div>
                  </div>
                </div>
                <span className="font-bold text-slate-900 text-xs">₹250</span>
              </label>

              <label
                onClick={() => setDeliveryType('Store Pickup')}
                className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                  deliveryType === 'Store Pickup'
                    ? 'border-emerald-700 bg-emerald-50/60 ring-2 ring-emerald-600/20'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center text-slate-800 font-bold">
                    🏪
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">Shop Counter Pickup</div>
                    <div className="text-xs text-slate-500">Pick up feed directly from PashuFeed Central Shop</div>
                  </div>
                </div>
                <span className="font-bold text-emerald-800 text-xs">FREE</span>
              </label>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setStep(1)}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Address</span>
              </button>

              <button
                onClick={() => setStep(3)}
                className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs px-6 py-3.5 rounded-2xl flex items-center gap-2 cursor-pointer"
              >
                <span>Continue to Payment</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: PAYMENT METHOD */}
        {step === 3 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <CreditCard className="w-6 h-6 text-emerald-700" />
              <div>
                <h2 className="text-xl font-bold text-slate-900">Step 3: Payment Method</h2>
                <p className="text-xs text-slate-500">Select how you wish to pay for your feed order (₹{finalAmount.toLocaleString('en-IN')}).</p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Farmer Credit Khata */}
              <label
                onClick={() => setPaymentMethod('Khata Credit')}
                className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                  paymentMethod === 'Khata Credit'
                    ? 'border-emerald-700 bg-emerald-50/80 ring-2 ring-emerald-600/20'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-900 text-amber-300 flex items-center justify-center font-black">
                    📖
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <span>Farmer Credit Khata Account</span>
                      <span className="bg-emerald-800 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md">
                        Recommended
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      Buy now on credit. Pay balance after monthly dairy milk collection billing.
                    </div>
                  </div>
                </div>
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
              </label>

              {/* UPI */}
              <label
                onClick={() => setPaymentMethod('UPI')}
                className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                  paymentMethod === 'UPI'
                    ? 'border-emerald-700 bg-emerald-50/80 ring-2 ring-emerald-600/20'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-900 flex items-center justify-center font-bold">
                    📲
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">UPI (GPay / PhonePe / Paytm / BHIM)</div>
                    <div className="text-xs text-slate-500">Instant QR code scan & pay</div>
                  </div>
                </div>
              </label>

              {/* Cash on Delivery */}
              <label
                onClick={() => setPaymentMethod('Cash on Delivery')}
                className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                  paymentMethod === 'Cash on Delivery'
                    ? 'border-emerald-700 bg-emerald-50/80 ring-2 ring-emerald-600/20'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-100 text-green-900 flex items-center justify-center font-bold">
                    💵
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">Cash on Delivery</div>
                    <div className="text-xs text-slate-500">Pay cash directly to tractor delivery driver</div>
                  </div>
                </div>
              </label>
            </div>

            {/* Order Summary Recap */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between font-medium text-slate-600">
                <span>Items Subtotal ({cart.length} Feeds)</span>
                <span>₹{cartTotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between font-medium text-slate-600">
                <span>Delivery Freight Charge</span>
                <span>₹{deliveryFee}</span>
              </div>
              <div className="flex items-center justify-between font-black text-slate-900 text-sm pt-2 border-t border-slate-200">
                <span>Total Amount</span>
                <span className="text-emerald-800">₹{finalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setStep(2)}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Delivery</span>
              </button>

              <div className="flex flex-col items-end gap-2">
                {placeError && <p className="text-xs font-semibold text-red-600">{placeError}</p>}
                <button
                  onClick={handleCompleteOrder}
                  disabled={isPlacing}
                  className="bg-emerald-800 hover:bg-emerald-900 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm px-8 py-3.5 rounded-2xl flex items-center gap-2 shadow-lg cursor-pointer active:scale-95"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>{isPlacing ? 'Placing Order…' : 'Confirm & Place Order'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: ORDER CONFIRMED */}
        {step === 4 && createdOrder && (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-6 max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full uppercase">
                Order Successful
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-2">
                Order #{createdOrder.orderNumber} Placed!
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Thank you, {createdOrder.customerName}. Your feed order has been logged and dispatched to local village freight.
              </p>
            </div>

            {/* Receipt Summary Box */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Delivery Address:</span>
                <span className="font-bold text-slate-900">{createdOrder.shippingAddress.villageTown}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Payment Mode:</span>
                <span className="font-bold text-emerald-800">{createdOrder.paymentMethod}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Amount:</span>
                <span className="font-bold text-slate-900">₹{createdOrder.totalAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Est. Barn Arrival:</span>
                <span className="font-bold text-amber-800">{createdOrder.estimatedDeliveryDate}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <button
                onClick={handleTrackOrder}
                className="w-full sm:w-auto bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 cursor-pointer"
              >
                <Truck className="w-4 h-4" />
                <span>Track Live Order Status</span>
              </button>

              <button
                onClick={() => shareBillOnWhatsApp(createdOrder)}
                className="w-full sm:w-auto bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold text-xs px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Send Bill on WhatsApp</span>
              </button>

              <button
                onClick={() => setCurrentView('home')}
                className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-6 py-3.5 rounded-2xl cursor-pointer"
              >
                Back to Home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
