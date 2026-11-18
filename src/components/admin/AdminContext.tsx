import React, { createContext, useContext, useState, useEffect } from 'react';
import { initAudio, playKitchenDing } from '../../lib/sound';
import { Volume2, VolumeX, Check, X } from 'lucide-react';

export type AdminTheme = 'dark' | 'light';

interface AdminContextType {
  theme: AdminTheme;
  toggleTheme: () => void;
  soundEnabled: boolean;
  hasChosenSound: boolean;
  toggleSound: () => Promise<void>;
  confirmSoundChoice: (enabled: boolean) => void;
  playNotificationSound: () => void;
}

const AdminContext = createContext<AdminContextType | null>(null);

const STORAGE_THEME_KEY = 'admin_theme';
const STORAGE_SOUND_KEY = 'admin_sound_enabled';
const STORAGE_SOUND_CHOSEN_KEY = 'admin_sound_chosen';

export function AdminProvider({ children }: { children: React.ReactNode }) {
  // 1. Theme State (default: 'dark' to preserve Kitchen appearance, persistent across pages)
  const [theme, setTheme] = useState<AdminTheme>('dark');

  // 2. Sound State (persistent across all admin pages)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [hasChosenSound, setHasChosenSound] = useState<boolean>(true); // default true to avoid flash before mount

  useEffect(() => {
    // Read persisted theme
    const savedTheme = localStorage.getItem(STORAGE_THEME_KEY);
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme);
    } else {
      setTheme('dark');
    }

    // Read persisted sound preference
    const soundChosen = localStorage.getItem(STORAGE_SOUND_CHOSEN_KEY);
    const soundVal = localStorage.getItem(STORAGE_SOUND_KEY);
    
    if (soundChosen === 'true') {
      setHasChosenSound(true);
      setSoundEnabled(soundVal !== 'false');
    } else {
      setHasChosenSound(false);
      setSoundEnabled(soundVal !== 'false');
    }

    // Listen for cross-tab or cross-component theme changes
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_THEME_KEY && (e.newValue === 'light' || e.newValue === 'dark')) {
        setTheme(e.newValue);
      }
      if (e.key === STORAGE_SOUND_KEY) {
        setSoundEnabled(e.newValue !== 'false');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => {
      const nextTheme: AdminTheme = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(STORAGE_THEME_KEY, nextTheme);
      } catch {}
      return nextTheme;
    });
  };

  const confirmSoundChoice = (enabled: boolean) => {
    try {
      localStorage.setItem(STORAGE_SOUND_CHOSEN_KEY, 'true');
      localStorage.setItem(STORAGE_SOUND_KEY, enabled ? 'true' : 'false');
    } catch {}
    setHasChosenSound(true);
    setSoundEnabled(enabled);
    if (enabled) {
      initAudio();
      try {
        playKitchenDing();
      } catch {}
    }
  };

  const toggleSound = async () => {
    const nextState = !soundEnabled;
    try {
      localStorage.setItem(STORAGE_SOUND_CHOSEN_KEY, 'true');
      localStorage.setItem(STORAGE_SOUND_KEY, nextState ? 'true' : 'false');
    } catch {}
    setHasChosenSound(true);
    setSoundEnabled(nextState);

    if (nextState) {
      initAudio();
      try {
        playKitchenDing();
      } catch {}
    }
  };

  const playNotificationSound = () => {
    if (soundEnabled) {
      playKitchenDing();
    }
  };

  return (
    <AdminContext.Provider value={{
      theme,
      toggleTheme,
      soundEnabled,
      hasChosenSound,
      toggleSound,
      confirmSoundChoice,
      playNotificationSound
    }}>
      <div 
        data-admin-theme={theme}
        className={`min-h-[100dvh] transition-colors duration-200 ${
          theme === 'dark' 
            ? 'dark bg-slate-900 text-slate-100' 
            : 'bg-slate-50 text-slate-900'
        }`}
      >
        {/* Sound Permission Banner (Asked ONLY ONCE if not previously chosen) */}
        {!hasChosenSound && (
          <div 
            role="region" 
            aria-label="Sound permission banner"
            className="bg-primary/95 text-primary-foreground px-4 py-2.5 shadow-md flex items-center justify-between gap-3 text-xs sm:text-sm font-medium z-30 relative animate-in fade-in slide-in-from-top-2"
          >
            <div className="flex items-center gap-2">
              <Volume2 size={18} className="shrink-0 animate-pulse" />
              <span>Enable sound alerts for newly arriving orders in the admin panel?</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => confirmSoundChoice(true)}
                className="bg-white text-slate-900 hover:bg-slate-100 font-bold px-3 py-1 rounded-lg text-xs transition-colors flex items-center gap-1 shadow-sm"
              >
                <Check size={14} /> Enable Sound
              </button>
              <button
                type="button"
                onClick={() => confirmSoundChoice(false)}
                className="bg-white/20 hover:bg-white/30 text-white font-semibold px-2.5 py-1 rounded-lg text-xs transition-colors"
              >
                Mute
              </button>
            </div>
          </div>
        )}
        {children}
      </div>
    </AdminContext.Provider>
  );
}

export function useAdminContext(): AdminContextType {
  const ctx = useContext(AdminContext);
  if (!ctx) {
    // Safe fallback if used outside provider
    return {
      theme: 'dark',
      toggleTheme: () => {},
      soundEnabled: true,
      hasChosenSound: true,
      toggleSound: async () => {},
      confirmSoundChoice: () => {},
      playNotificationSound: () => {},
    };
  }
  return ctx;
}
