import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { STORE } from '../../data/store';
import { BookOpen, Clock, XCircle, PauseCircle, ShieldCheck, Loader2 } from 'lucide-react';

/**
 * The farmer's own Khata tab: request an account, watch the request status,
 * and once approved see the live balance and transaction history. Everything
 * here is read-only against the customer's own ledger — approving, limits and
 * payments live in the admin dashboard and are enforced by the server.
 */
export const MyKhataTab: React.FC = () => {
  const { khataRecords, fetchKhata, addToast } = useApp();
  const { user } = useAuth();

  const myKhata = khataRecords.find(
    (record) => user != null && record.customerId === `user-${user.id}`
  );

  const [showRequest, setShowRequest] = useState(false);
  const [phone, setPhone] = useState('');
  const [village, setVillage] = useState(user?.village ?? '');
  const [requestedLimit, setRequestedLimit] = useState(5000);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/khata/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, village, requestedLimit, consent }),
      });
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setError(body.message ?? 'Could not submit the request.');
        return;
      }
      setShowRequest(false);
      addToast(body.message ?? 'Khata request submitted.', 'success');
      await fetchKhata();
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ------------------------------ no account yet ----------------------------- */
  if (!myKhata) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-cream/50 px-6 py-10 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pine-soft text-pine">
            <BookOpen className="h-5 w-5" />
          </span>
          <h3 className="mt-3 text-base font-semibold text-ink">No Khata account yet</h3>
          <p className="mt-1 max-w-sm text-xs leading-relaxed text-ink-soft">
            Request a Khata account here, or ask at the shop counter. The shop reviews
            every request and sets the credit limit.
          </p>
          <button onClick={() => setShowRequest(true)} className="btn btn-primary mt-4 !px-4 !py-2 text-xs">
            Request Khata account
          </button>
        </div>

        {showRequest && (
          <RequestModal
            phone={phone}
            setPhone={setPhone}
            village={village}
            setVillage={setVillage}
            requestedLimit={requestedLimit}
            setRequestedLimit={setRequestedLimit}
            consent={consent}
            setConsent={setConsent}
            submitting={submitting}
            error={error}
            onSubmit={submitRequest}
            onClose={() => {
              setShowRequest(false);
              setError(null);
            }}
          />
        )}
      </div>
    );
  }

  /* ------------------------------- not approved ------------------------------ */
  if (myKhata.status !== 'Approved') {
    const banners: Record<string, { icon: React.ComponentType<{ className?: string }>; title: string; body: string; tone: string }> = {
      Pending: {
        icon: Clock,
        title: 'Request under review',
        body: 'Your Khata request has been received. The shop will review it — you can buy on credit once it is approved.',
        tone: 'ochre',
      },
      Rejected: {
        icon: XCircle,
        title: 'Request not approved',
        body: myKhata.rejectionReason
          ? `The shop could not open a Khata for you. Reason: ${myKhata.rejectionReason}. You can request again or speak to the shop.`
          : 'The shop could not open a Khata for you at this time. You can request again or speak to the shop.',
        tone: 'clay',
      },
      Suspended: {
        icon: PauseCircle,
        title: 'Khata temporarily suspended',
        body: 'Credit on this Khata is paused. Please settle the balance or speak to the shop to reactivate it.',
        tone: 'clay',
      },
      Closed: {
        icon: XCircle,
        title: 'Khata closed',
        body: 'This Khata account has been closed. Please speak to the shop if you need a new one.',
        tone: 'ink',
      },
    };
    const banner = banners[myKhata.status] ?? banners.Pending;
    const BannerIcon = banner.icon;

    return (
      <div className="space-y-4">
        <div
          className={`flex items-start gap-3 rounded-2xl border p-4 text-xs ${
            banner.tone === 'ochre'
              ? 'border-ochre/40 bg-ochre-soft text-[#7a4d12]'
              : banner.tone === 'clay'
                ? 'border-clay/30 bg-clay/5 text-clay'
                : 'border-line bg-cream text-ink-soft'
          }`}
        >
          <BannerIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-bold">{banner.title}</p>
            <p className="mt-1 leading-relaxed">{banner.body}</p>
            {myKhata.decidedAt && <p className="mt-1 text-[11px] opacity-70">Updated {myKhata.decidedAt}</p>}
          </div>
        </div>

        {myKhata.status === 'Rejected' && (
          <button onClick={() => setShowRequest(true)} className="btn btn-outline !px-4 !py-2 text-xs">
            Request again
          </button>
        )}

        {showRequest && (
          <RequestModal
            phone={phone}
            setPhone={setPhone}
            village={village}
            setVillage={setVillage}
            requestedLimit={requestedLimit}
            setRequestedLimit={setRequestedLimit}
            consent={consent}
            setConsent={setConsent}
            submitting={submitting}
            error={error}
            onSubmit={submitRequest}
            onClose={() => {
              setShowRequest(false);
              setError(null);
            }}
          />
        )}
      </div>
    );
  }

  /* --------------------------------- approved -------------------------------- */
  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-pine/20 bg-pine-soft p-4 text-xs sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-bold text-pine">
            Credit limit ₹{myKhata.totalCreditLimit.toLocaleString('en-IN')}
          </p>
          <p className="mt-0.5 text-pine/70">
            Available credit ₹{myKhata.availableCredit.toLocaleString('en-IN')}
            {myKhata.dueDate ? ` · Due ${myKhata.dueDate}` : ''}
          </p>
        </div>
        <div className="sm:text-right">
          <p className="font-semibold text-ink-soft">Outstanding due</p>
          <p className="font-display text-xl font-semibold text-clay">
            ₹{myKhata.totalOutstanding.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-cream/60 p-3">
          <p className="text-ink-soft">Purchases on credit</p>
          <p className="mt-1 font-display text-base font-semibold text-clay">
            ₹{(myKhata.purchaseTotal ?? 0).toLocaleString('en-IN')}
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-cream/60 p-3">
          <p className="text-ink-soft">Payments made</p>
          <p className="mt-1 font-display text-base font-semibold text-pine">
            ₹{(myKhata.paidAmount ?? 0).toLocaleString('en-IN')}
          </p>
        </div>
        <div className="col-span-2 rounded-2xl border border-line bg-cream/60 p-3 sm:col-span-1">
          <p className="text-ink-soft">Payment standing</p>
          <p className="mt-1 font-bold text-ink">{myKhata.paymentStatus}</p>
        </div>
      </div>

      <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink">Transaction log</h2>
      <div className="overflow-hidden rounded-2xl border border-line">
        {myKhata.transactions.length === 0 ? (
          <p className="p-4 text-xs text-ink-soft">No entries on this Khata yet.</p>
        ) : (
          <div className="divide-y divide-line">
            {myKhata.transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-3.5 text-xs">
                <div>
                  <p className="font-bold text-ink">{tx.notes}</p>
                  <p className="text-[11px] text-ink-soft">
                    {tx.date}
                    {tx.orderNumber ? ` · ${tx.orderNumber}` : ''}
                    {tx.paymentMethod ? ` · ${tx.paymentMethod}` : ''}
                  </p>
                </div>
                <p className={`font-bold ${tx.isDebit ? 'text-clay' : 'text-pine'}`}>
                  {tx.isDebit ? '+' : '−'}₹{tx.amount.toLocaleString('en-IN')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-soft">
        <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0 text-pine" />
        Purchases increase what you owe; payments reduce it. The shop records every entry —
        contact them on {STORE.phone} if something looks wrong.
      </p>
    </div>
  );
};

/* ------------------------------- request modal ------------------------------- */

const RequestModal: React.FC<{
  phone: string;
  setPhone: (v: string) => void;
  village: string;
  setVillage: (v: string) => void;
  requestedLimit: number;
  setRequestedLimit: (v: number) => void;
  consent: boolean;
  setConsent: (v: boolean) => void;
  submitting: boolean;
  error: string | null;
  onSubmit: (event: React.FormEvent) => void;
  onClose: () => void;
}> = ({ phone, setPhone, village, setVillage, requestedLimit, setRequestedLimit, consent, setConsent, submitting, error, onSubmit, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm" onClick={onClose}>
    <div
      className="relative w-full max-w-md space-y-4 rounded-3xl bg-paper p-6 shadow-2xl"
      onClick={(event) => event.stopPropagation()}
    >
      <button onClick={onClose} className="absolute right-4 top-4 text-ink-soft hover:text-ink" aria-label="Close">
        <XCircle className="h-5 w-5" />
      </button>

      <div>
        <span className="rounded-md bg-pine-soft px-2 py-0.5 text-xs font-bold uppercase text-pine">
          Request Khata
        </span>
        <h2 className="mt-1 text-lg text-ink">Apply for a credit account</h2>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
          The shop reviews every request. You can buy on credit once it is approved.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3 text-xs">
        <label className="block">
          <span className="mb-1 block font-bold text-ink">Phone number</span>
          <input
            type="tel"
            required
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="98765 43210"
            className="field"
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-bold text-ink">Village / town</span>
          <input
            type="text"
            required
            value={village}
            onChange={(event) => setVillage(event.target.value)}
            className="field"
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-bold text-ink">Requested credit limit (₹)</span>
          <input
            type="number"
            min={0}
            value={requestedLimit}
            onChange={(event) => setRequestedLimit(Number(event.target.value))}
            className="field"
          />
          <span className="mt-1 block text-[11px] text-ink-soft">
            The shop decides the final limit — this is only a request.
          </span>
        </label>
        <label className="flex items-start gap-2 rounded-xl border border-line bg-cream/60 p-3">
          <input
            type="checkbox"
            required
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            className="mt-0.5"
          />
          <span className="leading-relaxed">
            I understand that feed bought on Khata must be repaid to the shop by the due date,
            and that the shop may suspend credit if payments are late.
          </span>
        </label>

        {error && <p className="rounded-xl border border-clay/30 bg-clay/5 p-2.5 text-clay">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-line pt-2">
          <button type="button" onClick={onClose} className="btn btn-outline !py-2.5">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn btn-primary !px-6 !py-2.5 disabled:opacity-60">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit request
          </button>
        </div>
      </form>
    </div>
  </div>
);
