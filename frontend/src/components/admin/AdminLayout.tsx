import React from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { STORE } from '../../data/store';
import type { AdminTab } from '../../types';
import { AdminOverview } from './AdminOverview';
import { SalesAnalytics } from './SalesAnalytics';
import { InventoryManagement } from './InventoryManagement';
import { POSCounter } from './POSCounter';
import { KhataLedger } from './KhataLedger';
import { DeliveryManagement } from './DeliveryManagement';
import {
  LayoutDashboard,
  BarChart3,
  Package,
  Store,
  BookOpen,
  Truck,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';

/** Tabs backed by live data. Anything without a matching API is not shown. */
const ADMIN_TABS: readonly AdminTab[] = [
  'overview',
  'analytics',
  'inventory',
  'pos',
  'khata',
  'delivery',
] as const;

const MENU_ITEMS = [
  { id: 'overview', labelKey: 'admin.navOverview' as const, icon: LayoutDashboard },
  { id: 'analytics', labelKey: 'admin.navSales' as const, icon: BarChart3 },
  { id: 'inventory', labelKey: 'admin.navInventory' as const, icon: Package },
  { id: 'pos', labelKey: 'admin.navPos' as const, icon: Store },
  { id: 'khata', labelKey: 'admin.navKhata' as const, icon: BookOpen },
  { id: 'delivery', labelKey: 'admin.navDispatch' as const, icon: Truck },
] satisfies { id: AdminTab; labelKey: string; icon: LucideIcon }[];

export const AdminLayout: React.FC = () => {
  const { adminTab, setAdminTab } = useApp();
  const { user } = useAuth();
  const { t } = useLanguage();

  React.useEffect(() => {
    if (!(ADMIN_TABS as readonly string[]).includes(adminTab)) {
      setAdminTab('overview');
    }
  }, [adminTab, setAdminTab]);

  const initials = (user?.name ?? '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div className="min-h-screen bg-cream py-6 sm:py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <aside className="sticky top-24 overflow-hidden rounded-2xl border border-line bg-paper shadow-sm lg:col-span-3">
            <div className="flex items-center gap-3 border-b border-line p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cream p-1 ring-1 ring-line">
                <img src="/brand/hindavi-logo.png" alt="" className="h-full w-full object-contain" />
              </div>
              <div className="min-w-0">
                <span className="block truncate text-sm font-bold tracking-tight text-ink">
                  {STORE.name}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-pine">
                  {STORE.region}
                </span>
              </div>
            </div>

            <div className="px-4 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
              {t('admin.sectionLabel')}
            </div>

            <nav className="space-y-0.5 py-1">
              {MENU_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = adminTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setAdminTab(item.id)}
                    className={`flex w-full cursor-pointer items-center justify-between px-4 py-2.5 text-xs font-semibold transition-colors ${
                      isActive
                        ? 'border-r-4 border-pine bg-pine-soft text-ink'
                        : 'text-ink-soft hover:bg-cream hover:text-ink'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 ${isActive ? 'text-pine' : 'text-ink-soft'}`} />
                      {t(item.labelKey)}
                    </span>
                    {isActive && <ChevronRight className="h-3.5 w-3.5 text-pine" />}
                  </button>
                );
              })}
            </nav>

            <div className="mt-4 border-t border-line p-4">
              <div className="flex items-center gap-3 rounded-xl bg-cream p-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pine text-xs font-bold text-cream">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-ink">{user?.name}</div>
                  <div className="text-[10px] text-ink-soft">
                    {user?.role === 'employee' ? t('admin.roleStaff') : t('admin.roleOwner')}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <div className="lg:col-span-9">
            {adminTab === 'overview' && <AdminOverview />}
            {adminTab === 'analytics' && <SalesAnalytics />}
            {adminTab === 'inventory' && <InventoryManagement />}
            {adminTab === 'pos' && <POSCounter />}
            {adminTab === 'khata' && <KhataLedger />}
            {adminTab === 'delivery' && <DeliveryManagement />}
          </div>
        </div>
      </div>
    </div>
  );
};
