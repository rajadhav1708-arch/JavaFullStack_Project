import React, { useCallback, useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { STORE } from '../../data/store';
import { KhataAccount, KhataTransaction } from '../../types';
import {
  Search,
  Plus,
  MessageCircle,
  X,
  BookOpen,
  Loader2,
  CheckCircle2,
  XCircle,
  PauseCircle,
  PlayCircle,
  RotateCcw,
  Users,
  Wallet,
} from 'lucide-react';

type StatusFilter = '' | 'Pending' | 'Approved' | 'Suspended' | 'Rejected' | 'Closed';

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Suspended', label: 'Suspended' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'Closed', label: 'Closed' },
];

const STATUS_STYLES: Record<string, string> = {
  Pending: 'bg-ochre-soft text-[#7a4d12]',
  Approved: 'bg-pine-soft text-pine',
  Rejected: 'bg-clay/10 text-clay',
  Suspended: 'bg-clay/10 text-clay',
  Closed: 'bg-cream text-ink-soft border border-line',
};

interface CustomerSearchResult {
  id: number;
  customerCode: string;
  email?: string;
  name: string;
  village: string;
  hasKhata: boolean;
}

/**
 * The shop's Khata management screen: the pending-approval queue, every
 * account with its lifecycle status, and per-account actions â€” approve,
 * reject, suspend, reactivate, record payments, reverse mistaken entries.
 * All writes go to the server; nothing here is trusted with the balance.
 */
