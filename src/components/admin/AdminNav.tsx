import React, { useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { ChefHat, ClipboardList, Clock, Lock, Download } from 'lucide-react';

export function AdminNav() {
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
    sessionStorage.removeItem('admin_pin');
    window.location.reload();
  };

  return (
    <div className="bg-slate-900 border-b border-slate-700 text-white p-4 flex justify-between items-center flex-wrap gap-2">
      <div className="flex gap-4 items-center">
        <div className="font-bold text-xl flex items-center gap-2 text-primary">
          <ChefHat /> Admin
        </div>
        <Link to="/admin/kitchen" className="[&.active]:text-primary hover:text-primary transition-colors">Kitchen</Link>
        <Link to="/admin/menu" className="[&.active]:text-primary hover:text-primary transition-colors">Menu</Link>
        <Link to="/admin/history" className="[&.active]:text-primary hover:text-primary transition-colors">History</Link>
      </div>
      
      <div className="flex items-center gap-3">
        {!isStandalone && deferredPrompt && (
          <button onClick={handleInstallClick} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded text-sm font-bold transition-colors">
            <Download size={16} /> Install App
          </button>
        )}
        {!isStandalone && !deferredPrompt && isIOS && (
          <span className="text-xs text-slate-400 max-w-[120px] text-right hidden sm:block">
            Share → Add to Home Screen to install
          </span>
        )}
        <button onClick={handleLock} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded text-sm transition-colors">
          <Lock size={16} /> Lock
        </button>
      </div>
    </div>
  );
}
