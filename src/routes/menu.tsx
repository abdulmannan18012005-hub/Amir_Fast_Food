import { createFileRoute, useLoaderData, useNavigate } from '@tanstack/react-router';
import React, { useState, useEffect, useRef } from 'react';
import { ThreeDMenuCard } from '../components/menu/ThreeDMenuCard';
const ItemModal = React.lazy(() => import('../components/menu/ItemModal').then(m => ({ default: m.ItemModal })));
import { getCategories, getMenuItems } from '../server/menu';
import { playSuccessChime } from '../lib/sound';
import { seo } from '../lib/seo';
import { addToCart, buildCartItem } from '../lib/cart';
import { useShopStatus } from '../hooks/useShopStatus';
import { SHOP_HOURS_DISPLAY } from '../lib/shop';
import { Search, X } from 'lucide-react';
import type { Category, MenuItem, CartItem } from '../types';

export const Route = createFileRoute('/menu')({
  staleTime: 0,
  gcTime: 0,
  validateSearch: (search: Record<string, unknown>): { q?: string; cat?: string } => {
    const q = typeof search.q === 'string' && search.q.trim() ? search.q.trim() : undefined;
    const cat = typeof search.cat === 'string' && search.cat.trim() ? search.cat.trim() : undefined;
    return { ...(q ? { q } : {}), ...(cat ? { cat } : {}) };
  },
  head: () => seo({
    title: 'Menu - Amir Fast Food',
    description: 'Explore the full Amir Fast Food menu: authentic shawarma, handcrafted smash burgers, crispy chicken, and combo deals in Lahore.',
    path: '/menu'
  }),
  loader: async () => {
    const categories = await getCategories();
    const items = await getMenuItems({ data: 'all' });
    return { categories, items };
  },
  component: MenuPage,
});

