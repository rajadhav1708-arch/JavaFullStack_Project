import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthUser } from '../types';
import { useNavigate, useLocation } from 'react-router-dom';

interface AuthContextType {
  user: AuthUser | null;
  /** True until the initial GET /api/auth/me settles, so the header can avoid a login flash. */
  isLoading: boolean;
  /** True when the API reported DB_DISABLED, i.e. accounts cannot be used at all. */
  isUnavailable: boolean;
  csrfToken: string | null;
  /** Set the CSRF token from the server endpoint. */
  setCsrfToken: (token: string | null) => void;
  login: (identifier: string, password: string) => Promise<string | null>;
  /** Returns null on success, else the server's message. Email is optional. */
  register: (input: {
    email?: string;
    username?: string;
    password: string;
    name: string;
    village?: string;
  }) => Promise<{ failure: string | null; user: AuthUser | null }>;
  logout: () => Promise<void>;
  /** Replaces the current user after a profile update (name, village, ...). */
  updateUser: (u: AuthUser | null) => void;
  /** Redirect to login page with return path. */
  redirectToLogin: (reason?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Status codes that mean "the database is not set up", not "you did something wrong". */
const UNAVAILABLE_CODES = new Set(['DB_DISABLED']);

interface ApiError {
  code: number;
  message: string;
  unavailable: boolean;
}

async function postAuth(path: string, body: unknown, csrfToken: string | null): Promise<{ user: AuthUser } | ApiError> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }
  const response = await fetch(`/api/auth${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    credentials: 'same-origin',
  });

  let payload: Record<string, unknown> = {};
  try {
    payload = await response.json();
  } catch {
    /* non-JSON error body */
  }

  if (!response.ok) {
    return {
      code: response.status,
      message: typeof payload.message === 'string' ? payload.message : 'Something went wrong.',
      unavailable: UNAVAILABLE_CODES.has(String(payload.error)),
    };
  }
  return { user: payload.user as AuthUser };
}

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  // Fetch CSRF token on mount
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch('/api/csrf-token', { credentials: 'same-origin' });
        if (response.ok) {
          const data = await response.json();
          if (!cancelled) setCsrfToken(data.csrfToken);
        }
      } catch {
        /* offline: no CSRF token */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Restore the session from the httpOnly cookie on first paint.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch('/api/auth/me', { credentials: 'same-origin' });
        if (response.ok) {
          const payload = await response.json();
          if (!cancelled) setUser(payload.user as AuthUser);
        } else if (response.status === 503) {
          if (!cancelled) setIsUnavailable(true);
        }
      } catch {
        /* offline: treat as signed out */
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const redirectToLogin = useCallback((reason = '') => {
    const from = location.pathname + location.search;
    navigate('/login', { state: { from, reason }, replace: true });
  }, [navigate, location]);

  const login = useCallback(async (identifier: string, password: string) => {
    const result = await postAuth('/login', { identifier, password }, csrfToken);
    if ('code' in result) {
      if (result.unavailable) setIsUnavailable(true);
      return result.message;
    }
    setUser(result.user);
    return null;
  }, [csrfToken]);

  const register = useCallback(
    async (input: { email?: string; password: string; name: string; village?: string }) => {
      const result = await postAuth('/register', input, csrfToken);
      if ('code' in result) {
        if (result.unavailable) setIsUnavailable(true);
        return { failure: result.message, user: null };
      }
      setUser(result.user);
      return { failure: null, user: result.user };
    },
    [csrfToken]
  );

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } catch {
      /* clearing local state below is enough */
    }
    setUser(null);
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isLoading,
      isUnavailable,
      csrfToken,
      setCsrfToken,
      login,
      register,
      logout,
      updateUser: (u) => setUser(u),
      redirectToLogin,
    }),
    [user, isLoading, isUnavailable, csrfToken, login, register, logout, redirectToLogin]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const AuthProviderWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthProvider>{children}</AuthProvider>
);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}