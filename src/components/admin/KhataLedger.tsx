import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { KhataAccount } from '../../types';
import {
  BookOpen,
  Search,
  Plus,
  Send,
  CheckCircle2,
  AlertTriangle,
  History,
  X,
  CreditCard,
  PhoneCall,
} from 'lucide-react';

export const KhataLedger: React.FC = () => {
  const { khataRecords, addKhataPayment, addToast } = useApp();

  const [search, setSearch] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<KhataAccount | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(5000);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const filtered = khataRecords.filter(
    (k) =>
      k.customerName.toLowerCase().includes(search.toLowerCase()) ||
      k.village.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord || paymentAmount <= 0) return;

    addKhataPayment(selectedRecord.id, paymentAmount, 'Milk Collection Auto-Deduction');
    setIsPaymentModalOpen(false);
    addToast(`Recorded ₹${paymentAmount} payment for ${selectedRecord.customerName}`, 'success');
  };

  const handleSendReminder = (customerName: string, phone: string, amount: number) => {
    addToast(`WhatsApp SMS Payment Reminder sent to ${customerName} (${phone}) for ₹${amount}`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">Farmer Credit Khata Ledger</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage revolving feed credit limits linked with local village milk collection centers.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search farmer name or village..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-emerald-600"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        </div>
      </div>

      {/* Khata Farmer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((record) => {
          const isOverdue = record.status === 'Overdue';

          return (
            <div
              key={record.id}
              className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4 relative flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">
                    Milk Union ID: {record.milkUnionMemberId}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      isOverdue ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {record.status}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 text-base">{record.customerName}</h3>
                  <div className="text-xs text-slate-500">{record.village} | {record.phone}</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Approved Credit Limit:</span>
                    <span className="font-bold text-slate-900">₹{record.totalCreditLimit.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Outstanding Due Balance:</span>
                    <span className="font-black text-amber-900">₹{record.totalOutstanding.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200">
                    <span>Billing Due Date:</span>
                    <span className="font-bold text-slate-700">{record.dueDate}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    setSelectedRecord(record);
                    setIsPaymentModalOpen(true);
                  }}
                  className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Record Payment</span>
                </button>

                <button
                  onClick={() => handleSendReminder(record.customerName, record.phone, record.totalOutstanding)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1 cursor-pointer"
                  title="Send WhatsApp SMS Reminder"
                >
                  <Send className="w-3.5 h-3.5 text-emerald-700" />
                  <span>SMS Reminder</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Payment Entry Modal */}
      {isPaymentModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setIsPaymentModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-xs font-bold text-emerald-800 uppercase bg-emerald-100 px-2 py-0.5 rounded-md">
                Khata Payment Receipt
              </span>
              <h2 className="text-lg font-black text-slate-900 mt-1">
                Record Credit Payment for {selectedRecord.customerName}
              </h2>
              <p className="text-xs text-slate-500">Current Outstanding: ₹{selectedRecord.totalOutstanding}</p>
            </div>

            <form onSubmit={handleAddPaymentSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Payment Received Amount (₹)</label>
                <input
                  type="number"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-black text-base rounded-xl p-3 outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 font-bold text-slate-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-800 text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Save Payment Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
