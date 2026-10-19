import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { ProductImage } from '../common/ProductImage';
import { formatCartVariantLabel, summariseCartUnits } from '../../utils/variants';
import {
  X,
  Trash2,
  ShoppingBag,
  ArrowRight,
  Truck,
  Plus,
  Minus,
} from 'lucide-react';

export const CartDrawer: React.FC = () => {
  const {
    isCartDrawerOpen,
    setIsCartDrawerOpen,
    cart,
    removeFromCart,
    updateCartQuantity,
    cartTotal,
  } = useApp();
  const navigate = useNavigate();

  if (!isCartDrawerOpen) return null;

  // Summing kilograms across a cart that also holds litres and sprayers
  // produces a number that means nothing, so totals are grouped by unit.
  const cartUnits = summariseCartUnits(cart);

  const handleProceedCheckout = () => {
    setIsCartDrawerOpen(false);
    navigate('/checkout');
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs"
      >
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="bg-white w-full max-w-md h-full flex flex-col justify-between shadow-2xl relative"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-emerald-700" />
              <h2 className="font-extrabold text-slate-900 text-base">Your Cart ({cart.length} Feeds)</h2>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsCartDrawerOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {cart.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-16 space-y-3"
              >
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400"
                >
                  <ShoppingBag className="w-8 h-8" />
                </motion.div>
                <h3 className="font-bold text-slate-800 text-sm">Your Feed Cart is Empty</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Explore our certified cattle feeds, calcium gels, and bypass fat supplements.
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setIsCartDrawerOpen(false);
                    navigate('/shop');
                  }}
                  className="mt-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  Browse Feed Store
                </motion.button>
              </motion.div>
            ) : (
              <AnimatePresence>
                {cart.map((item, idx) => (
                  <motion.div
                    key={`${item.product.id}-${item.weightKg}-${idx}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3"
                  >
                    <ProductImage
                      src={item.product.image}
                      alt={item.product.name}
                      eager
                      width={64}
                      height={64}
                      className="w-16 h-16 object-cover rounded-xl border border-slate-200 shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold text-emerald-800 uppercase">{item.product.brand}</div>
                      <h4 className="text-xs font-bold text-slate-900 truncate">{item.product.name}</h4>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {formatCartVariantLabel(item.product, item.weightKg)} {item.isSubscription && <span className="text-amber-700 font-bold">(Auto-Deliver)</span>}
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <div className="text-xs font-black text-slate-900">
                          ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                        </div>

                        {/* Quantity Selector */}
                        <div className="flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden text-xs">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => updateCartQuantity(item.product.id, item.weightKg, item.quantity - 1)}
                            className="px-2 py-0.5 text-slate-700 hover:bg-slate-100 font-bold"
                          >
                            <Minus className="w-3 h-3" />
                          </motion.button>
                          <span className="px-2 font-bold text-slate-900">{item.quantity}</span>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => updateCartQuantity(item.product.id, item.weightKg, item.quantity + 1)}
                            className="px-2 py-0.5 text-slate-700 hover:bg-slate-100 font-bold"
                          >
                            <Plus className="w-3 h-3" />
                          </motion.button>
                        </div>
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.8 }}
                      onClick={() => removeFromCart(item.product.id, item.weightKg)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg cursor-pointer"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Footer Summary & Checkout CTA */}
          {cart.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 border-t border-slate-200 bg-white space-y-3"
            >
              {/* Order contents summary */}
              <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-900 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 font-bold shrink-0">
                  <Truck className="w-4 h-4 text-emerald-700" />
                  <span>Order Contents:</span>
                </div>
                <span className="font-black text-emerald-800 text-right truncate">
                  {cartUnits.join(' · ')}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Subtotal ({cart.length} items)</span>
                  <span className="font-bold text-slate-900">₹{cartTotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between text-emerald-700 font-semibold">
                  <span>Village Freight Discount</span>
                  <span>FREE</span>
                </div>
                <div className="flex items-center justify-between text-slate-900 font-extrabold text-sm pt-2 border-t border-slate-100">
                  <span>Total Amount Payable</span>
                  <span className="text-emerald-800">₹{cartTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleProceedCheckout}
                className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs sm:text-sm py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
