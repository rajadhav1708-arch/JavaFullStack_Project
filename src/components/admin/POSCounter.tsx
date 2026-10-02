import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, CartItem } from '../../types';
import {
  Store,
  Search,
  Plus,
  Minus,
  Trash2,
  Printer,
  CreditCard,
  User,
  ShieldCheck,
  CheckCircle2,
  X,
  Scan,
} from 'lucide-react';

export const POSCounter: React.FC = () => {
  const { products, khataRecords, addToast } = useApp();

  const [search, setSearch] = useState('');
  const [posCart, setPosCart] = useState<
    { product: Product; weightKg: number; price: number; quantity: number }[]
  >([]);
  const [customerType, setCustomerType] = useState<'Walk-in' | 'Khata Farmer'>('Walk-in');
  const [selectedKhataCustomer, setSelectedKhataCustomer] = useState(khataRecords[0]?.customerName || '');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Khata Credit'>('Cash');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const addToPosCart = (product: Product) => {
    setPosCart((prev) => {
      const idx = prev.findIndex((i) => i.product.id === product.id);
      if (idx > -1) {
        const updated = [...prev];
        updated[idx].quantity += 1;
        return updated;
      }
      return [...prev, { product, weightKg: 50, price: product.price, quantity: 1 }];
    });
  };

  const updatePosQty = (productId: string, delta: number) => {
    setPosCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as any
    );
  };

  const cartSubtotal = posCart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const finalTotal = Math.max(0, cartSubtotal - discountAmount);

  const handleCompleteSale = () => {
    if (posCart.length === 0) {
      addToast('POS Cart is empty!', 'warning');
      return;
    }
    setIsReceiptModalOpen(true);
  };

  const handlePrintAndClose = () => {
    window.print();
    setIsReceiptModalOpen(false);
    setPosCart([]);
    setDiscountAmount(0);
    addToast('POS Invoice Printed & Order Logged!', 'success');
  };

  const filteredProducts = products.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* POS Bar Header */}
      <div className="bg-slate-900 text-white p-5 rounded-3xl flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 font-black flex items-center justify-center text-lg">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Express Counter POS Billing</h1>
            <p className="text-xs text-slate-400">PashuFeed Central Counter Terminal #1</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-emerald-900 text-emerald-200 text-xs font-bold px-3 py-1.5 rounded-xl border border-emerald-700">
            Counter Status: ONLINE
          </div>
        </div>
      </div>

      {/* Main Split Layout: Left Catalog + Right Cart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT CATALOG (7 Cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Scan Barcode or Search Feed Name / SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-100 border border-slate-200 text-slate-900 font-semibold text-xs rounded-2xl pl-10 pr-10 py-3 outline-none focus:border-emerald-700"
            />
            <Scan className="w-4 h-4 text-emerald-700 absolute left-3.5 top-3.5" />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto p-1">
            {filteredProducts.map((p) => (
              <div
                key={p.id}
                onClick={() => addToPosCart(p)}
                className="p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-600 rounded-2xl cursor-pointer transition-all flex flex-col justify-between space-y-2 group"
              >
                <div>
                  <span className="text-[9px] font-bold text-emerald-800 uppercase bg-emerald-100 px-1.5 py-0.5 rounded">
                    {p.brand}
                  </span>
                  <div className="font-bold text-slate-900 text-xs mt-1 group-hover:text-emerald-800 line-clamp-2">
                    {p.name}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                  <span className="font-black text-slate-900">₹{p.price}</span>
                  <span className="text-[10px] text-slate-400">{p.stockCount} in stock</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT BILLING CART (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="font-bold text-slate-900 text-sm">Active Counter Bill</span>
              <span className="text-xs text-slate-500">{posCart.length} Feed Line Items</span>
            </div>

            {/* Customer Type Picker */}
            <div className="space-y-2 text-xs">
              <label className="font-bold text-slate-700 block">Select Customer Account:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setCustomerType('Walk-in')}
                  className={`p-2 rounded-xl font-bold border transition-all cursor-pointer ${
                    customerType === 'Walk-in'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  Walk-in Farmer
                </button>
                <button
                  onClick={() => setCustomerType('Khata Farmer')}
                  className={`p-2 rounded-xl font-bold border transition-all cursor-pointer ${
                    customerType === 'Khata Farmer'
                      ? 'bg-emerald-800 text-white border-emerald-800'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  Khata Account
                </button>
              </div>

              {customerType === 'Khata Farmer' && (
                <select
                  value={selectedKhataCustomer}
                  onChange={(e) => setSelectedKhataCustomer(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 font-bold text-slate-800 text-xs rounded-xl p-2.5 outline-none"
                >
                  {khataRecords.map((k) => (
                    <option key={k.id} value={k.customerName}>
                      {k.customerName} ({k.village})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Cart Items List */}
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {posCart.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  Click on any feed on the left catalog to add to bill.
                </div>
              ) : (
                posCart.map((item) => (
                  <div
                    key={item.product.id}
                    className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{item.product.name}</div>
                      <div className="text-[10px] text-slate-500">₹{item.price} x {item.quantity}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden">
                        <button
                          onClick={() => updatePosQty(item.product.id, -1)}
                          className="px-2 py-0.5 text-slate-700 hover:bg-slate-100 font-bold"
                        >
                          -
                        </button>
                        <span className="px-2 font-bold text-slate-900">{item.quantity}</span>
                        <button
                          onClick={() => updatePosQty(item.product.id, 1)}
                          className="px-2 py-0.5 text-slate-700 hover:bg-slate-100 font-bold"
                        >
                          +
                        </button>
                      </div>
                      <span className="font-black text-slate-900 w-14 text-right">
                        ₹{item.price * item.quantity}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Payment Mode & Bill Total */}
          <div className="pt-3 border-t border-slate-200 space-y-3">
            <div className="grid grid-cols-3 gap-2 text-xs">
              {(['Cash', 'UPI', 'Khata Credit'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setPaymentMode(mode)}
                  className={`p-2 rounded-xl font-bold border transition-all cursor-pointer ${
                    paymentMode === mode
                      ? 'bg-emerald-800 text-white border-emerald-800'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-bold text-slate-900">₹{cartSubtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Spot Discount (₹):</span>
                <input
                  type="number"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(Number(e.target.value))}
                  className="w-20 bg-slate-50 border border-slate-200 text-right font-bold text-xs rounded-lg p-1"
                />
              </div>
              <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-100">
                <span>Net Payable Amount:</span>
                <span className="text-emerald-800">₹{finalTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button
              onClick={handleCompleteSale}
              className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Complete Sale & Print Thermal Bill</span>
            </button>
          </div>
        </div>
      </div>

      {/* RECEIPT PRINT MODAL */}
      {isReceiptModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative font-mono text-xs">
            <button
              onClick={() => setIsReceiptModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 font-sans"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
              <div className="font-black text-base tracking-widest uppercase text-slate-900">PASHUFEED PRO</div>
              <div>Cattle Feed Central Store, MIDC Kagal</div>
              <div>GSTIN: 27AABCP1234F1Z0 | Ph: 1800-425-3333</div>
              <div className="text-[10px] text-slate-400 mt-1">Invoice #{`POS-${Math.floor(1000 + Math.random() * 9000)}`}</div>
            </div>

            <div className="space-y-1">
              <div>Customer: {customerType === 'Walk-in' ? 'Walk-in Farmer' : selectedKhataCustomer}</div>
              <div>Payment Mode: {paymentMode}</div>
            </div>

            <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-1">
              {posCart.map((item, idx) => (
                <div key={idx} className="flex justify-between">
                  <span className="truncate max-w-[180px]">{item.product.name}</span>
                  <span>{item.quantity} x ₹{item.price} = ₹{item.price * item.quantity}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1 text-right font-bold text-sm">
              <div>Subtotal: ₹{cartSubtotal}</div>
              {discountAmount > 0 && <div>Discount: -₹{discountAmount}</div>}
              <div className="text-emerald-800">TOTAL: ₹{finalTotal}</div>
            </div>

            <div className="text-center text-[10px] text-slate-400 pt-2 border-t border-dashed border-slate-300">
              Thank you for trusting PashuFeed Pro Feeds!
            </div>

            <button
              onClick={handlePrintAndClose}
              className="w-full bg-emerald-800 text-white font-bold font-sans py-3 rounded-2xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Invoice</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
