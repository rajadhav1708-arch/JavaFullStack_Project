import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

type Theme = 'dark' | 'dim' | 'contrast';

function applyTheme(theme: Theme): void {
  const el = document.documentElement;
  el.classList.remove('theme-dark', 'theme-dim', 'theme-contrast');
  el.classList.add(`theme-${theme}`);
  window.localStorage.setItem('pashufeed_theme', theme);
}

/**
 * Shared account page for both dashboards. The owner and the farmer land here
 * from the "My Account" entry in the user dropdown.
 */
export const AccountPage: React.FC = () => {
  const { user, updateUser, openAuthModal, logout } = useAuth();
  const { language, setLanguage } = useLanguage();

  const [name, setName] = useState(user?.name ?? '');
  const [village, setVillage] = useState(user?.village ?? '');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>(
    () => (window.localStorage.getItem('pashufeed_theme') as Theme) || 'dark'
  );

  if (!user) {
    return (
      <div className="max-w-xl mx-auto p-10 text-center text-white">
        <p className="text-slate-300">Sign in to manage your account.</p>
        <button
          onClick={() => openAuthModal()}
          className="mt-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-6 py-3 rounded-2xl cursor-pointer"
        >
          Sign in
        </button>
      </div>
    );
  }

  const save = async (): Promise<void> => {
    setError(null);
    const res = await fetch('/api/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, village }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.message ?? 'Could not save.');
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    // Push the freshly-saved profile into the rest of the UI.
    updateUser((body as { user: typeof user }).user);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 text-white space-y-6">
      <h1 className="text-2xl sm:text-3xl font-black tracking-tight">My Account</h1>

      <section className="bg-slate-900/40 border border-slate-700/60 rounded-3xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Profile</h2>
        <label className="block text-xs text-slate-400">Full name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-slate-950/60 border border-slate-700 rounded-xl p-3 text-white text-sm font-semibold outline-none focus:border-emerald-500"
        />
        <label className="block text-xs text-slate-400">Village / Town</label>
        <input
          value={village}
          onChange={(e) => setVillage(e.target.value)}
          className="w-full bg-slate-950/60 border border-slate-700 rounded-xl p-3 text-white text-sm font-semibold outline-none focus:border-emerald-500"
        />
        <div className="flex items-center gap-3">
          <button onClick={save} className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-6 py-3 rounded-2xl cursor-pointer">
            Save changes
          </button>
          {saved && <span className="text-emerald-400 text-xs font-bold">Saved.</span>}
          {error && <span className="text-red-400 text-xs font-bold">{error}</span>}
        </div>
        <p className="text-[11px] text-slate-500">Role: {user.role} · {user.email}</p>
      </section>

      <section className="bg-slate-900/40 border border-slate-700/60 rounded-3xl p-6 space-y-3">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Appearance</h2>
        <p className="text-xs text-slate-400">Theme applies across the app and is remembered on this device.</p>
        <div className="flex gap-2">
          {(['dark', 'dim', 'contrast'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTheme(t); applyTheme(t); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                theme === t ? 'bg-emerald-700 border-emerald-500 text-white' : 'bg-slate-950/60 border-slate-700 text-slate-300'
              }`}
            >
              {t === 'dark' ? 'Dark' : t === 'dim' ? 'Dim' : 'High Contrast'}
            </button>
          ))}
        </div>
      </section>

      <section className="bg-slate-900/40 border border-slate-700/60 rounded-3xl p-6 space-y-3">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Language</h2>
        <div className="flex gap-2">
          {([['en', 'English'], ['hi', 'हिन्दी'], ['mr', 'मराठी']] as const).map(([code, label]) => (
            <button
              key={code}
              onClick={() => setLanguage(code)}
              className={`px-4 py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                language === code ? 'bg-emerald-700 border-emerald-500 text-white' : 'bg-slate-950/60 border-slate-700 text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <button
        onClick={() => void logout()}
        className="w-full bg-red-950/60 hover:bg-red-900/70 border border-red-500/40 text-red-300 font-bold text-xs py-3 rounded-2xl cursor-pointer"
      >
        Sign out
      </button>
    </div>
  );
};
