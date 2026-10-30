import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useApp } from '../../context/AppContext';
import { User, MapPin, Languages, LogOut, Check } from 'lucide-react';

/**
 * Shared account page for both dashboards. The owner and the farmer land here
 * from the "My Account" entry in the user dropdown.
 */
export const AccountPage: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { setCurrentView } = useApp();

  const [name, setName] = useState(user?.name ?? '');
  const [village, setVillage] = useState(user?.village ?? '');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-sm text-ink-soft">Sign in to manage your account.</p>
        <button onClick={() => setCurrentView('home')} className="btn btn-primary mt-4">
          Go to the shop
        </button>
      </div>
    );
  }

  const save = async (): Promise<void> => {
    setError(null);
    if (!name.trim()) {
      setError('Name cannot be empty.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), village: village.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((body as { message?: string }).message ?? 'Could not save your changes.');
        return;
      }
      updateUser((body as { user: typeof user }).user);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिन्दी' },
    { code: 'mr', label: 'मराठी' },
  ] as const;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <div>
        <p className="eyebrow">Account</p>
        <h1 className="mt-2 text-2xl text-ink sm:text-3xl">My details</h1>
      </div>

      <section className="card space-y-4 p-6">
        <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
          <User className="h-4 w-4 text-pine" />
          Profile
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink-soft">Full name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} className="field" autoComplete="name" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink-soft">Village / town</span>
            <input value={village} onChange={(event) => setVillage(event.target.value)} className="field" autoComplete="address-level2" />
          </label>
          <div>
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink-soft">Customer ID (permanent)</span>
            <p className="field bg-cream/70 font-mono font-bold text-pine">{user.customerCode}</p>
          </div>
          <div className="sm:col-span-2">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink-soft">Email (optional)</span>
            <p className="field bg-cream/70 text-ink-soft">{user.email || 'Not set — used only for password reset links'}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => void save()} disabled={saving} className="btn btn-primary disabled:opacity-60">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {saved && (
            <span className="flex items-center gap-1 text-xs font-bold text-pine">
              <Check className="h-3.5 w-3.5" />
              Saved
            </span>
          )}
          {error && <span className="text-xs font-bold text-clay">{error}</span>}
        </div>

        <p className="flex items-center gap-1.5 border-t border-line pt-3 text-[11px] text-ink-soft">
          <MapPin className="h-3.5 w-3.5" />
          Signed in as {user.role} · {user.customerCode}{user.email ? ` · ${user.email}` : ''}
        </p>
      </section>

      <section className="card space-y-3 p-6">
        <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
          <Languages className="h-4 w-4 text-pine" />
          Language
        </h2>
        <p className="text-xs text-ink-soft">Labels across the shop are translated. Product names stay in English.</p>
        <div className="flex flex-wrap gap-2">
          {languages.map(({ code, label }) => (
            <button
              key={code}
              onClick={() => setLanguage(code)}
              className={`rounded-full border px-4 py-2 text-xs font-bold transition-colors ${
                language === code
                  ? 'border-pine bg-pine text-cream'
                  : 'border-line bg-cream/50 text-ink-soft hover:border-pine/40 hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <button onClick={() => void logout()} className="btn btn-outline w-full !border-clay/30 !py-3 text-clay hover:!bg-clay/5">
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </div>
  );
};
