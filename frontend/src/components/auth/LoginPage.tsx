import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2, AlertCircle, ShieldCheck, ArrowLeft } from 'lucide-react';
import { AntigravityParticles } from '../effects/AntigravityParticles';

type Mode = 'login' | 'register';

export const LoginPage: React.FC = () => {
  const { login, register, isUnavailable } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [village, setVillage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  // Get reason and return path from route state
  const state = location.state as { from?: string; reason?: string } | null;
  const reason = state?.reason || '';
  const fromPath = state?.from || '/home';

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
      if (failure) {
        setError(failure);
      } else {
        // Redirect to the page they came from, or home
        navigate(fromPath, { replace: true });
      }
    } catch {
      setError('Could not reach the server. Is the API running on port 3001?');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12 overflow-hidden">
      {/* Antigravity particle background */}
      <div className="absolute inset-0 z-0">
        <AntigravityParticles
          count={180}
          radius={140}
          strength={0.1}
          returnSpeed={0.015}
          friction={0.94}
          color="#10b981"
          size={1.2}
          sizeVariation={0.5}
          mouseInfluence={true}
          autoAnimate={true}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/40 to-slate-950/90" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <button
          onClick={() => navigate('/home', { replace: true })}
          className="mb-6 flex items-center gap-2 text-slate-300 hover:text-white transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span className="text-sm font-semibold">Back to home</span>
        </button>

        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-emerald-500/20 shadow-[0_0_120px_rgba(16,185,129,0.15)] overflow-hidden">
          <div className="p-6 pb-4">
            <h1 className="text-2xl font-black text-white">
              {mode === 'login' ? 'Sign in to PashuFeed' : 'Create your farmer account'}
            </h1>
            <p className="text-sm text-slate-300 mt-1">
              {mode === 'login'
                ? 'Your account keeps your orders, Khata balance and subscriptions.'
                : 'Free to join. Needed to check out and buy feed.'}
            </p>
          </div>

          {reason && (
            <div className="mx-6 mb-4 flex items-start gap-2 bg-amber-500/10 border border-amber-400/40 text-amber-100 text-xs rounded-xl p-3 backdrop-blur-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-px text-amber-400" />
              <span>{reason}</span>
            </div>
          )}

          {isUnavailable && (
            <div className="mx-6 mb-4 flex items-start gap-2 bg-white/5 border border-white/20 text-slate-200 text-xs rounded-xl p-3 backdrop-blur-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-px text-slate-300" />
              <span>
                Accounts are unavailable because the server has no <code className="font-bold">DATABASE_URL</code>.
                Browsing, the ration quiz and the chatbot still work without an account.
              </span>
            </div>
          )}

          <div className="px-6">
            <div className="flex gap-1 p-1 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10">
              <button
                onClick={() => switchMode('login')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer ${
                  mode === 'login' ? 'bg-white/90 text-emerald-700 shadow-lg' : 'text-slate-200 hover:text-white hover:bg-white/10'
                }`}
              >
                Sign in
              </button>
              <button
                onClick={() => switchMode('register')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer ${
                  mode === 'register' ? 'bg-white/90 text-emerald-700 shadow-lg' : 'text-slate-200 hover:text-white hover:bg-white/10'
                }`}
              >
                Create account
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {mode === 'register' && (
              <>
                <Field
                  id="login-name"
                  label="Full name"
                  type="text"
                  value={name}
                  onChange={setName}
                  placeholder="Sunita Jadhav"
                  autoComplete="name"
                  required
                />
                <Field
                  id="login-village"
                  label="Village / taluka (optional)"
                  type="text"
                  value={village}
                  onChange={setVillage}
                  placeholder="Hesheri, Kolhapur"
                />
              </>
            )}

            <Field
              id="login-email"
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
            <Field
              id="login-password"
              label={mode === 'register' ? 'Password (8 characters minimum)' : 'Password'}
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              required
            />

            {error && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-400/40 text-red-100 text-xs rounded-xl p-3 backdrop-blur-sm">
                <AlertCircle className="w-4 h-4 shrink-0 mt-px text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-bold py-3 rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-600/20 hover:shadow-emerald-500/30"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </button>

            <p className="text-[11px] text-slate-300 text-center leading-relaxed">
              Passwords are hashed with scrypt and never leave the server. Sessions use an httpOnly cookie.
            </p>
          </form>

          <div className="px-6 pb-6">
            <div className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-400/40 text-emerald-100 text-xs rounded-xl p-3 backdrop-blur-sm">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-px text-emerald-400" />
              <div>
                <div className="font-bold">Demo accounts</div>
                <div className="mt-0.5 font-mono text-[11px] text-emerald-50/90">
                  admin@pashufeed.test / Admin@12345
                  <br />
                  farmer@pashufeed.test / Farmer@12345
                </div>
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
  required?: boolean;
}

const Field: React.FC<FieldProps> = ({ id, label, type, value, onChange, placeholder, autoComplete, required = false }) => (
  <div>
    <label htmlFor={id} className="block text-xs font-bold text-slate-200 mb-1.5">
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
      required={required}
      className="w-full bg-white/5 backdrop-blur-sm border border-white/20 text-white text-sm rounded-xl px-3.5 py-2.5 outline-none placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 transition-shadow"
    />
  </div>
);