export const KhataLedger: React.FC = () => {
  const { khataRecords, fetchKhata, addKhataPayment, addToast } = useApp();
  const { csrfToken } = useAuth();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [selectedRecord, setSelectedRecord] = useState<KhataAccount | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Server-side filtering: the API takes ?q= and ?status=, so this stays
  // correct even with hundreds of accounts.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchKhata({ q: search.trim() || undefined, status: statusFilter || undefined });
    }, search ? 250 : 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, fetchKhata]);

  const pendingCount = khataRecords.filter((r) => r.status === 'Pending').length;
  const outstandingTotal = khataRecords
    .filter((r) => r.status === 'Approved')
    .reduce((sum, r) => sum + r.totalOutstanding, 0);

  const act = useCallback(
    async (path: string, method: string, body?: unknown): Promise<boolean> => {
      setBusy(true);
      try {
        const res = await fetch(path, {
          method,
          headers: body ? { 'Content-Type': 'application/json', ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {} ) } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        });
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        if (!res.ok) {
          addToast(data.message ?? 'The action could not be completed.', 'error');
          return false;
        }
        if (data.message) addToast(data.message, 'success');
        await fetchKhata({ q: search.trim() || undefined, status: statusFilter || undefined });
        if (selectedRecord) {
          const refreshed = await fetch(`/api/khata/${selectedRecord.id}`);
          if (refreshed.ok) {
            const payload = (await refreshed.json()) as { account: KhataAccount };
            setSelectedRecord(payload.account);
          }
        }
        return true;
      } catch {
        addToast('Could not reach the server. Please try again.', 'error');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [addToast, fetchKhata, search, statusFilter, selectedRecord]
  );

  const openLedger = async (record: KhataAccount) => {
    try {
      const res = await fetch(`/api/khata/${record.id}`);
      if (!res.ok) {
        addToast('Could not open this ledger.', 'error');
        return;
      }
      const data = (await res.json()) as { account: KhataAccount };
      setSelectedRecord(data.account);
    } catch {
      addToast('Could not reach the server.', 'error');
    }
  };

  /** Opens WhatsApp with a pre-filled reminder so the owner actually sends it
   *  from their own phone. Nothing is "sent" automatically by the app. */
  const openWhatsAppReminder = (record: KhataAccount) => {
    const digits = record.phone.replace(/\D/g, '');
    const text =
      `Namaskar ${record.customerName}, this is ${STORE.name}. ` +
      `Your khata has an outstanding balance of â‚¹${record.totalOutstanding.toLocaleString('en-IN')}` +
      (record.dueDate ? ` (due ${record.dueDate})` : '') +
      `. Please settle at the shop or call us on ${STORE.phone}. Thank you.`;
    window.open(
      `https://wa.me/${digits}?text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <div className="space-y-6">
      <div className="card flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl text-ink sm:text-2xl">Khata ledger</h1>
          <p className="mt-0.5 text-xs text-ink-soft">
            Farmer credit accounts, approvals, outstanding balances and payments received.
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-ink-soft">
            <span>
              Outstanding (approved):{' '}
              <strong className="text-clay">â‚¹{outstandingTotal.toLocaleString('en-IN')}</strong>
            </span>
            {pendingCount > 0 && (
              <span className="font-bold text-[#7a4d12]">{pendingCount} pending request(s)</span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <input
              type="text"
              placeholder="Name, phone, village or Customer IDâ€¦"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="field !pl-9"
            />
          </div>
          <button onClick={() => setIsCreateOpen(true)} className="btn btn-primary !py-2.5">
            <Plus className="h-4 w-4" />
            Create Khata
          </button>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-full border border-line bg-cream p-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-bold transition-colors ${
              statusFilter === tab.value ? 'bg-pine text-cream' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {khataRecords.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <BookOpen className="h-8 w-8 text-ink-soft" />
          <p className="text-sm font-bold text-ink">
            {search || statusFilter ? 'No accounts match' : 'No khata accounts yet'}
          </p>
          <p className="max-w-sm text-xs text-ink-soft">
            {search || statusFilter
              ? 'Try a different search or clear the status filter.'
              : 'Open a credit account for a registered customer, or wait for a customer to request one from their dashboard.'}
          </p>
          {!search && !statusFilter && (
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              <button onClick={() => setIsCreateOpen(true)} className="btn btn-primary !px-4 !py-2 text-xs">
                <Plus className="h-3.5 w-3.5" />
                Create Khata Account
              </button>
              <button
                onClick={() => setStatusFilter('Pending')}
                className="btn btn-outline !px-4 !py-2 text-xs"
              >
                <Users className="h-3.5 w-3.5" />
                View Pending Requests
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {khataRecords.map((record) => (
            <div key={record.id} className="card flex flex-col justify-between space-y-4 p-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase text-ink-soft">
                    {record.customerCode ?? record.milkUnionMemberId ?? record.id}
                  </span>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLES[record.status] ?? ''}`}
                  >
                    {record.status}
                  </span>
                </div>

                <div>
                  <h2 className="text-base font-bold text-ink">{record.customerName}</h2>
                  <p className="text-xs text-ink-soft">
                    {record.village} Â· {record.phone}
                  </p>
                  {record.status === 'Rejected' && record.rejectionReason && (
                    <p className="mt-1 text-[11px] text-clay">Reason: {record.rejectionReason}</p>
                  )}
                </div>

                <div className="space-y-1 rounded-2xl border border-line bg-cream/60 p-3 text-xs">
                  <div className="flex justify-between text-ink-soft">
                    <span>Credit limit</span>
                    <span className="font-bold text-ink">
                      â‚¹{record.totalCreditLimit.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between text-ink-soft">
                    <span>Outstanding</span>
                    <span className="font-bold text-clay">
                      â‚¹{record.totalOutstanding.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between text-ink-soft">
                    <span>Available credit</span>
                    <span className="font-bold text-pine">
                      â‚¹{record.availableCredit.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-line pt-1 text-[11px] text-ink-soft">
                    <span>Due date</span>
                    <span className="font-bold text-ink">{record.dueDate || 'â€”'}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-line pt-2">
                {record.status === 'Pending' ? (
                  <>
                    <button
                      disabled={busy}
                      onClick={() =>
                        void act(`/api/khata/${record.id}/decision`, 'POST', {
                          decision: 'approve',
                          creditLimit: record.requestedLimit ?? 0,
                        })
                      }
                      className="btn btn-primary !px-3 !py-2 text-xs disabled:opacity-60"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Approve
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => {
                        const reason = window.prompt('Reason for rejecting this request?');
                        if (reason === null) return;
                        if (!reason.trim()) {
                          addToast('A rejection reason is required.', 'error');
                          return;
                        }
                        void act(`/api/khata/${record.id}/decision`, 'POST', {
                          decision: 'reject',
                          reason: reason.trim(),
                        });
                      }}
                      className="btn btn-outline !px-3 !py-2 text-xs !border-clay/30 text-clay disabled:opacity-60"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Reject
                    </button>
                    <button
                      onClick={() => void openLedger(record)}
                      className="btn btn-outline !px-3 !py-2 text-xs"
                    >
                      Open
                    </button>
                  </>
                ) : record.status === 'Approved' || record.status === 'Suspended' ? (
                  <>
                    <button
                      onClick={() => {
                        setSelectedRecord(record);
                        setIsPaymentModalOpen(true);
                      }}
                      disabled={record.totalOutstanding <= 0}
                      className="btn btn-primary !px-3.5 !py-2 text-xs disabled:opacity-60"
                      title={record.totalOutstanding <= 0 ? 'Nothing due' : 'Record a payment received'}
                    >
                      <Wallet className="h-3.5 w-3.5" />
                      Record payment
                    </button>
                    <button onClick={() => void openLedger(record)} className="btn btn-outline !px-3 !py-2 text-xs">
                      <BookOpen className="h-3.5 w-3.5" />
                      Ledger
                    </button>
                    <button
                      onClick={() => openWhatsAppReminder(record)}
                      className="btn btn-outline !px-3 !py-2 text-xs"
                      title="Open WhatsApp with a pre-filled reminder"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </button>
                    {record.status === 'Approved' ? (
                      <button
                        disabled={busy}
                        onClick={() => {
                          const reason = window.prompt('Why is this Khata being suspended?');
                          if (reason === null) return;
                          if (!reason.trim()) {
                            addToast('A reason is required to suspend.', 'error');
                            return;
                          }
                          void act(`/api/khata/${record.id}/status`, 'POST', {
                            status: 'Suspended',
                            reason: reason.trim(),
                          });
                        }}
                        className="btn btn-outline !px-3 !py-2 text-xs disabled:opacity-60"
                      >
                        <PauseCircle className="h-3.5 w-3.5" />
                        Suspend
                      </button>
                    ) : (
                      <button
                        disabled={busy}
                        onClick={() =>
                          void act(`/api/khata/${record.id}/status`, 'POST', { status: 'Approved' })
                        }
                        className="btn btn-primary !px-3 !py-2 text-xs disabled:opacity-60"
                      >
                        <PlayCircle className="h-3.5 w-3.5" />
                        Reactivate
                      </button>
                    )}
                  </>
                ) : (
                  <button onClick={() => void openLedger(record)} className="btn btn-outline !px-3 !py-2 text-xs">
                    <BookOpen className="h-3.5 w-3.5" />
                    View history
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {isPaymentModalOpen && selectedRecord && (
        <PaymentModal
          record={selectedRecord}
          busy={busy}
          onClose={() => setIsPaymentModalOpen(false)}
          onSubmit={async (amount, method, notes) => {
            const ok = await addKhataPayment(selectedRecord.id, amount, notes, method);
            if (ok) setIsPaymentModalOpen(false);
          }}
        />
      )}

      {isCreateOpen && (
        <CreateKhataModal
          busy={busy}
          onClose={() => setIsCreateOpen(false)}
          onCreated={async () => {
            setIsCreateOpen(false);
            await fetchKhata({ q: search.trim() || undefined, status: statusFilter || undefined });
          }}
        />
      )}

      {selectedRecord && !isPaymentModalOpen && (
        <LedgerDetailModal
          record={selectedRecord}
          busy={busy}
          onClose={() => setSelectedRecord(null)}
          onReverse={async (entryId) => {
            const reason = window.prompt('Why is this entry being reversed? The original stays on the ledger.');
            if (reason === null) return;
            if (!reason.trim()) {
              addToast('A reason is required to reverse an entry.', 'error');
              return;
            }
            await act(`/api/khata/${selectedRecord.id}/entries/${entryId}/reverse`, 'POST', {
              reason: reason.trim(),
            });
          }}
          onRecordPayment={() => setIsPaymentModalOpen(true)}
          onStatusChange={async (status) => {
            if (status === 'Closed') {
              const reason = window.prompt('Confirm closing this account. Reason?');
              if (reason === null || !reason.trim()) return;
              await act(`/api/khata/${selectedRecord.id}/status`, 'POST', {
                status: 'Closed',
                reason: reason.trim(),
              });
              return;
            }
            if (status === 'Suspended') {
              const reason = window.prompt('Why is this Khata being suspended?');
              if (reason === null || !reason.trim()) return;
              await act(`/api/khata/${selectedRecord.id}/status`, 'POST', {
                status: 'Suspended',
                reason: reason.trim(),
              });
              return;
            }
            await act(`/api/khata/${selectedRecord.id}/status`, 'POST', { status });
          }}
          onUpdateLimit={async (limit) => {
            await act(`/api/khata/${selectedRecord.id}`, 'PATCH', { creditLimit: limit });
          }}
        />
      )}
    </div>
  );
};

/* ------------------------------- payment modal ------------------------------ */

const PaymentModal: React.FC<{
  record: KhataAccount;
  busy: boolean;
  onClose: () => void;
  onSubmit: (amount: number, method: string, notes: string) => Promise<void>;
}> = ({ record, busy, onClose, onSubmit }) => {
  const [amount, setAmount] = useState(Math.min(5000, record.totalOutstanding || 5000));
  const [method, setMethod] = useState('Cash');
  const [notes, setNotes] = useState('');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md space-y-4 rounded-3xl bg-paper p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-4 top-4 text-ink-soft hover:text-ink" aria-label="Close">
          <X className="h-5 w-5" />
        </button>

        <div>
          <span className="rounded-md bg-pine-soft px-2 py-0.5 text-xs font-bold uppercase text-pine">
            Record payment
          </span>
          <h2 className="mt-1 text-lg text-ink">{record.customerName}</h2>
          <p className="text-xs text-ink-soft">
            Current outstanding: â‚¹{record.totalOutstanding.toLocaleString('en-IN')}
          </p>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void onSubmit(amount, method, notes);
          }}
          className="space-y-4 text-xs"
        >
          <label className="block">
            <span className="mb-1 block font-bold text-ink">Amount received (â‚¹)</span>
            <input
              type="number"
              required
              min={1}
              max={record.totalOutstanding}
              value={amount}
              onChange={(event) => setAmount(Number(event.target.value))}
              className="field text-base font-black"
            />
          </label>

          <label className="block">
            <span className="mb-1 block font-bold text-ink">Payment method</span>
            <select value={method} onChange={(event) => setMethod(event.target.value)} className="field">
              <option>Cash</option>
              <option>UPI</option>
              <option>Bank Transfer</option>
              <option>Other</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block font-bold text-ink">Note (optional)</span>
            <input
              type="text"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Settled against milk payment"
              className="field"
            />
          </label>

          <div className="flex justify-end gap-2 border-t border-line pt-2">
            <button type="button" onClick={onClose} className="btn btn-outline !py-2.5">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="btn btn-primary !px-6 !py-2.5 disabled:opacity-60">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Save payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ------------------------------ create modal ------------------------------- */

const CreateKhataModal: React.FC<{
  busy: boolean;
  onClose: () => void;
  onCreated: () => Promise<void> | void;
}> = ({ busy, onClose, onCreated }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CustomerSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<CustomerSearchResult | null>(null);
  const [phone, setPhone] = useState('');
  const [village, setVillage] = useState('');
  const [milkUnionId, setMilkUnionId] = useState('');
  const [creditLimit, setCreditLimit] = useState(10000);
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim() || selected) {
      setResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/khata/customers/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = (await res.json()) as { customers: CustomerSearchResult[] };
          setResults(data.customers);
        }
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query, selected]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setError(null);
    try {
      const res = await fetch('/api/khata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selected.id,
          phone,
          village: village || selected.village,
          milkUnionMemberId: milkUnionId || undefined,
          creditLimit,
          dueDate: dueDate || undefined,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setError(body.message ?? 'Could not create the Khata account.');
        return;
      }
      await onCreated();
    } catch {
      setError('Could not reach the server.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-3xl bg-paper p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-4 top-4 text-ink-soft hover:text-ink" aria-label="Close">
          <X className="h-5 w-5" />
        </button>

        <div>
          <span className="rounded-md bg-pine-soft px-2 py-0.5 text-xs font-bold uppercase text-pine">
            New Khata account
          </span>
          <h2 className="mt-1 text-lg text-ink">Create for an existing customer</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
            Search by name, email or Customer ID. The account links to the customer's
            existing sign-in â€” no second identity is created.
          </p>
        </div>

        {!selected ? (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Sunita, HT-CUS-10042, farmer@â€¦"
                className="field !pl-9"
              />
            </div>
            {searching && <p className="text-xs text-ink-soft">Searchingâ€¦</p>}
            {results.length === 0 && query.trim() && !searching && (
              <p className="rounded-xl border border-line bg-cream/60 p-3 text-xs text-ink-soft">
                No registered customer matches. They can create an account from the shop
                first â€” no email is needed to register.
              </p>
            )}
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {results.map((customer) => (
                <button
                  key={customer.id}
                  disabled={customer.hasKhata}
                  onClick={() => {
                    setSelected(customer);
                    setVillage(customer.village);
                  }}
                  className="flex w-full items-center justify-between rounded-xl border border-line bg-cream/60 p-3 text-left text-xs transition-colors hover:border-pine/40 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div>
                    <p className="font-bold text-ink">{customer.name}</p>
                    <p className="text-[11px] text-ink-soft">
                      {customer.customerCode}
                      {customer.email ? ` Â· ${customer.email}` : ''}
                      {customer.village ? ` Â· ${customer.village}` : ''}
                    </p>
                  </div>
                  {customer.hasKhata && (
                    <span className="rounded bg-cream px-2 py-0.5 text-[10px] font-bold text-ink-soft">
                      Has Khata
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3 text-xs">
            <div className="rounded-xl border border-pine/20 bg-pine-soft p-3">
              <p className="font-bold text-pine">{selected.name}</p>
              <p className="text-[11px] text-pine/70">
                {selected.customerCode}
                {selected.email ? ` Â· ${selected.email}` : ''}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setQuery('');
                }}
                className="mt-1 text-[11px] font-bold underline text-pine"
              >
                Choose a different customer
              </button>
            </div>

            <label className="block">
              <span className="mb-1 block font-bold text-ink">Phone</span>
              <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="field" />
            </label>
            <label className="block">
              <span className="mb-1 block font-bold text-ink">Village / town</span>
              <input type="text" value={village} onChange={(e) => setVillage(e.target.value)} className="field" />
            </label>
            <label className="block">
              <span className="mb-1 block font-bold text-ink">Milk union member ID (optional)</span>
              <input type="text" value={milkUnionId} onChange={(e) => setMilkUnionId(e.target.value)} className="field" />
            </label>
            <label className="block">
              <span className="mb-1 block font-bold text-ink">Credit limit (â‚¹)</span>
              <input
                type="number"
                min={0}
                required
                value={creditLimit}
                onChange={(e) => setCreditLimit(Number(e.target.value))}
                className="field text-base font-black"
              />
            </label>
            <label className="block">
              <span className="mb-1 block font-bold text-ink">Due date (optional)</span>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="field" />
            </label>

            {error && <p className="rounded-xl border border-clay/30 bg-clay/5 p-2.5 text-clay">{error}</p>}

            <div className="flex justify-end gap-2 border-t border-line pt-2">
              <button type="button" onClick={onClose} className="btn btn-outline !py-2.5">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="btn btn-primary !px-6 !py-2.5 disabled:opacity-60">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Create account
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

/* ----------------------------- ledger detail modal -------------------------- */

const LedgerDetailModal: React.FC<{
  record: KhataAccount;
  busy: boolean;
  onClose: () => void;
  onReverse: (entryId: string) => Promise<void>;
  onRecordPayment: () => void;
  onStatusChange: (status: 'Approved' | 'Suspended' | 'Closed') => Promise<void>;
  onUpdateLimit: (limit: number) => Promise<void>;
}> = ({ record, busy, onClose, onReverse, onRecordPayment, onStatusChange, onUpdateLimit }) => {
  const [limitDraft, setLimitDraft] = useState(record.totalCreditLimit);

  const txLabel = (tx: KhataTransaction): string => {
    if (tx.type === 'Adjustment') return tx.isDebit ? 'Adjustment (debit)' : 'Adjustment (credit)';
    return tx.type;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-3xl bg-paper p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-4 top-4 text-ink-soft hover:text-ink" aria-label="Close">
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLES[record.status] ?? ''}`}>
                {record.status}
              </span>
              <span className="text-[10px] font-bold uppercase text-ink-soft">{record.customerCode ?? record.id}</span>
            </div>
            <h2 className="mt-1 text-lg text-ink">{record.customerName}</h2>
            <p className="text-xs text-ink-soft">
              {record.village} Â· {record.phone}
              {record.customerEmail ? ` Â· ${record.customerEmail}` : ''}
            </p>
            {record.status === 'Rejected' && record.rejectionReason && (
              <p className="mt-1 text-[11px] text-clay">Rejected: {record.rejectionReason}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-right text-xs">
            <span className="text-ink-soft">Limit</span>
            <span className="font-bold text-ink">â‚¹{record.totalCreditLimit.toLocaleString('en-IN')}</span>
            <span className="text-ink-soft">Outstanding</span>
            <span className="font-bold text-clay">â‚¹{record.totalOutstanding.toLocaleString('en-IN')}</span>
            <span className="text-ink-soft">Available</span>
            <span className="font-bold text-pine">â‚¹{record.availableCredit.toLocaleString('en-IN')}</span>
            <span className="text-ink-soft">Purchases</span>
            <span className="font-bold text-ink">â‚¹{(record.purchaseTotal ?? 0).toLocaleString('en-IN')}</span>
            <span className="text-ink-soft">Payments</span>
            <span className="font-bold text-ink">â‚¹{(record.paidAmount ?? 0).toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(record.status === 'Approved' || record.status === 'Suspended') && (
            <button
              disabled={busy || record.totalOutstanding <= 0}
              onClick={onRecordPayment}
              className="btn btn-primary !px-3.5 !py-2 text-xs disabled:opacity-60"
            >
              <Wallet className="h-3.5 w-3.5" />
              Record payment
            </button>
          )}
          {record.status === 'Approved' && (
            <button
              disabled={busy}
              onClick={() => void onStatusChange('Suspended')}
              className="btn btn-outline !px-3 !py-2 text-xs disabled:opacity-60"
            >
              <PauseCircle className="h-3.5 w-3.5" />
              Suspend
            </button>
          )}
          {record.status === 'Suspended' && (
            <button
              disabled={busy}
              onClick={() => void onStatusChange('Approved')}
              className="btn btn-primary !px-3 !py-2 text-xs disabled:opacity-60"
            >
              <PlayCircle className="h-3.5 w-3.5" />
              Reactivate
            </button>
          )}
          {(record.status === 'Approved' || record.status === 'Suspended') && (
            <button
              disabled={busy}
              onClick={() => void onStatusChange('Closed')}
              className="btn btn-outline !px-3 !py-2 text-xs !border-clay/30 text-clay disabled:opacity-60"
              title="Only allowed once the balance is settled"
            >
              Close account
            </button>
          )}
        </div>

        {(record.status === 'Approved' || record.status === 'Suspended') && (
          <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-line bg-cream/60 p-3 text-xs">
            <label className="block">
              <span className="mb-1 block font-bold text-ink">Credit limit (â‚¹)</span>
              <input
                type="number"
                min={0}
                value={limitDraft}
                onChange={(event) => setLimitDraft(Number(event.target.value))}
                className="field w-36"
              />
            </label>
            <button
              disabled={busy || limitDraft === record.totalCreditLimit}
              onClick={() => void onUpdateLimit(limitDraft)}
              className="btn btn-outline !py-2 text-xs disabled:opacity-60"
            >
              Update limit
            </button>
          </div>
        )}

        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink">Transaction history</h3>
          <p className="mt-0.5 text-[11px] text-ink-soft">
            Entries are append-only. Mistakes are corrected with a reversing adjustment â€”
            nothing is ever edited or deleted.
          </p>
          <div className="mt-2 overflow-hidden rounded-2xl border border-line">
            {(record.transactions ?? []).length === 0 ? (
              <p className="p-4 text-xs text-ink-soft">No entries on this Khata yet.</p>
            ) : (
              <div className="divide-y divide-line">
                {(record.transactions ?? []).map((tx) => (
                  <div key={tx.id} className="flex items-start justify-between gap-3 p-3.5 text-xs">
                    <div>
                      <p className="font-bold text-ink">
                        {txLabel(tx)}
                        {tx.reversesEntryId ? ` of ${tx.reversesEntryId}` : ''}
                      </p>
                      <p className="text-ink-soft">{tx.notes}</p>
                      <p className="mt-0.5 text-[11px] text-ink-soft">
                        {tx.date}
                        {tx.orderNumber ? ` Â· ${tx.orderNumber}` : ''}
                        {tx.paymentMethod ? ` Â· ${tx.paymentMethod}` : ''}
                        {tx.recordedBy ? ` Â· by ${tx.recordedBy}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <p className={`font-bold ${tx.isDebit ? 'text-clay' : 'text-pine'}`}>
                        {tx.isDebit ? '+' : 'âˆ’'}â‚¹{tx.amount.toLocaleString('en-IN')}
                      </p>
                      {(tx.type === 'Purchase' || tx.type === 'Payment') && (
                        <button
                          disabled={busy}
                          onClick={() => void onReverse(tx.id)}
                          className="rounded border border-line p-1 text-ink-soft transition-colors hover:text-clay disabled:opacity-50"
                          title="Reverse this entry with an adjustment"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

