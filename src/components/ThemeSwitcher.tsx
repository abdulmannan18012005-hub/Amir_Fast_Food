import React, { useState, useRef, useEffect } from 'react';

const THEMES = [
  { id: 'orange', color: '#f97316', hsl: '25 95% 53%', label: 'Orange' },
  { id: 'red', color: '#ef4444', hsl: '0 84% 60%', label: 'Red' },
  { id: 'green', color: '#22c55e', hsl: '142 72% 42%', label: 'Green' },
  { id: 'blue', color: '#3b82f6', hsl: '221 83% 53%', label: 'Blue' },
  { id: 'purple', color: '#a855f7', hsl: '271 91% 65%', label: 'Purple' },
];

export function ThemeSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTheme, setActiveTheme] = useState('orange');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const changeTheme = (themeId: string, hslString: string) => {
    setActiveTheme(themeId);
    document.documentElement.style.setProperty('--primary', hslString);
    document.documentElement.style.setProperty('--ring', hslString);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:bg-accent hover:text-accent-foreground h-9 w-9 rounded-xl"
        title="Change theme"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-palette"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"></circle><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"></circle><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"></circle><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"></circle><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"></path></svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-border/50 bg-card p-3 shadow-xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-200">
          <p className="text-sm font-medium text-muted-foreground mb-3 px-1">Theme color</p>
          <div className="flex flex-wrap gap-2">
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => changeTheme(theme.id, theme.hsl)}
                className={`h-8 w-8 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background ${activeTheme === theme.id ? 'ring-2 ring-white scale-110' : 'hover:scale-110'}`}
                style={{ backgroundColor: theme.color }}
                aria-label={`Set theme to ${theme.label}`}
                title={theme.label}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
