import React, { useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { ChefHat, Lock, Download, Sun, Moon, Volume2, VolumeX } from 'lucide-react';
import { useAdminContext } from './AdminContext';

export function AdminNav() {
  const { theme, toggleTheme, soundEnabled, toggleSound } = useAdminContext();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running as PWA
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
    }

    // Check if iOS
    const ua = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) setIsIOS(true);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  const handleLock = () => {
    sessionStorage.removeItem('admin_session');
    window.location.reload();
  };

  const isDark = theme === 'dark';

  return (
    <div className={`p-4 flex justify-between items-center flex-wrap gap-2 transition-colors border-b ${
      isDark 
        ? 'bg-slate-900 border-slate-700 text-white' 
        : 'bg-white border-slate-200 text-slate-800 shadow-sm'
    }`}>
      <div className="flex gap-4 items-center flex-wrap">
        <div className="font-bold text-xl flex items-center gap-2 text-primary">
          <ChefHat /> Admin
        </div>
        <Link to="/admin/kitchen" className={`[&.active]:text-primary hover:text-primary transition-colors ${!isDark ? 'text-slate-600' : 'text-slate-300'}`}>Kitchen</Link>
        <Link to="/admin/menu" className={`[&.active]:text-primary hover:text-primary transition-colors ${!isDark ? 'text-slate-600' : 'text-slate-300'}`}>Menu</Link>
        <Link to="/admin/history" className={`[&.active]:text-primary hover:text-primary transition-colors ${!isDark ? 'text-slate-600' : 'text-slate-300'}`}>History</Link>
        <Link to="/admin/cancellations" className={`[&.active]:text-primary hover:text-primary transition-colors ${!isDark ? 'text-slate-600' : 'text-slate-300'}`}>Cancellations</Link>
        <Link to="/admin/feedback" className={`[&.active]:text-primary hover:text-primary transition-colors ${!isDark ? 'text-slate-600' : 'text-slate-300'}`}>Feedback</Link>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-3">
        {!isStandalone && deferredPrompt && (
          <button onClick={handleInstallClick} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-sm font-bold transition-colors">
            <Download size={16} /> Install App
          </button>
        )}
        {!isStandalone && !deferredPrompt && isIOS && (
          <span className="text-xs text-slate-400 max-w-[120px] text-right hidden sm:block">
            Share → Add to Home Screen to install
          </span>
        )}

        {/* 1. Sound Button (Immediately left of Theme) */}
        <button
          type="button"
          onClick={toggleSound}
          title={soundEnabled ? 'Mute Admin Sound' : 'Enable Admin Sound'}
          aria-label={soundEnabled ? 'Mute sound' : 'Enable sound'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            soundEnabled
              ? isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400'
                : 'bg-slate-100 hover:bg-slate-200 text-emerald-600 border border-slate-200'
              : isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-500 border border-slate-200'
          }`}
        >
          {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          <span className="hidden sm:inline">{soundEnabled ? 'Sound On' : 'Muted'}</span>
        </button>

        {/* 2. Theme Button (Immediately left of Lock) */}
        <button
          type="button"
          onClick={toggleTheme}
          title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
          aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            isDark
              ? 'bg-slate-800 hover:bg-slate-700 text-amber-300'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
          }`}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
          <span className="hidden sm:inline">{isDark ? 'Light' : 'Dark'}</span>
        </button>

        {/* 3. Lock Button */}
        <button 
          type="button"
          onClick={handleLock} 
          title="Lock Admin Session"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            isDark 
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' 
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
          }`}
        >
          <Lock size={16} /> <span className="hidden sm:inline">Lock</span>
        </button>
      </div>
    </div>
  );
}
