import React, { useState, useEffect } from 'react';
import { ChefHat } from 'lucide-react';
import { verifyAdminPinFn } from '../../server/adminAuthApi';
import { safeJson } from '../../lib/storage';

export function PinGate({ children, onUnlock }: { children: React.ReactNode, onUnlock?: () => void }) {
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return typeof window !== 'undefined' && sessionStorage.getItem('admin_pin') !== null;
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && onUnlock) onUnlock();
  }, [isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await verifyAdminPinFn({ data: { pin } });
      if (res.success) {
        sessionStorage.setItem('admin_pin', pin);
        setIsAuthenticated(true);
      } else {
        setError(res.error || 'Invalid PIN');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid PIN');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-slate-800 p-8 rounded-2xl max-w-sm w-full text-center shadow-xl border border-slate-700">
          <ChefHat className="text-primary w-16 h-16 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-2">Admin Access</h1>
          <p className="text-slate-400 text-sm mb-6">Enter your secure PIN to continue.</p>
          
          {error && <div className="mb-4 text-red-400 bg-red-400/10 p-3 rounded-xl text-sm">{error}</div>}
          
          <input 
            type="password" 
            value={pin}
            onChange={e => setPin(e.target.value)}
            placeholder="Enter PIN"
            className="w-full bg-slate-900 border border-slate-700 text-white text-center text-xl tracking-[0.5em] rounded-xl py-3 mb-4 focus:outline-none focus:border-primary"
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

  return <>{children}</>;
}
