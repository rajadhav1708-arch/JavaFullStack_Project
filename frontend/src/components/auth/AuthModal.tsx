import React, { useState } from 'react';
import { X, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

type Mode = 'login' | 'register';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, authModalReason, closeAuthModal, login, register, isUnavailable } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [village, setVillage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  if (!isAuthModalOpen) return null;

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isPending) return;

    setError(null);
    setIsPending(true);
    try {
      const failure =
        mode === 'login'
          ? await login(email, password)
          : await register({ email, password, name, village });
      if (failure) setError(failure);
    } catch {
      setError('Could not reach the server. Is the API running on port 3001?');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeAuthModal} />

      <div className="relative w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between p-6 pb-4">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              {mode === 'login' ? 'Sign in to PashuFeed' : 'Create your farmer account'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {mode === 'login'
                ? 'Your account keeps your orders, Khata balance and subscriptions.'
                : 'Free to join. Needed to check out and buy feed.'}
            </p>
          </div>
          <button
            onClick={closeAuthModal}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {authModalReason && (
          <div className="mx-6 mb-4 flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl p-3">
            <AlertCircle className="w-4 h-4 shrink-0 mt-px text-amber-600" />
            <span>{authModalReason}</span>
          </div>
        )}

        {isUnavailable && (
          <div className="mx-6 mb-4 flex items-start gap-2 bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl p-3">
            <AlertCircle className="w-4 h-4 shrink-0 mt-px text-slate-500" />
            <span>
              Accounts are unavailable because the server has no <code className="font-bold">DATABASE_URL</code>.
              Browsing, the ration quiz and the chatbot still work without an account.
            </span>
          </div>
        )}

        <div className="px-6">
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => switchMode('login')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                mode === 'login' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign in
            </button>
            <button
              onClick={() => switchMode('register')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                mode === 'register' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Create account
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-3">
          {mode === 'register' && (
            <>
              <Field
                id="auth-name"
                label="Full name"
                type="text"
                value={name}
                onChange={setName}
                placeholder="Sunita Jadhav"
                autoComplete="name"
              />
              <Field
                id="auth-village"
                label="Village / taluka (optional)"
                type="text"
                value={village}
                onChange={setVillage}
                placeholder="Hesheri, Kolhapur"
              />
            </>
          )}

          <Field
            id="auth-email"
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            autoComplete="email"
          />
          <Field
            id="auth-password"
            label={mode === 'register' ? 'Password (8 characters minimum)' : 'Password'}
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          />

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl p-3">
              <AlertCircle className="w-4 h-4 shrink-0 mt-px text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-bold py-3 rounded-xl transition-colors cursor-pointer"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </button>

          <p className="text-[11px] text-slate-400 text-center leading-relaxed">
            Passwords are hashed with scrypt and never leave the server. Sessions use an httpOnly cookie.
          </p>
        </form>

        <div className="px-6 pb-6">
          <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl p-3">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-px text-emerald-600" />
            <div>
              <div className="font-bold">Demo accounts</div>
              <div className="mt-0.5 font-mono text-[11px]">
                admin@pashufeed.test / Admin@12345
                <br />
                farmer@pashufeed.test / Farmer@12345
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface FieldProps {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
}

const Field: React.FC<FieldProps> = ({ id, label, type, value, onChange, placeholder, autoComplete }) => (
  <div>
    <label htmlFor={id} className="block text-xs font-bold text-slate-700 mb-1.5">
      {label}
    </label>
    <input
      id={id}
      name={id}
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl px-3.5 py-2.5 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-shadow"
    />
  </div>
);