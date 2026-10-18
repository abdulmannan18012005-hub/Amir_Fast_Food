import React, { useState, useEffect } from 'react';
import { ChefHat } from 'lucide-react';
import { loginAdminFn } from '../../server/adminAuthApi';
import { getAdminToken, setAdminToken, clearAdminSession } from '../../lib/adminSession';
import { getErrorCode } from '../../lib/errors';

export function PinGate({ children, onUnlock }: { children: React.ReactNode, onUnlock?: () => void }) {
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Hydrate authentication state on client mount only to prevent SSR mismatch
    const token = getAdminToken();
    if (token) {
      setIsAuthenticated(true);
    }
    setIsReady(true);

    const onExpired = (e: any) => {
      setIsAuthenticated(false);
      setError(e.detail?.message || 'Your session has expired. Please enter the PIN again.');
    };
    window.addEventListener('adminSessionExpired', onExpired);
    return () => window.removeEventListener('adminSessionExpired', onExpired);
  }, []);

  useEffect(() => {
    if (isAuthenticated && onUnlock) onUnlock();
  }, [isAuthenticated, onUnlock]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await loginAdminFn({ data: { pin } });
      if (res.success && res.token) {
        setAdminToken(res.token);
        setIsAuthenticated(true);
      } else {
        setError(res.error || 'Incorrect PIN. Please try again.');
      }
    } catch (err: any) {
      const code = getErrorCode(err);
      if (code === 'auth') {
        setError(err.message || 'Incorrect PIN. Please try again.');
      } else if (code === 'rate_limited') {
        setError('Too many attempts. Please wait 15 minutes and try again.');
      } else {
        setError('Incorrect PIN. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isReady) {
    return (
      <div className="min-h-[100dvh] bg-slate-900 flex items-center justify-center p-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-[100dvh] bg-slate-900 flex flex-col items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-slate-800 p-8 rounded-2xl max-w-sm w-full text-center shadow-xl border border-slate-700">
          <ChefHat className="text-primary w-16 h-16 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-2">Admin Access</h1>
          <p className="text-slate-400 text-sm mb-6">Enter your secure PIN to continue.</p>
          
          {error && <div className="mb-4 text-red-400 bg-red-400/10 p-3 rounded-xl text-sm" role="alert">{error}</div>}
          
          <input 
            type="password" 
            value={pin}
            onChange={e => setPin(e.target.value)}
            placeholder="Enter PIN / Passphrase"
            maxLength={64}
            autoComplete="current-password"
            className="w-full bg-slate-900 border border-slate-700 text-white text-center text-lg rounded-xl py-3 mb-4 focus:outline-none focus:border-primary"
            autoFocus
            disabled={loading}
          />
          <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl disabled:opacity-50 transition-opacity">
            {loading ? 'Unlocking...' : 'Unlock'}
          </button>
        </form>
      </div>
    );
  }

  return <AdminErrorBoundary>{children}</AdminErrorBoundary>;
}

class AdminErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: any) {
    console.error("AdminErrorBoundary caught an error:", error, info);
    if (getErrorCode(error) === 'auth') {
      clearAdminSession();
    }
  }
  render() {
    if (this.state.hasError) {
      if (getErrorCode(this.state.error) === 'auth') {
        return null;
      }
      return (
        <div className="min-h-[100dvh] bg-slate-900 text-white flex flex-col items-center justify-center p-4">
          <div className="bg-slate-800 p-8 rounded-xl max-w-md text-center shadow-xl border border-slate-700">
            <h2 className="text-xl font-bold mb-4 text-red-400">Admin Panel Error</h2>
            <p className="mb-6 text-sm text-slate-300">An unexpected error occurred in the admin panel. Please reload the page.</p>
            <button onClick={() => window.location.reload()} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-bold hover:bg-primary/90">Reload</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
