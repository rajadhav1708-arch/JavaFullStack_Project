import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Settings, Store, Save } from 'lucide-react';

export const SettingsPanel: React.FC = () => {
  const { addToast } = useApp();

  const [shopName, setShopName] = useState('PashuFeed Pro Central Cattle Shop');
  const [gstin, setGstin] = useState('27AABCP1234F1Z0');
  const [address, setAddress] = useState('Shop #12, Cooperative Sugar Mill Complex, MIDC Kagal, Kolhapur, Maharashtra 416216');
  const [autoSms, setAutoSms] = useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    addToast('Store configuration & GST settings saved successfully!', 'success');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900">Store Settings & Business Config</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure shop details, thermal invoice headers, GST registration, and WhatsApp alert gateways.
        </p>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs max-w-2xl space-y-6">
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Cattle Feed Shop Name</label>
            <input
              type="text"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">GSTIN Tax Registration Number</label>
            <input
              type="text"
              value={gstin}
              onChange={(e) => setGstin(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold font-mono outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Store Address (Printed on Invoices)</label>
            <textarea
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium outline-none focus:border-emerald-600"
            />
          </div>

          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="font-bold text-emerald-900">Send WhatsApp Delivery & Khata Reminders</div>
              <div className="text-[11px] text-emerald-700">Auto-send SMS when tractor dispatches or khata payments are due.</div>
            </div>
            <input
              type="checkbox"
              checked={autoSms}
              onChange={(e) => setAutoSms(e.target.checked)}
              className="w-5 h-5 accent-emerald-800 rounded cursor-pointer"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs px-6 py-3.5 rounded-2xl flex items-center gap-2 shadow-md cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Configuration</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
