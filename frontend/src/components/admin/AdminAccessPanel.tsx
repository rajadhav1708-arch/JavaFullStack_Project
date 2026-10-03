import React, { useEffect, useState } from 'react';
import { Eye, Ban, ShieldCheck } from 'lucide-react';

interface VisitRow {
  ip: string;
  path: string;
  user_agent: string | null;
  created_at: string;
}

interface BlockedRow {
  ip: string;
  reason: string | null;
  created_at: string;
}

interface AccessData {
  totalVisits: number;
  visitsLast24h: number;
  recent: VisitRow[];
  blocked: BlockedRow[];
}

export const AdminAccessPanel: React.FC = () => {
  const [data, setData] = useState<AccessData | null>(null);
  const [blockIp, setBlockIp] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = async (): Promise<void> => {
    try {
      const res = await fetch('/api/admin/access');
      if (!res.ok) {
        setError('Could not load access stats (owner sign-in required).');
        return;
      }
      setData((await res.json()) as AccessData);
      setError(null);
    } catch {
      setError('Network error loading access stats.');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const block = async (): Promise<void> => {
    if (!blockIp.trim()) return;
    await fetch('/api/admin/block', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip: blockIp.trim(), reason: blockReason.trim() || 'Blocked by owner' }),
    });
    setBlockIp('');
    setBlockReason('');
    void load();
  };

  const unblock = async (ip: string): Promise<void> => {
    await fetch(`/api/admin/block/${encodeURIComponent(ip)}`, { method: 'DELETE' });
    void load();
  };

  if (error) {
    return <div className="bg-white p-6 rounded-3xl border border-slate-200 text-slate-700 text-sm">{error}</div>;
  }
  if (!data) {
    return <div className="bg-white p-6 rounded-3xl border border-slate-200 text-slate-500 text-sm animate-pulse">Loading access stats...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <Eye className="w-5 h-5 text-emerald-700" />
          Website Access & Visitor Traffic
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">Every API hit and page-load beacon is recorded with the visitor's IP.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Total recorded hits" value={data.totalVisits} />
        <StatCard label="Hits in last 24h" value={data.visitsLast24h} />
        <StatCard label="Blocked IPs" value={data.blocked.length} />
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <h3 className="font-bold text-slate-900 text-sm">Block an IP</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={blockIp}
            onChange={(e) => setBlockIp(e.target.value)}
            placeholder="e.g. 203.0.113.10"
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 text-xs font-semibold outline-none focus:border-emerald-600"
          />
          <input
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
            placeholder="Reason (optional)"
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 text-xs font-semibold outline-none focus:border-emerald-600"
          />
          <button onClick={block} className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer">
            <Ban className="w-4 h-4 inline mr-1" />
            Block
          </button>
        </div>
        {data.blocked.length > 0 && (
          <ul className="divide-y divide-slate-100 text-xs">
            {data.blocked.map((b) => (
              <li key={b.ip} className="py-2 flex items-center justify-between">
                <span className="font-mono text-slate-800">{b.ip} <span className="text-slate-400">— {b.reason ?? 'no reason'}</span></span>
                <button onClick={() => void unblock(b.ip)} className="text-emerald-700 font-bold cursor-pointer">Unblock</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          Recent visits
        </h3>
        <div className="divide-y divide-slate-100 text-xs max-h-80 overflow-y-auto">
          {data.recent.map((v, i) => (
            <div key={i} className="py-2 flex items-center justify-between gap-4">
              <span className="font-mono text-slate-800">{v.ip}</span>
              <span className="text-slate-500 truncate max-w-[40%]">{v.path}</span>
              <span className="text-slate-400">{new Date(v.created_at).toLocaleString('en-IN')}</span>
            </div>
          ))}
          {data.recent.length === 0 && <p className="text-slate-400 py-2">No visits recorded yet.</p>}
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
    <div className="text-2xl font-black text-slate-900">{value}</div>
    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mt-1">{label}</div>
  </div>
);
