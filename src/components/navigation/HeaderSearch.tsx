import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Search, X } from 'lucide-react';
import { searchMenuItems } from '../../server/menu';
import { getValidCompareAtPrice } from '../../lib/cart';
import type { MenuItem } from '../../types';

export function HeaderSearch() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MenuItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const focusTimer = setTimeout(() => {
      inputRef.current?.focus();
    }, 30);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchMenuItems({ data: trimmed });
        setResults(res || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectQuery = (searchText: string) => {
    const clean = searchText.trim();
    setIsOpen(false);
    if (!clean) return;
    navigate({
      to: '/menu',
      search: { q: clean },
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary hover:bg-accent hover:text-accent-foreground h-9 w-9 rounded-xl shrink-0"
        aria-label="Search menu"
        title="Search menu"
      >
        <Search size={19} aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[75] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-16 sm:pt-24 px-4 animate-in fade-in duration-150"
          onClick={() => setIsOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Search Amir Fast Food menu"
        >
          <div
            className="w-full max-w-lg bg-card text-card-foreground border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (query.trim()) {
                  handleSelectQuery(query);
                }
              }}
              className="flex items-center gap-2 p-3 sm:p-4 border-b border-border"
            >
              <Search size={18} className="text-muted-foreground shrink-0" aria-hidden="true" />
              <input
                ref={inputRef}
                type="text"
                inputMode="search"
                enterKeyHint="search"
                aria-label="Search menu items"
                placeholder="Search burgers, shawarma, deals..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm sm:text-base text-foreground placeholder:text-muted-foreground focus:outline-none min-w-0"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-accent"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close search overlay"
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent shrink-0"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </form>

            <div className="max-h-[65dvh] overflow-y-auto p-2 sm:p-3">
              {!query.trim() ? (
                <p className="p-4 text-center text-xs sm:text-sm text-muted-foreground">
                  Type an item name (e.g. Zinger, Shawarma, Deal) to search the menu. Press Esc to close.
                </p>
              ) : isSearching ? (
                <div className="p-6 text-center text-sm text-muted-foreground animate-pulse">Searching menu...</div>
              ) : results.length > 0 ? (
                <div className="space-y-1">
                  {results.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectQuery(item.name)}
                      className="w-full text-left flex items-center gap-3 p-2.5 hover:bg-accent rounded-xl transition-colors"
                    >
                      <img
                        src={item.image_url || '/placeholder.webp'}
                        alt={item.name}
                        onError={(e) => { e.currentTarget.src = '/placeholder.webp'; }}
                        className="w-12 h-12 object-cover rounded-lg bg-muted shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{item.name}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                        )}
                      </div>
                      {(() => {
                        const compareAt = getValidCompareAtPrice(item.price, item.original_price);
                        return (
                          <div className="text-right whitespace-nowrap shrink-0">
                            {compareAt && (
                              <span className="block text-[11px] text-muted-foreground line-through leading-none">
                                PKR {compareAt.toLocaleString()}
                              </span>
                            )}
                            <span className="text-xs sm:text-sm text-primary font-bold">
                              PKR {item.price.toLocaleString()}
                            </span>
                          </div>
                        );
                      })()}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleSelectQuery(query)}
                    className="w-full mt-2 py-2.5 px-4 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs sm:text-sm font-bold transition-colors text-center"
                  >
                    View all results for &ldquo;{query.trim()}&rdquo; on Menu →
                  </button>
                </div>
              ) : (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No available items found matching &ldquo;{query.trim()}&rdquo;.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}