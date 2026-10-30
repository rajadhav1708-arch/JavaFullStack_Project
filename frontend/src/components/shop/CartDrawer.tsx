import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { ProductImage } from '../common/ProductImage';
import { formatCartVariantLabel, summariseCartUnits } from '../../utils/variants';
import { X, Trash2, ShoppingBag, ArrowRight, Plus, Minus } from 'lucide-react';

export const CartDrawer: React.FC = () => {
  const { isCartDrawerOpen, setIsCartDrawerOpen, cart, removeFromCart, updateCartQuantity, cartTotal } =
    useApp();
  const navigate = useNavigate();
  const { t } = useLanguage();

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
        className="no-print fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm"
        onClick={() => setIsCartDrawerOpen(false)}
      >
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          onClick={(event) => event.stopPropagation()}
          className="relative flex h-full w-full max-w-md flex-col justify-between bg-paper shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-line bg-cream/60 p-5">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-pine" />
              <h2 className="text-base font-bold text-ink">
                {t('cart.title')}
                <span className="ml-2 text-xs font-semibold text-ink-soft">
                  {cart.length === 1 ? t('cart.lineCountOne') : t('cart.lineCount', { n: cart.length })}
                </span>
              </h2>
            </div>
            <button
              onClick={() => setIsCartDrawerOpen(false)}
              className="rounded-lg p-1.5 text-ink-soft transition-colors hover:bg-cream hover:text-ink"
              aria-label={t('cart.close')}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {cart.length === 0 ? (
              <div className="space-y-3 py-16 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-pine-soft text-pine">
                  <ShoppingBag className="h-7 w-7" />
                </div>
                <h3 className="text-sm font-bold text-ink">{t('cart.emptyTitle')}</h3>
                <p className="mx-auto max-w-xs text-xs leading-relaxed text-ink-soft">{t('cart.emptyBody')}</p>
                <button
                  onClick={() => {
                    setIsCartDrawerOpen(false);
                    navigate('/shop');
                  }}
                  className="btn btn-primary mt-2"
                >
                  {t('cart.emptyCta')}
                </button>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {cart.map((item) => (
                  <motion.div
                    key={`${item.product.id}-${item.weightKg}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-cream/50 p-3.5"
                  >
                    <ProductImage
                      src={item.product.image}
                      alt={item.product.name}
                      eager
                      width={64}
                      height={64}
                      className="h-16 w-16 shrink-0 rounded-xl border border-line object-cover"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-pine">
                        {item.product.brand}
                      </p>
                      <h4 className="truncate text-xs font-bold text-ink">{item.product.name}</h4>
                      <p className="mt-0.5 text-[11px] text-ink-soft">
                        {formatCartVariantLabel(item.product, item.weightKg)}
                      </p>

                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs font-bold text-ink">
                          ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                        </p>

                        <div className="flex items-center overflow-hidden rounded-lg border border-line bg-paper text-xs">
                          <button
                            onClick={() =>
                              updateCartQuantity(item.product.id, item.weightKg, item.quantity - 1)
                            }
                            className="px-2 py-1 text-ink-soft hover:bg-cream hover:text-ink"
                            aria-label={t('cart.decrease')}
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="px-2 font-bold text-ink">{item.quantity}</span>
                          <button
                            onClick={() =>
                              updateCartQuantity(item.product.id, item.weightKg, item.quantity + 1)
                            }
                            className="px-2 py-1 text-ink-soft hover:bg-cream hover:text-ink"
                            aria-label={t('cart.increase')}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.product.id, item.weightKg)}
                      className="rounded-lg p-1.5 text-ink-soft hover:bg-clay/10 hover:text-clay"
                      title={t('cart.remove')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          {cart.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3 border-t border-line bg-paper p-5"
            >
              <div className="flex items-center justify-between gap-3 rounded-xl bg-pine-soft p-2.5 text-xs">
                <span className="shrink-0 font-bold text-pine">{t('cart.contents')}</span>
                <span className="truncate text-right font-semibold text-pine/80">
                  {cartUnits.join(' · ')}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-ink-soft">
                <div className="flex items-center justify-between">
                  <span>{t('cart.subtotal')}</span>
                  <span className="font-bold text-ink">₹{cartTotal.toLocaleString('en-IN')}</span>
                </div>
                <p className="text-[11px]">{t('cart.gstDeliveryNote')}</p>
                <div className="flex items-center justify-between border-t border-line pt-2 text-sm font-bold text-ink">
                  <span>{t('cart.estimatedTotal')}</span>
                  <span className="font-display text-lg">₹{cartTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <button onClick={handleProceedCheckout} className="btn btn-primary w-full">
                {t('cart.checkout')}
                <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
