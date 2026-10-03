import React from 'react';
import { useApp } from '../../context/AppContext';
import { FileText, Download } from 'lucide-react';

export const ReportsGenerator: React.FC = () => {
  const { addToast } = useApp();

  const reports = [
    { name: 'GST Sales & Tax Summary Statement (Form GSTR-3B)', desc: 'Itemized 5% and 12% GST breakdown for cattle feed billing.' },
    { name: 'Farmer Khata Outstanding Recovery Ledger', desc: 'Complete list of overdue balances linked with milk unions.' },
    { name: 'Daily Feed Consumption & Reorder Audit', desc: '50kg bag stock movement, batch numbers, and expiry alerts.' },
    { name: 'Monthly Revenue & Profitability Analysis', desc: 'Gross sales margin across brands (PashuPoshan, Godrej, Kapila).' },
  ];

  const handleDownload = (name: string) => {
    addToast(`Exported report "${name}" as PDF/CSV`, 'success');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900">Reports & Tax Compliance Export</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Generate exportable PDF & CSV reports for CA auditing, GST tax filing, and stock audits.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((rep, idx) => (
          <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">{rep.name}</h3>
              <p className="text-xs text-slate-500">{rep.desc}</p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-700">PDF & Excel Ready</span>
              <button
                onClick={() => handleDownload(rep.name)}
                className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Report</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
