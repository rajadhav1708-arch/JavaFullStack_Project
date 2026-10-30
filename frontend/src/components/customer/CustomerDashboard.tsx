import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ShoppingBag, ShieldCheck, Heart, Truck, ArrowRight } from 'lucide-react';
import { MyKhataTab } from './MyKhataTab';

type Tab = 'orders' | 'khata' | 'wishlist';

export const CustomerDashboard: React.FC = () => {
  const {
    orders,
    khataRecords,
    wishlist,
    products,
    setActiveOrderForTracking,
    setCurrentView,
  } = useApp();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<Tab>('orders');

  const initials = (user?.name ?? 'U')
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Match by the server-scoped user id, never by display name. The API already
  // returns only this customer's ledger; the id check is a second line of defence.
  const myKhata = khataRecords.find(
    (record) => user != null && record.customerId === `user-${user.id}`
  );

  const activeOrders = orders.filter(
    (order) => order.status !== 'Delivered' && order.status !== 'Cancelled'
  ).length;

  return (
    <div className="min-h-screen bg-cream py-10">
      <div className="mx-auto max-w-6xl space-y-6 px-4 sm:px-6 lg:px-8">
        <section className="card flex flex-col justify-between gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pine font-display text-2xl font-semibold text-cream">
              {initials}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl text-ink sm:text-2xl">{user?.name ?? t('customer.title')}</h1>
                {user?.role === 'customer' && (
                  <span className="rounded-full bg-pine-soft px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-pine">
                    {t('customer.dairyBadge')}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-ink-soft">
                {user?.customerCode ? `${user.customerCode} · ` : ''}
                {user?.village ? `${user.village} · ` : ''}
                {user?.email}
              </p>
            </div>
          </div>

          <button onClick={() => setCurrentView('shop')} className="btn btn-primary self-start sm:self-auto">
            <ShoppingBag className="h-4 w-4" />
            {t('customer.orderFeed')}
          </button>
        </section>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="card p-5">
            <div className="flex items-center justify-between text-ink-soft">
              <span className="text-xs font-bold">{t('customer.statOrders')}</span>
              <ShoppingBag className="h-4 w-4 text-pine" />
            </div>
            <p className="mt-2 font-display text-2xl font-semibold text-ink">{orders.length}</p>
            <p className="text-[11px] text-ink-soft">
              {activeOrders > 0 ? t('customer.statOrdersSub', { n: activeOrders }) : t('customer.statOrdersNone')}
            </p>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between text-ink-soft">
              <span className="text-xs font-bold">{t('customer.statKhata')}</span>
              <ShieldCheck className="h-4 w-4 text-ochre" />
            </div>
            <p className="mt-2 font-display text-2xl font-semibold text-ink">
              ₹{(myKhata?.totalOutstanding ?? 0).toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-ink-soft">
              {myKhata && myKhata.status === 'Approved'
                ? t('customer.statKhataDue', { date: myKhata.dueDate || '—' })
                : myKhata
                  ? `Khata ${myKhata.status.toLowerCase()}`
                  : t('customer.statKhataNone')}
            </p>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between text-ink-soft">
              <span className="text-xs font-bold">{t('customer.statSaved')}</span>
              <Heart className="h-4 w-4 text-clay" />
            </div>
            <p className="mt-2 font-display text-2xl font-semibold text-ink">{wishlist.length}</p>
            <p className="text-[11px] text-ink-soft">{t('customer.statSavedSub')}</p>
          </div>
        </div>

        <section className="card overflow-hidden">
          <div className="flex gap-1 overflow-x-auto border-b border-line p-3">
            {(
              [
                { id: 'orders', label: t('customer.tabOrders', { n: orders.length }) },
                { id: 'khata', label: t('customer.tabKhata') },
                { id: 'wishlist', label: t('customer.tabSaved', { n: wishlist.length }) },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                  activeTab === tab.id ? 'bg-pine text-cream' : 'text-ink-soft hover:bg-cream hover:text-ink'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-5 sm:p-6">
            {activeTab === 'orders' && (
              <div className="space-y-3">
                {orders.length === 0 && (
                  <EmptyState
                    icon={ShoppingBag}
                    title={t('customer.ordersEmptyTitle')}
                    body={t('customer.ordersEmptyBody')}
                    actionLabel={t('customer.ordersEmptyCta')}
                    onAction={() => setCurrentView('shop')}
                  />
                )}

                {orders.map((order) => (
                  <article
                    key={order.id}
                    className="flex flex-col justify-between gap-4 rounded-2xl border border-line bg-cream/60 p-4 sm:flex-row sm:items-center"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-pine-soft px-2.5 py-0.5 text-[10px] font-bold text-pine">
                          {order.status}
                        </span>
                        <span className="text-[11px] text-ink-soft">Order #{order.orderNumber}</span>
                      </div>
                      <p className="mt-1.5 text-sm font-bold text-ink">
                        {order.items.map((item) => `${item.productName} (x${item.quantity})`).join(', ')}
                      </p>
                      <p className="text-[11px] text-ink-soft">
                        {order.date} · {order.paymentMethod} ({order.paymentStatus})
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-4 border-t border-line pt-3 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
                      <p className="font-display text-lg font-semibold text-ink">
                        ₹{order.totalAmount.toLocaleString('en-IN')}
                      </p>
                      <button
                        onClick={() => {
                          setActiveOrderForTracking(order);
                          setCurrentView('order-tracking');
                        }}
                        className="btn btn-outline !px-3 !py-2 text-[11px]"
                      >
                        <Truck className="h-3.5 w-3.5" />
                        {t('customer.trackOrder')}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {activeTab === 'khata' && <MyKhataTab />}

            {activeTab === 'wishlist' && (
              <div>
                {wishlist.length === 0 ? (
                  <EmptyState
                    icon={Heart}
                    title={t('customer.savedEmptyTitle')}
                    body={t('customer.savedEmptyBody')}
                    actionLabel={t('customer.savedEmptyCta')}
                    onAction={() => setCurrentView('shop')}
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {wishlist.map((id) => {
                      const product = products.find((p) => p.id === id);
                      if (!product) return null;
                      return (
                        <div
                          key={id}
                          className="flex items-center gap-3 rounded-2xl border border-line bg-cream/60 p-3"
                        >
                          <img
                            src={product.image}
                            alt={product.name}
                            loading="lazy"
                            className="h-16 w-16 rounded-xl object-cover"
                          />
                          <div>
                            <p className="text-xs font-bold text-ink">{product.name}</p>
                            <p className="mt-1 font-display text-sm font-semibold text-ink">
                              ₹{product.price.toLocaleString('en-IN')}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

const EmptyState: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
}> = ({ icon: Icon, title, body, actionLabel, onAction }) => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-cream/50 px-6 py-10 text-center">
    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pine-soft text-pine">
      <Icon className="h-5 w-5" />
    </span>
    <h3 className="mt-3 text-base font-semibold text-ink">{title}</h3>
    <p className="mt-1 max-w-sm text-xs leading-relaxed text-ink-soft">{body}</p>
    <button onClick={onAction} className="btn btn-outline mt-4 !px-4 !py-2 text-xs">
      {actionLabel}
      <ArrowRight className="h-3.5 w-3.5" />
    </button>
  </div>
);
