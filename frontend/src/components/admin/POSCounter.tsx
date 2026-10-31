import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { STORE } from '../../data/store';
import { Product, CartItem, Order } from '../../types';
import { printBill } from '../../utils/printBill';
import { Store, Search, Printer, X } from 'lucide-react';

/**
 * Counter billing that writes real orders. Every completed sale goes through
 * the same POST /api/orders endpoint as the online shop, so stock is decremented
 * and the ledger stays consistent. There is no offline/local fallback: if the
 * API is down the sale fails honestly.
 */
export const POSCounter: React.FC = () => {
  const { products, setProducts, khataRecords, placeOrder, addToast } = useApp();
  const { user, csrfToken } = useAuth();

  const [search, setSearch] = useState('');
  const [posCart, setPosCart] = useState<{ product: Product; weightKg: number; price: number; quantity: number }[]>([]);
  const [customerType, setCustomerType] = useState<'Walk-in' | 'Khata Farmer'>('Walk-in');
  // Only Approved accounts may take credit — the server enforces this too,
  // but filtering here stops the cashier picking a pending or suspended one.
  const approvedKhata = khataRecords.filter((record) => record.status === 'Approved');
  const [selectedKhataId, setSelectedKhataId] = useState<string>(approvedKhata[0]?.id ?? '');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Khata Credit'>('Cash');
  const [isPlacing, setIsPlacing] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);

  const addToPosCart = (product: Product) => {
    setPosCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        { product, weightKg: product.selectedWeightKg, price: product.price, quantity: 1 },
      ];
    });
  };

  const updatePosQty = (productId: string, delta: number) => {
    setPosCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id !== productId) return item;
          const next = item.quantity + delta;
          return next > 0 ? { ...item, quantity: next } : null;
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
    );
  };

  const cartSubtotal = posCart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const selectedKhata = approvedKhata.find((record) => record.id === selectedKhataId);
  // The server's Khata check runs against the signed-in farmer's user id.
  const selectedKhataUserId = selectedKhata?.customerId.startsWith('user-')
    ? Number(selectedKhata.customerId.replace('user-', ''))
    : undefined;

  const refreshStock = async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = (await res.json()) as { products: Product[] };
        setProducts(data.products);
      }
    } catch {
      /* stock refresh is best-effort; the next page load will sync anyway */
    }
  };

  const handleCompleteSale = async () => {
    if (posCart.length === 0 || isPlacing) {
      if (posCart.length === 0) addToast('Add at least one product to the bill.', 'warning');
      return;
    }

    const customCart: CartItem[] = posCart.map((item) => ({
      product: item.product,
      weightKg: item.weightKg,
      price: item.price,
      quantity: item.quantity,
    }));

    const shippingAddress =
      customerType === 'Khata Farmer' && selectedKhata
        ? {
            fullName: selectedKhata.customerName,
            phone: STORE.phone,
            villageTown: selectedKhata.village,
            talukaDistrict: STORE.region,
            state: 'Maharashtra',
            pincode: '',
            landmark: 'Counter sale (pickup at shop)',
          }
        : {
            fullName: 'Counter walk-in customer',
            phone: STORE.phone,
            villageTown: STORE.region,
            talukaDistrict: STORE.region,
            state: 'Maharashtra',
            pincode: '',
            landmark: 'Counter sale (pickup at shop)',
          };

    setIsPlacing(true);
    try {
      // A Khata counter sale must land on the FARMER's ledger, not the cashier's
      // account, so the signed-in customer's id travels with the order. The
      // server only honours it for staff sessions.
      const order = await placeOrder(
        shippingAddress,
        paymentMode === 'Khata Credit' ? 'Khata Credit' : 'Cash on Delivery',
        'Store Pickup',
        customCart,
        paymentMode === 'Khata Credit' && customerType === 'Khata Farmer' ? selectedKhataUserId : undefined
      );

      // Cash and UPI are taken at the counter right now, so mark them paid
      // immediately. Khata credit stays pending until the ledger is settled.
      if (paymentMode !== 'Khata Credit') {
        await fetch(`/api/orders/${order.id.replace('ord-', '')}/payment`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}) },
          body: JSON.stringify({ paymentStatus: 'Paid' }),
        }).catch(() => {
          addToast('Order placed, but marking it paid failed. Confirm it from Dispatch.', 'warning');
        });
      }

      setReceiptOrder(order);
      setPosCart([]);
      void refreshStock();
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : 'Could not complete the counter sale.',
        'error'
      );
    } finally {
      setIsPlacing(false);
    }
  };

  const filteredProducts = products.filter((product) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return (
      product.name.toLowerCase().includes(query) ||
      product.sku.toLowerCase().includes(query) ||
      product.brand.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div className="card flex items-center justify-between p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pine text-cream">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg text-ink">Counter billing</h1>
            <p className="text-xs text-ink-soft">{STORE.name} · counter terminal</p>
          </div>
        </div>
        <span className="rounded-xl border border-pine/20 bg-pine-soft px-3 py-1.5 text-xs font-bold text-pine">
          Connected to live catalogue
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <input
              type="text"
              placeholder="Search product, SKU or brand…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="field !pl-9"
            />
          </div>

          <div className="grid max-h-[500px] grid-cols-2 gap-3 overflow-y-auto p-1 sm:grid-cols-3">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => addToPosCart(product)}
                disabled={product.stockCount <= 0}
                className="flex flex-col justify-between space-y-2 rounded-2xl border border-line bg-cream/50 p-3 text-left transition-colors hover:border-pine/40 hover:bg-paper disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div>
                  <span className="rounded bg-pine-soft px-1.5 py-0.5 text-[9px] font-bold uppercase text-pine">
                    {product.brand}
                  </span>
                  <div className="mt-1 line-clamp-2 text-xs font-bold text-ink">{product.name}</div>
                </div>
                <div className="flex items-center justify-between border-t border-line pt-2 text-xs">
                  <span className="font-bold text-ink">₹{product.price.toLocaleString('en-IN')}</span>
                  <span className="text-[10px] text-ink-soft">{product.stockCount} in stock</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-between space-y-5 lg:col-span-5">
          <div className="card space-y-4 p-5">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <span className="text-sm font-bold text-ink">Current bill</span>
              <span className="text-xs text-ink-soft">
                {posCart.length} line{posCart.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <span className="block font-bold text-ink">Customer</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setCustomerType('Walk-in')}
                  className={`rounded-xl border p-2 font-bold transition-colors ${
                    customerType === 'Walk-in'
                      ? 'border-pine bg-pine text-cream'
                      : 'border-line bg-cream text-ink-soft hover:border-pine/40'
                  }`}
                >
                  Walk-in
                </button>
                <button
                  onClick={() => setCustomerType('Khata Farmer')}
                  disabled={approvedKhata.length === 0}
                  className={`rounded-xl border p-2 font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    customerType === 'Khata Farmer'
                      ? 'border-pine bg-pine text-cream'
                      : 'border-line bg-cream text-ink-soft hover:border-pine/40'
                  }`}
                >
                  Khata account
                </button>
              </div>

              {customerType === 'Khata Farmer' && (
                <select
                  value={selectedKhataId}
                  onChange={(event) => setSelectedKhataId(event.target.value)}
                  className="field font-bold"
                >
                  {approvedKhata.map((record) => (
                    <option key={record.id} value={record.id}>
                      {record.customerName} ({record.village}) — ₹{record.availableCredit.toLocaleString('en-IN')} available
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
              {posCart.length === 0 ? (
                <p className="py-8 text-center text-xs text-ink-soft">
                  Pick products from the catalogue to start a bill.
                </p>
              ) : (
                posCart.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center justify-between rounded-xl border border-line bg-cream/50 p-2.5 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-bold text-ink">{item.product.name}</div>
                      <div className="text-[10px] text-ink-soft">
                        ₹{item.price.toLocaleString('en-IN')} × {item.quantity}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center overflow-hidden rounded-lg border border-line bg-paper">
                        <button
                          onClick={() => updatePosQty(item.product.id, -1)}
                          className="px-2 py-0.5 text-ink-soft hover:bg-cream hover:text-ink"
                        >
                          −
                        </button>
                        <span className="px-2 font-bold text-ink">{item.quantity}</span>
                        <button
                          onClick={() => updatePosQty(item.product.id, 1)}
                          className="px-2 py-0.5 text-ink-soft hover:bg-cream hover:text-ink"
                        >
                          +
                        </button>
                      </div>
                      <span className="w-16 text-right font-bold text-ink">
                        ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card space-y-3 p-5">
            <div className="grid grid-cols-3 gap-2 text-xs">
              {(['Cash', 'UPI', 'Khata Credit'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setPaymentMode(mode)}
                  className={`rounded-xl border p-2 font-bold transition-colors ${
                    paymentMode === mode
                      ? 'border-pine bg-pine text-cream'
                      : 'border-line bg-cream text-ink-soft hover:border-pine/40'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-ink-soft">
                <span>Subtotal</span>
                <span className="font-bold text-ink">₹{cartSubtotal.toLocaleString('en-IN')}</span>
              </div>
              <p className="text-[10px] text-ink-soft">
                GST and any bulk discount are applied by the server when the sale is recorded.
              </p>
              <div className="flex items-center justify-between border-t border-line pt-2 text-sm font-bold text-ink">
                <span>Items total</span>
                <span className="font-display text-lg">₹{cartSubtotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button
              onClick={() => void handleCompleteSale()}
              disabled={isPlacing}
              className="btn btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Printer className="h-4 w-4" />
              {isPlacing ? 'Recording sale…' : 'Complete sale and print bill'}
            </button>
          </div>
        </div>
      </div>

      {receiptOrder && (
        <div className="print-backdrop fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
          <div className="print-area relative w-full max-w-sm space-y-4 rounded-3xl bg-paper p-6 font-mono text-xs shadow-2xl">
            <button
              onClick={() => setReceiptOrder(null)}
              className="no-print absolute right-4 top-4 text-ink-soft hover:text-ink"
              aria-label="Close receipt"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1 border-b border-dashed border-line pb-3 text-center">
              <div className="text-base font-black uppercase tracking-widest text-ink">{STORE.name}</div>
              <div>{STORE.region}</div>
              <div>{STORE.phone}</div>
              <div className="mt-1 text-[10px] text-ink-soft">Order #{receiptOrder.orderNumber}</div>
            </div>

            <div className="space-y-1">
              <div>Customer: {receiptOrder.customerName}</div>
              <div>Payment: {receiptOrder.paymentMethod} ({receiptOrder.paymentStatus})</div>
            </div>

            <div className="space-y-1 border-y border-dashed border-line py-2">
              {receiptOrder.items.map((item, index) => (
                <div key={`${item.productId}-${index}`} className="flex justify-between">
                  <span className="max-w-[180px] truncate">{item.productName}</span>
                  <span>
                    {item.quantity} × ₹{item.unitPrice} = ₹{item.totalPrice.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-1 text-right font-bold text-sm">
              <div>Subtotal: ₹{receiptOrder.subtotal.toLocaleString('en-IN')}</div>
              {receiptOrder.discount > 0 && (
                <div>Bulk discount: −₹{receiptOrder.discount.toLocaleString('en-IN')}</div>
              )}
              <div>GST: ₹{receiptOrder.tax.toLocaleString('en-IN')}</div>
              <div className="text-pine">TOTAL: ₹{receiptOrder.totalAmount.toLocaleString('en-IN')}</div>
            </div>

            <div className="border-t border-dashed border-line pt-2 text-center text-[10px] text-ink-soft">
              {STORE.gstNote}
            </div>

            <button
              onClick={() => {
                printBill();
                setReceiptOrder(null);
              }}
              className="btn btn-primary w-full font-sans"
            >
              <Printer className="h-4 w-4" />
              Print invoice
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