function MenuPage() {
  const { categories, items } = useLoaderData({ from: '/menu' });
  const search = Route.useSearch();
  const navigate = useNavigate();
  const shopStatus = useShopStatus();
  const activeQuery = (search?.q || '').trim();

  // Sort categories alphabetically
  const sortedCategories = [...categories].sort((a, b) => a.name.localeCompare(b.name));
  const initialCategory = sortedCategories[0]?.id || '';

  const [activeCategory, setActiveCategory] = useState<string>(initialCategory);
  const [modalItem, setModalItem] = useState<MenuItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Measured height of fixed header block (fallback 56px avoids CLS)
  const [fixedHeaderHeight, setFixedHeaderHeight] = useState<number>(56);
  const fixedHeaderRef = useRef<HTMLDivElement>(null);
  const fixedHeaderHeightRef = useRef<number>(56);
  fixedHeaderHeightRef.current = fixedHeaderHeight;

  const chipsContainerRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScrollRef = useRef(false);
  const scrollLockTimerRef = useRef<any>(null);
  const activeCategoryRef = useRef<string>(initialCategory);
  activeCategoryRef.current = activeCategory;
  const rafIdRef = useRef<number | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Sort items: Deals numerically, others alphabetically
  const sortedItems = [...items].sort((a, b) => {
    if (a.category_id === 'cat_deals' && b.category_id === 'cat_deals') {
      const numA = parseInt(String((a.name.match(/\d+/) || [0])[0]), 10);
      const numB = parseInt(String((b.name.match(/\d+/) || [0])[0]), 10);
      return numA - numB;
    }
    return a.name.localeCompare(b.name);
  });

  // Apply search query filter when /menu?q=... is present
  const visibleItems = activeQuery
    ? sortedItems.filter((item) => {
        const q = activeQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          (item.description || '').toLowerCase().includes(q) ||
          (item.sub_category || '').toLowerCase().includes(q)
        );
      })
    : sortedItems;

  const visibleCategories = sortedCategories.filter(cat =>
    visibleItems.some(i => i.category_id === cat.id)
  );

  // Measure fixed block height with ResizeObserver
  useEffect(() => {
    const el = fixedHeaderRef.current;
    if (!el) return;

    const measure = () => {
      const h = el.offsetHeight || 56;
      setFixedHeaderHeight(h);
      fixedHeaderHeightRef.current = h;
      document.documentElement.style.setProperty('--menu-fixed-h', `${h}px`);
    };

    measure();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        measure();
      });
      ro.observe(el);
    }

    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);

    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, []);

  // Deep links check on initial mount or category param
  useEffect(() => {
    if (activeQuery) return;
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.replace('#', '');
    const cat = search?.cat || params.get('cat') || hash;
    const targetCat = (cat && sortedCategories.some(c => c.id === cat)) 
      ? cat 
      : '';
    if (targetCat) {
      setTimeout(() => {
        scrollToSection(targetCat, false);
      }, 150);
    }
  }, [activeQuery, search?.cat]);

  // Center chip inside chip scroller container only
  const centerChip = (catId: string, smooth = true) => {
    if (!chipsContainerRef.current) return;
    const chipEl = chipsContainerRef.current.querySelector(`[data-chip="${catId}"]`) as HTMLElement | null;
    if (chipEl) {
      const container = chipsContainerRef.current;
      const left = chipEl.offsetLeft - (container.clientWidth / 2) + (chipEl.clientWidth / 2);
      container.scrollTo({ left, behavior: smooth ? 'smooth' : 'auto' });
    }
  };

  // Programmatic smooth scroll to a category
  const scrollToSection = (catId: string, smooth = true) => {
    const prefersReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const shouldSmooth = smooth && !prefersReduced;

    isProgrammaticScrollRef.current = true;
    setActiveCategory(catId);
    activeCategoryRef.current = catId;
    if (!activeQuery) {
      history.replaceState(null, '', `#${catId}`);
    }
    centerChip(catId, shouldSmooth);

    const headerH = 64; // 4rem
    const fixedH = fixedHeaderHeightRef.current;
    const targetOffset = headerH + fixedH + 8;

    const section = document.getElementById(catId);
    if (section) {
      const rect = section.getBoundingClientRect();
      const targetTop = window.scrollY + rect.top - targetOffset;
      window.scrollTo({ top: Math.max(0, targetTop), behavior: shouldSmooth ? 'smooth' : 'auto' });
    }

    clearTimeout(scrollLockTimerRef.current);
    const unlock = () => {
      isProgrammaticScrollRef.current = false;
      window.removeEventListener('scrollend', unlock);
    };
    window.addEventListener('scrollend', unlock, { once: true });
    scrollLockTimerRef.current = setTimeout(unlock, 700);
  };

  // Scroll-spy: highlight chip following scroll (rAF-throttled, single subscription)
  useEffect(() => {
    const handleScroll = () => {
      if (isProgrammaticScrollRef.current) return;
      if (rafIdRef.current !== null) return;

      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        if (isProgrammaticScrollRef.current) return;

        const scrollY = window.scrollY;
        const headerH = 64;
        const fixedH = fixedHeaderHeightRef.current;
        const triggerThreshold = headerH + fixedH + 8;

        const scrollBottom = window.innerHeight + scrollY;
        const docHeight = document.documentElement.scrollHeight;
        if (scrollBottom >= docHeight - 30) {
          const lastCat = visibleCategories[visibleCategories.length - 1];
          if (lastCat && activeCategoryRef.current !== lastCat.id) {
            setActiveCategory(lastCat.id);
            activeCategoryRef.current = lastCat.id;
            centerChip(lastCat.id, true);
          }
          return;
        }

        const firstCat = visibleCategories[0];
        let matchedCat = firstCat ? firstCat.id : '';
        for (const cat of visibleCategories) {
          const el = document.getElementById(cat.id);
          if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.top <= triggerThreshold) {
              matchedCat = cat.id;
            } else {
              break;
            }
          }
        }

        if (matchedCat && matchedCat !== activeCategoryRef.current) {
          setActiveCategory(matchedCat);
          activeCategoryRef.current = matchedCat;
          centerChip(matchedCat, true);
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [visibleCategories]);

  const handleAddToCart = (item: MenuItem) => {
    if (item.category_id === 'cat_deals') {
      setModalItem(item);
      return;
    }
    
    addToCart(buildCartItem(item, [], 1));
    playSuccessChime();
    showToast(`${item.name} added to cart!`);
  };

  const handleModalAdd = (cartItem: CartItem) => {
    addToCart(cartItem);
    setModalItem(null);
    playSuccessChime();
    showToast(`${cartItem.name} added to cart!`);
  };

  const clearSearch = () => {
    navigate({ to: '/menu', search: {} });
  };

  return (
    <div 
      className="w-full min-w-0 relative"
      style={{ '--menu-fixed-h': `${fixedHeaderHeight}px` } as React.CSSProperties}
    >
      <React.Suspense fallback={null}>
        {modalItem && (
          <ItemModal 
            item={modalItem} 
            isOpen={Boolean(modalItem)} 
            onClose={() => setModalItem(null)} 
            onAddToCart={handleModalAdd} 
          />
        )}
      </React.Suspense>
      
      {/* Page Title, Subtitle & Live Ordering Hours */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-3 space-y-3">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground tracking-tight">Our Menu</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Crispy Broast, Gourmet Smash Burgers &amp; Loaded Deals.
            </p>
          </div>
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border self-start sm:self-auto ${
            shopStatus.open
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
              : 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30'
          }`}>
            <span className={`w-2 h-2 rounded-full ${shopStatus.open ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span>{shopStatus.open ? `Ordering Open (${SHOP_HOURS_DISPLAY} PKT)` : `Closed · Opens ${shopStatus.opensAtLabel} PKT`}</span>
          </div>
        </header>

        {!shopStatus.open && (
          <div role="status" className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 rounded-2xl text-xs sm:text-sm font-medium">
            {shopStatus.closedMessage}
          </div>
        )}

        {activeQuery && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-card border border-primary/40 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 text-sm">
              <Search size={16} className="text-primary shrink-0" aria-hidden="true" />
              <span>
                Showing <strong className="text-foreground">{visibleItems.length}</strong> result{visibleItems.length === 1 ? '' : 's'} for{' '}
                <strong className="text-primary">&ldquo;{activeQuery}&rdquo;</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={clearSearch}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent hover:bg-accent/80 text-foreground text-xs font-bold transition-colors"
            >
              <X size={14} aria-hidden="true" />
              Clear Search
            </button>
          </div>
        )}
      </div>

      {/* Sticky Chip Row */}
      {visibleCategories.length > 0 && (
        <div 
          ref={fixedHeaderRef}
          className="menu-fixed-wrapper sticky top-16 z-40 w-full min-w-0 bg-background border-b border-border shadow-sm"
        >
          <nav aria-label="Menu categories" className="menu-chip-bar max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 relative min-w-0">
            <div 
              ref={chipsContainerRef}
              className="flex items-center gap-2 overflow-x-auto overscroll-x-contain snap-x py-1"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {visibleCategories.map(cat => (
                <a 
                  key={cat.id}
                  href={`#${cat.id}`}
                  data-chip={cat.id}
                  aria-current={activeCategory === cat.id ? 'true' : undefined}
                  onClick={(e) => { e.preventDefault(); scrollToSection(cat.id); }}
                  className={`min-h-[42px] h-[42px] sm:min-h-[38px] sm:h-[38px] px-4 sm:px-5 flex items-center justify-center rounded-full font-bold text-sm whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0 select-none ${
                    activeCategory === cat.id 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'bg-card text-muted-foreground border border-border hover:bg-accent hover:text-foreground'
                  }`}
                >
                  {cat.name}
                </a>
              ))}
            </div>
          </nav>
        </div>
      )}

      {/* Menu Sections (Phone: 1, Tablet: 3, Desktop: 4) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-12 sm:space-y-14 pb-12 w-full min-w-0">
        {visibleCategories.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-3xl p-6 space-y-4">
            <p className="text-lg font-bold text-foreground">No items found matching &ldquo;{activeQuery}&rdquo;</p>
            <p className="text-sm text-muted-foreground">Try another item name or view the full menu.</p>
            <button
              type="button"
              onClick={clearSearch}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold px-6 py-2.5 rounded-full hover:bg-primary/90 transition-colors"
            >
              Show Full Menu
            </button>
          </div>
        ) : (
          visibleCategories.map((cat, catIdx) => {
            const catItems = visibleItems.filter(i => i.category_id === cat.id);
            if (catItems.length === 0) return null;
            return (
              <section 
                key={cat.id} 
                id={cat.id} 
                aria-labelledby={`h-${cat.id}`}
                className="space-y-4 sm:space-y-6 w-full min-w-0"
                style={{
                  scrollMarginTop: `calc(4rem + var(--menu-fixed-h, 56px) + 0.75rem)`
                }}
              >
                <div className="flex items-baseline gap-4">
                  <h2 id={`h-${cat.id}`} className="text-xl sm:text-3xl font-bold text-foreground">{cat.name}</h2>
                  <div className="h-px bg-border flex-1"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5 lg:gap-6">
                  {catItems.map((item, itemIdx) => (
                    <ThreeDMenuCard 
                      key={item.id} 
                      item={item} 
                      onAddToCart={handleAddToCart}
                      priority={catIdx === 0 && itemIdx < 4}
                    />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>

      {/* Toast Notification (positioned above mobile bottom nav) */}
      {toastMessage && (
        <div 
          role="status"
          aria-live="polite"
          className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom)+0.75rem)] md:bottom-6 left-1/2 -translate-x-1/2 z-[80] bg-emerald-700 text-white px-5 py-3 rounded-full shadow-xl font-bold flex items-center gap-2 text-sm animate-in slide-in-from-bottom-4 fade-in duration-300"
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}