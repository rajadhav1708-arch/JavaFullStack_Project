import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { STORE } from '../../data/store';
import {
  Loader2,
  AlertCircle,
  ShieldCheck,
  ArrowLeft,
  Eye,
  EyeOff,
  Mail,
  CheckCircle2,
} from 'lucide-react';

type Mode = 'login' | 'register' | 'forgot' | 'reset';

async function postJson(
  path: string,
  body: unknown
): Promise<{ ok: boolean; message?: string; devResetUrl?: string }> {
  const response = await fetch(`/api/auth${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  });

  let payload: Record<string, unknown> = {};
  try {
    payload = await response.json();
  } catch {
    /* non-JSON error body */
  }

  if (!response.ok) {
    return {
      ok: false,
      message: typeof payload.message === 'string' ? payload.message : 'Something went wrong. Please try again.',
    };
  }
  return {
    ok: true,
    message: typeof payload.message === 'string' ? payload.message : undefined,
    devResetUrl: typeof payload.devResetUrl === 'string' ? payload.devResetUrl : undefined,
  };
}

export const LoginPage: React.FC = () => {
  const { login, register, isUnavailable, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Already signed in: send staff to the dashboard, everyone else back to the shop home.
  useEffect(() => {
    if (isLoading || !user) return;
    // A just-registered customer stays here to read their new Customer ID.
    if (justRegistered) return;
    const from = (location.state as { from?: string } | null)?.from;
    const target =
      from && from !== '/login'
        ? from
        : user.role === 'admin' || user.role === 'employee'
          ? '/admin-dashboard'
          : '/home';
    navigate(target, { replace: true });
  }, [isLoading, user, navigate, location.state]);

  const resetToken = searchParams.get('token') ?? '';
  const [mode, setMode] = useState<Mode>(resetToken ? 'reset' : 'login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [village, setVillage] = useState('');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  // Set right after a successful registration so the new permanent Customer ID
  // can be shown big enough to write down — many farmers will never see an email.
  const [justRegistered, setJustRegistered] = useState<null | { customerCode: string; name: string }>(null);

  const state = location.state as { from?: string; reason?: string } | null;
  const reason = state?.reason || '';
  const fromPath = state?.from || '/home';

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
    setDevResetUrl(null);
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isPending) return;

    setError(null);
    setNotice(null);
    setIsPending(true);

    try {
      if (mode === 'forgot') {
        const result = await postJson('/forgot-password', { email: identifier });
        if (!result.ok) {
          setError(result.message ?? 'Could not send a reset link.');
        } else {
          setNotice(result.message ?? 'If an account exists for that email, a reset link has been sent.');
          setDevResetUrl(result.devResetUrl ?? null);
        }
        return;
      }

      if (mode === 'reset') {
        if (password !== confirmPassword) {
          setError('The two passwords do not match.');
          return;
        }
        const result = await postJson('/reset-password', { token: resetToken, password });
        if (!result.ok) {
          setError(result.message ?? 'Could not reset the password.');
        } else {
          switchMode('login');
          setNotice('Password updated. You can sign in with the new password.');
        }
        return;
      }

      if (mode === 'login') {
        const failure = await login(identifier, password);
        if (failure) {
          setError(failure);
        } else {
          navigate(fromPath, { replace: true });
        }
      } else {
        const { failure, user: created } = await register({
          email: email.trim(),
          password,
          name,
          village,
        });
        if (failure || !created) {
          setError(failure ?? 'Could not create the account.');
        } else {
          // Do NOT navigate away: the customer needs to see and note down their
          // permanent Customer ID, which is how they will sign in from now on.
          setJustRegistered({ customerCode: created.customerCode, name: created.name });
        }
      }
    } catch {
      setError('Could not reach the server. Is the API running on port 3001?');
    } finally {
      setIsPending(false);
    }
  };

  const title =
    justRegistered
      ? 'Your account is ready'
      : mode === 'login'
        ? 'Sign in'
        : mode === 'register'
          ? 'Create your account'
          : mode === 'forgot'
            ? 'Reset your password'
            : 'Choose a new password';

  const subtitle =
    justRegistered
      ? `Welcome, ${justRegistered.name}. This is your permanent Customer ID — use it with your password to sign in any time.`
      : mode === 'login'
        ? 'Use your Customer ID or username. Your orders, Khata balance and invoices stay in one place.'
        : mode === 'register'
          ? 'No email needed. You will get a permanent Customer ID to sign in with.'
          : mode === 'forgot'
            ? 'Enter the email on your account and we will send a reset link.'
            : 'Pick a new password for your account.';

  return (
    <div className="min-h-[100dvh] bg-cream">
      <div className="mx-auto grid min-h-[100dvh] max-w-7xl lg:grid-cols-2">
        <aside className="relative hidden overflow-hidden bg-pine text-cream lg:flex lg:flex-col lg:justify-between">
          <img
            src="/images/login-bg.jpg"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
            onError={(event) => {
              (event.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-pine-deep/90 via-pine/70 to-pine-deep/80" />

          <div className="relative px-12 py-14">
            <Link to="/home" className="inline-flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cream p-1">
                <img src="/brand/hindavi-logo.png" alt="" className="h-full w-full object-contain" />
              </span>
              <span className="font-display text-xl font-semibold">{STORE.name}</span>
            </Link>

            <h2 className="mt-20 max-w-md font-display text-4xl leading-tight text-cream">
              The farm ledger, the feed bag and the invoice — finally in one place.
            </h2>
          </div>

          <div className="relative px-12 pb-14 text-xs text-cream/60">
            GST registered · Bidar, Karnataka · Cash, UPI and Khata
          </div>
        </aside>

        <section className="flex min-h-[100dvh] items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <button
              onClick={() => navigate('/home', { replace: true })}
              className="mb-6 flex items-center gap-2 text-xs font-semibold text-ink-soft transition-colors hover:text-pine"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to the shop
            </button>

            <div className="card p-6 sm:p-8">
              <div className="flex items-center gap-2.5 lg:hidden">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cream p-1 ring-1 ring-line">
                  <img src="/brand/hindavi-logo.png" alt="" className="h-full w-full object-contain" />
                </span>
                <span className="font-display text-lg font-semibold text-ink">{STORE.name}</span>
              </div>

              <h1 className="mt-4 text-2xl text-ink lg:mt-0">{title}</h1>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">{subtitle}</p>

              {(mode === 'login' || mode === 'register') && (
                <div className="mt-5 flex gap-1 rounded-full border border-line bg-cream p-1">
                  <button
                    onClick={() => switchMode('login')}
                    className={`flex-1 rounded-full py-2 text-xs font-bold transition-colors ${
                      mode === 'login' ? 'bg-pine text-cream' : 'text-ink-soft hover:text-ink'
                    }`}
                  >
                    Sign in
                  </button>
                  <button
                    onClick={() => switchMode('register')}
                    className={`flex-1 rounded-full py-2 text-xs font-bold transition-colors ${
                      mode === 'register' ? 'bg-pine text-cream' : 'text-ink-soft hover:text-ink'
                    }`}
                  >
                    Create account
                  </button>
                </div>
              )}

              {reason && (
                <Alert tone="amber" className="mt-5">
                  {reason}
                </Alert>
              )}

              {isUnavailable && (
                <Alert tone="neutral" className="mt-5">
                  Accounts are unavailable because the server has no <code className="font-bold">DATABASE_URL</code>.
                  Browsing, the ration quiz and the chatbot still work without an account.
                </Alert>
              )}

              {notice && (
                <div className="mt-5 flex items-start gap-2 rounded-xl border border-pine/20 bg-pine-soft p-3 text-xs text-pine">
                  <CheckCircle2 className="mt-px h-4 w-4 shrink-0" />
                  <span>
                    {notice}
                    {devResetUrl && (
                      <>
                        {' '}
                        <a href={devResetUrl} className="font-bold underline">
                          Open the development reset link
                        </a>
                      </>
                    )}
                  </span>
                </div>
              )}

              {justRegistered ? (
                <div className="mt-6 space-y-4 text-center">
                  <div className="rounded-2xl border-2 border-dashed border-pine/40 bg-pine-soft/60 p-6">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-pine">Your permanent Customer ID</p>
                    <p className="mt-2 font-mono text-2xl font-black tracking-wide text-pine sm:text-3xl">
                      {justRegistered.customerCode}
                    </p>
                    <p className="mt-3 text-xs leading-relaxed text-ink-soft">
                      Write this down and keep it safe. Sign in with this ID and your
                      password — no email needed. If you lose it, the shop can find it
                      from your name and phone number.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setJustRegistered(null);
                      setIdentifier(justRegistered.customerCode);
                      switchMode('login');
                    }}
                    className="btn btn-primary w-full !py-3"
                  >
                    Continue to sign in
                  </button>
                </div>
              ) : (
              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
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
                      autoComplete="address-level2"
                    />
                  </>
                )}

                {mode === 'login' && (
                  <Field
                    id="login-identifier"
                    label="Customer ID or username"
                    type="text"
                    value={identifier}
                    onChange={setIdentifier}
                    placeholder="HT-CUS-10001 or pratikgunjal"
                    autoComplete="username"
                    required
                  />
                )}

                {mode === 'forgot' && (
                  <Field
                    id="login-email"
                    label="Email on your account"
                    type="email"
                    value={identifier}
                    onChange={setIdentifier}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                )}

                {mode === 'register' && (
                  <Field
                    id="login-email"
                    label="Email (optional — only for password reset links)"
                    type="email"
                    value={email}
                    onChange={setEmail}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                )}

                {mode !== 'forgot' && (
                  <div>
                    <label htmlFor="login-password" className="mb-1.5 block text-xs font-bold text-ink">
                      {mode === 'reset'
                        ? 'New password'
                        : mode === 'register'
                          ? 'Password (8 characters minimum)'
                          : 'Password'}
                    </label>
                    <div className="relative">
                      <input
                        id="login-password"
                        name="login-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="••••••••"
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        minLength={mode === 'login' ? undefined : 8}
                        required
                        className="field pr-11"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((visible) => !visible)}
                        className="absolute right-3 top-2.5 text-ink-soft transition-colors hover:text-pine"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {mode === 'reset' && (
                  <div>
                    <label htmlFor="login-confirm" className="mb-1.5 block text-xs font-bold text-ink">
                      Confirm new password
                    </label>
                    <input
                      id="login-confirm"
                      name="login-confirm"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      minLength={8}
                      required
                      className="field"
                    />
                  </div>
                )}

                {error && (
                  <Alert tone="red">
                    {error}
                  </Alert>
                )}

                <button
                  type="submit"
                  disabled={isPending}
                  className="btn btn-primary w-full !py-3 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {mode === 'login'
                    ? 'Sign in'
                    : mode === 'register'
                      ? 'Create account'
                      : mode === 'forgot'
                        ? 'Send reset link'
                        : 'Update password'}
                </button>

                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="w-full text-center text-xs font-semibold text-ink-soft transition-colors hover:text-pine"
                  >
                    Forgot your password?
                  </button>
                )}

                {(mode === 'forgot' || mode === 'reset') && (
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="w-full text-center text-xs font-semibold text-ink-soft transition-colors hover:text-pine"
                  >
                    Back to sign in
                  </button>
                )}
              </form>
              )}

              {mode === 'login' && !justRegistered && (
                <p className="mt-4 flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-soft">
                  <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0 text-pine" />
                  Passwords are hashed with scrypt and never leave the server. Sessions use an httpOnly cookie.
                </p>
              )}

              </div>

            <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-ink-soft">
              <Mail className="h-3.5 w-3.5" />
              Trouble signing in? <a href={STORE.emailHref} className="font-semibold text-pine hover:underline">Email the store</a>
            </p>
          </div>
        </section>
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

const Field: React.FC<FieldProps> = ({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  required = false,
}) => (
  <div>
    <label htmlFor={id} className="mb-1.5 block text-xs font-bold text-ink">
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
      className="field"
    />
  </div>
);

const Alert: React.FC<{
  tone: 'amber' | 'red' | 'neutral';
  className?: string;
  children: React.ReactNode;
}> = ({ tone, className = '', children }) => {
  const tones = {
    amber: 'border-ochre/40 bg-ochre-soft text-[#7a4d12]',
    red: 'border-clay/30 bg-clay/5 text-clay',
    neutral: 'border-line bg-cream text-ink-soft',
  } as const;

  return (
    <div className={`flex items-start gap-2 rounded-xl border p-3 text-xs ${tones[tone]} ${className}`}>
      <AlertCircle className="mt-px h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
};
