import React, { useState, useEffect, useRef } from 'react';
import { Download, Share, X, Check, Smartphone } from 'lucide-react';

const DISMISS_KEY = 'pwa_install_dismissed_until';
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function CustomerInstallPrompt() {
  const [isOpen, setIsOpen] = useState(false);
  const [platform, setPlatform] = useState<'android' | 'ios' | 'desktop' | null>(null);
  const [hasPrompt, setHasPrompt] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Don't show on admin routes
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) return;

    // Check if already running as standalone PWA
    const isStandalone = typeof window !== 'undefined' && (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      (document.referrer && document.referrer.includes('android-app://'))
    );
    if (isStandalone) return;

    // Check snooze dismissal
    try {
      const dismissedUntil = Number(localStorage.getItem(DISMISS_KEY)) || 0;
      if (Date.now() < dismissedUntil) return;
    } catch {}

    // Detect platform
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
    const isIos = /iphone|ipad|ipod/.test(ua);
    const isAndroid = /android/.test(ua);
    const isMobile = isIos || isAndroid || /mobile/i.test(ua);
    setPlatform(isIos ? 'ios' : isAndroid ? 'android' : 'desktop');

    // Listen for beforeinstallprompt (Android/Chromium)
    const handlePromptReady = () => {
      if ((window as any).__deferredPwaPrompt) {
        setHasPrompt(true);
      }
    };
    if ((window as any).__deferredPwaPrompt) {
      setHasPrompt(true);
    }
    window.addEventListener('pwaPromptReady', handlePromptReady);

    // Show on first visit after hydration (small delay for page to load)
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 2500);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('pwaPromptReady', handlePromptReady);
    };
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + SNOOZE_MS));
    } catch {}
    setIsOpen(false);
  };

  const handleInstallClick = async () => {
    const prompt = (window as any).__deferredPwaPrompt;
    if (prompt) {
      prompt.prompt();
      try {
        const choice = await prompt.userChoice;
        if (choice.outcome === 'accepted') {
          (window as any).__deferredPwaPrompt = null;
          setIsOpen(false);
        } else {
          handleDismiss();
        }
      } catch {
        setIsOpen(false);
      }
    } else {
      handleDismiss();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 z-[75] animate-in fade-in duration-200"
        onClick={handleDismiss}
        aria-hidden="true"
      />

      {/* Modal / Bottom Sheet */}
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-title"
        className="fixed inset-x-3 bottom-3 md:bottom-6 md:right-6 md:left-auto md:w-[400px] z-[80] bg-card text-card-foreground border border-border shadow-2xl rounded-3xl p-5 overflow-hidden animate-in slide-in-from-bottom duration-300 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]"
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow-md shadow-primary/20 shrink-0">
              <Smartphone size={24} />
            </div>
            <div>
              <h2 id="install-title" className="font-bold text-base text-foreground leading-tight">
                Install Amir Fast Food
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Fast 1-tap ordering &amp; live delivery updates
              </p>
            </div>
          </div>
          <button 
            ref={closeBtnRef}
            onClick={handleDismiss}
            aria-label="Close install prompt"
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-accent transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {platform === 'ios' ? (
          <div className="bg-accent/40 rounded-2xl p-3.5 border border-border/60 text-xs text-foreground space-y-2 mb-4">
            <p className="font-semibold text-foreground">To add to your iPhone / iPad:</p>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-[11px] shrink-0">1</span>
              <span>Tap the <strong className="text-foreground">Share</strong> icon <Share className="inline w-3.5 h-3.5 text-primary mx-0.5" /> in Safari's bottom toolbar</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-[11px] shrink-0">2</span>
              <span>Scroll down and select <strong className="text-foreground">Add to Home Screen</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-[11px] shrink-0">3</span>
              <span>Tap <strong className="text-foreground">Add</strong> in the top right</span>
            </div>
          </div>
        ) : platform === 'android' && hasPrompt ? (
          <div className="bg-accent/40 rounded-2xl p-3 border border-border/60 text-xs text-muted-foreground mb-4">
            Add Amir Fast Food to your home screen for quick 1-tap ordering and real-time order tracking.
          </div>
        ) : (
          <div className="bg-accent/40 rounded-2xl p-3 border border-border/60 text-xs text-muted-foreground mb-4">
            Tap your browser menu (<strong className="text-foreground">⋮</strong> or <strong className="text-foreground">⋯</strong>) and select <strong className="text-foreground">Add to Home screen</strong> or <strong className="text-foreground">Install App</strong>.
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-accent text-foreground hover:bg-accent/80 transition-colors"
          >
            Not now
          </button>

          {platform === 'android' && hasPrompt ? (
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-primary/20"
            >
              <Download size={14} /> Install Now
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDismiss}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-primary/20"
            >
              <Check size={14} /> Got it
            </button>
          )}
        </div>
      </div>
    </>
  );
}
