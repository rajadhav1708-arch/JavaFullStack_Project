import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Users, Search, Phone, MapPin, Award, Plus, CheckCircle2 } from 'lucide-react';

export const CustomerCRM: React.FC = () => {
  const { khataRecords } = useApp();
  const [search, setSearch] = useState('');

  const farmers = [
    {
      id: 'f1',
      name: 'Suresh Kumar Patil',
      village: 'Kagal Village',
      phone: '+91 98223 44512',
      herdSize: '18 Cows & Buffaloes',
      milkUnion: 'Gokul Dairy Cooperative',
      totalSpent: '₹1,42,000',
      loyaltyTier: 'Gold Tier',
    },
    {
      id: 'f2',
      name: 'Ananda Ramrao Chavan',
      village: 'Murgud Town',
      phone: '+91 94211 88902',
      herdSize: '24 High-Yield HF Cows',
      milkUnion: 'Warna Dairy Union',
      totalSpent: '₹2,10,500',
      loyaltyTier: 'Platinum Tier',
    },
    {
      id: 'f3',
      name: 'Vijay Laxman Shinde',
      village: 'Bhogawati Valley',
      phone: '+91 97632 11099',
      herdSize: '12 Murrah Buffaloes',
      milkUnion: 'Bhogawati Milk Center',
      totalSpent: '₹89,400',
      loyaltyTier: 'Silver Tier',
    },
  ];

  const filtered = farmers.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.village.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">Farmer Profiles & CRM Directory</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cattle herd records, milk union affiliations, lifetime feed consumption, and loyalty tiers.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search farmer name, village..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-emerald-600"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filtered.map((f) => (
          <div key={f.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md">
                {f.loyaltyTier}
              </span>
              <span className="text-xs font-black text-slate-900">{f.totalSpent} spent</span>
            </div>

            <div>
              <h3 className="font-bold text-slate-900 text-base">{f.name}</h3>
              <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                <span>{f.village}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Dairy Herd:</span>
                <span className="font-bold text-slate-900">{f.herdSize}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Milk Union:</span>
                <span className="font-semibold text-emerald-800">{f.milkUnion}</span>
              </div>
            </div>

            <a
              href={`tel:${f.phone}`}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-700" />
              <span>Call Farmer ({f.phone})</span>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};
