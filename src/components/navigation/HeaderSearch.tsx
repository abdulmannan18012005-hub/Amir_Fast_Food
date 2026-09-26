import React, { useState, useEffect, useRef } from 'react';
import { searchMenuItems } from '../server/menu';
import type { MenuItem } from '../types';

export function HeaderSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MenuItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchMenuItems({ data: query });
        setResults(res || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative flex items-center" ref={containerRef}>
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 hover:bg-accent hover:text-accent-foreground h-9 w-9 rounded-xl"
          aria-label="Search menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
        </button>
      ) : (
        <div className="flex items-center w-48 sm:w-64 animate-in fade-in slide-in-from-right-4 duration-200">
          <div className="relative w-full">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-2.5 top-2.5 text-muted-foreground"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
            <input
              type="text"
              autoFocus
              placeholder="Search burgers, deals..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-accent/50 border border-border rounded-full pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            />
            <button 
              onClick={() => { setIsOpen(false); setQuery(''); }}
              className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
            </button>
          </div>
        </div>
      )}

      {isOpen && query.trim() !== '' && (
        <div className="absolute right-0 top-full mt-3 w-72 max-h-96 overflow-y-auto rounded-xl border border-border/50 bg-card p-2 shadow-2xl backdrop-blur-xl z-50">
          {isSearching ? (
            <div className="p-4 text-center text-sm text-muted-foreground animate-pulse">Searching...</div>
          ) : results.length > 0 ? (
            <div className="space-y-1">
              {results.map(item => (
                <a key={item.id} href={`/menu?q=${item.name}`} className="flex items-center gap-3 p-2 hover:bg-accent rounded-lg group transition-colors">
                  <img src={item.image_url} alt={item.name} className="w-12 h-12 object-cover rounded-md" />
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-bold text-foreground truncate">{item.name}</p>
                    <p className="text-xs text-primary font-bold">PKR {item.price}</p>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">No items found.</div>
          )}
        </div>
      )}
    </div>
  );
}
