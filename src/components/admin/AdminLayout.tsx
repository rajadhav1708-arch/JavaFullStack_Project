import React from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { AdminOverview } from './AdminOverview';
import { SalesAnalytics } from './SalesAnalytics';
import { InventoryManagement } from './InventoryManagement';
import { POSCounter } from './POSCounter';
import { KhataLedger } from './KhataLedger';
import { CustomerCRM } from './CustomerCRM';
import { SupplierManagement } from './SupplierManagement';
import { DeliveryManagement } from './DeliveryManagement';
import { OffersAndDiscounts } from './OffersAndDiscounts';
import { ReportsGenerator } from './ReportsGenerator';
import { SettingsPanel } from './SettingsPanel';
import {
  LayoutDashboard,
  BarChart3,
  Package,
  Store,
  BookOpen,
  Users,
  Building2,
  Truck,
  Ticket,
  FileText,
  Settings,
  ChevronRight,
} from 'lucide-react';

/**
 * Tabs each role may open. Counter staff handle billing and stock at the shop
 * counter; the owner additionally sees revenue, credit, supplier and config
 * records. Both lists are enforced again on the matching API routes.
 */
const STAFF_TABS = ['overview', 'inventory', 'pos', 'delivery'] as const;
const ADMIN_TABS = [
  'overview',
  'analytics',
  'inventory',
  'pos',
  'khata',
  'crm',
  'suppliers',
  'delivery',
  'offers',
  'reports',
  'settings',
] as const;

export const AdminLayout: React.FC = () => {
  const { adminTab, setAdminTab } = useApp();
  const { user } = useAuth();

  const isOwner = user?.role === 'admin';
  const allowedTabs = isOwner ? ADMIN_TABS : STAFF_TABS;

  const menuItems = [
    { id: 'overview', label: 'Overview Dashboard', icon: LayoutDashboard },
    { id: 'analytics', label: 'Sales & Revenue', icon: BarChart3 },
    { id: 'inventory', label: 'Inventory & Batches', icon: Package },
    { id: 'pos', label: 'POS Billing Counter', icon: Store },
    { id: 'khata', label: 'Farmer Credit Khata', icon: BookOpen },
    { id: 'crm', label: 'Farmer Directory', icon: Users },
    { id: 'suppliers', label: 'Suppliers & POs', icon: Building2 },
    { id: 'delivery', label: 'Village Freight Dispatch', icon: Truck },
    { id: 'offers', label: 'Promotions & Coupons', icon: Ticket },
    { id: 'reports', label: 'GST & Audit Reports', icon: FileText },
    { id: 'settings', label: 'Store Settings', icon: Settings },
  ].filter((item) => (allowedTabs as readonly string[]).includes(item.id));

  // Staff should never be left staring at a tab their role cannot open.
  React.useEffect(() => {
    if (!(allowedTabs as readonly string[]).includes(adminTab)) {
      setAdminTab('overview');
    }
  }, [adminTab, allowedTabs, setAdminTab]);

  const roleLabel = isOwner ? 'Shop Owner' : 'Counter Staff';
  const initials = (user?.name ?? '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div className="bg-[#fafaf9] min-h-screen py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* SaaS Sidebar Navigation (3 Cols) - High Density Theme */}
          <aside className="lg:col-span-3 bg-[#064e3b] text-white rounded-2xl border border-[#065f46] shadow-md overflow-hidden sticky top-24">
            <div className="p-4 flex items-center gap-3 border-b border-[#065f46]">
              <div className="w-8 h-8 bg-[#10b981] rounded-lg flex items-center justify-center font-bold text-white text-sm shrink-0">
                A
              </div>
              <div>
                <span className="text-sm font-bold tracking-tight block">AgroFeed Pro</span>
                <span className="text-[10px] text-[#34d399] uppercase font-semibold tracking-wider">
                  SaaS Control
                </span>
              </div>
            </div>

            <div className="px-4 text-[10px] uppercase tracking-wider text-[#34d399] font-semibold pt-4 pb-1">
              Management
            </div>

            <nav className="py-1 space-y-0.5">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = adminTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setAdminTab(item.id)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#065f46] border-r-4 border-[#10b981] text-white font-bold'
                        : 'text-[#a7f3d0] hover:bg-[#065f46] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#10b981]' : 'text-[#34d399]'}`} />
                      <span>{item.label}</span>
                    </div>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#10b981]" />}
                  </button>
                );
              })}
            </nav>

            <div className="p-4 border-t border-[#065f46] mt-4">
              <div className="flex items-center gap-3 p-2 bg-[#065f46] rounded-xl">
                <div className="w-7 h-7 bg-[#10b981] rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {initials}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="text-xs font-semibold truncate text-white">{user?.name}</div>
                  <div className="text-[10px] text-[#34d399]">{roleLabel}</div>
                </div>
              </div>
            </div>
          </aside>

          {/* SaaS Content Tab Render (9 Cols) */}
          <div className="lg:col-span-9">
            {adminTab === 'overview' && <AdminOverview />}
            {adminTab === 'analytics' && <SalesAnalytics />}
            {adminTab === 'inventory' && <InventoryManagement />}
            {adminTab === 'pos' && <POSCounter />}
            {adminTab === 'khata' && <KhataLedger />}
            {adminTab === 'crm' && <CustomerCRM />}
            {adminTab === 'suppliers' && <SupplierManagement />}
            {adminTab === 'delivery' && <DeliveryManagement />}
            {adminTab === 'offers' && <OffersAndDiscounts />}
            {adminTab === 'reports' && <ReportsGenerator />}
            {adminTab === 'settings' && <SettingsPanel />}
          </div>
        </div>
      </div>
    </div>
  );
};
