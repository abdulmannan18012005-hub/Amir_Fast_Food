import { createFileRoute, useLoaderData } from '@tanstack/react-router';
import React, { useState, useEffect, useRef } from 'react';
import { ThreeDMenuCard } from '../components/menu/ThreeDMenuCard';
import { ItemModal } from '../components/menu/ItemModal';
import { getCategories, getMenuItems } from '../server/menu';
import { playSuccessChime } from '../lib/sound';
import { seo } from '../lib/seo';
import { addToCart, buildCartItem } from '../lib/cart';
import type { Category, MenuItem, CartItem } from '../types';

export const Route = createFileRoute('/menu')({
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
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [modalItem, setModalItem] = useState<MenuItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Measured height of fixed header block (fallback 118px avoids CLS)
  const [fixedHeaderHeight, setFixedHeaderHeight] = useState<number>(118);
  const fixedHeaderRef = useRef<HTMLDivElement>(null);
  const fixedHeaderHeightRef = useRef<number>(118);
  fixedHeaderHeightRef.current = fixedHeaderHeight;

  const chipsContainerRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScrollRef = useRef(false);
  const scrollLockTimerRef = useRef<any>(null);
  const activeCategoryRef = useRef<string>('all');
  activeCategoryRef.current = activeCategory;
  const rafIdRef = useRef<number | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Sort categories alphabetically
  const sortedCategories = [...categories].sort((a, b) => a.name.localeCompare(b.name));

  // Sort items: Deals numerically, others alphabetically
  const sortedItems = [...items].sort((a, b) => {
    if (a.category_id === 'cat_deals' && b.category_id === 'cat_deals') {
      const numA = parseInt((a.name.match(/\d+/) || [0])[0]);
      const numB = parseInt((b.name.match(/\d+/) || [0])[0]);
      return numA - numB;
    }
    return a.name.localeCompare(b.name);
  });

  // Measure fixed block height with ResizeObserver
  useEffect(() => {
    const el = fixedHeaderRef.current;
    if (!el) return;

    const measure = () => {
      const isShort = window.innerHeight <= 520;
      let h = el.offsetHeight;
      if (isShort) {
        const chipBar = el.querySelector('.menu-chip-bar') as HTMLElement | null;
        h = chipBar ? chipBar.offsetHeight : 56;
      }
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

  // Deep links check on initial mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.replace('#', '');
    const cat = params.get('cat') || hash;
    if (cat && (cat === 'all' || sortedCategories.some(c => c.id === cat))) {
      setTimeout(() => {
        scrollToSection(cat, false);
      }, 150);
    }
  }, []);

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
    history.replaceState(null, '', catId === 'all' ? '#all' : `#${catId}`);
    centerChip(catId, shouldSmooth);

    const headerH = 64; // 4rem
    const fixedH = fixedHeaderHeightRef.current;
    const targetOffset = headerH + fixedH + 12;

    if (catId === 'all') {
      window.scrollTo({ top: 0, behavior: shouldSmooth ? 'smooth' : 'auto' });
    } else {
      const section = document.getElementById(catId);
      if (section) {
        const rect = section.getBoundingClientRect();
        const targetTop = window.scrollY + rect.top - targetOffset;
        window.scrollTo({ top: Math.max(0, targetTop), behavior: shouldSmooth ? 'smooth' : 'auto' });
      }
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

        // At page bottom: last section active
        const scrollBottom = window.innerHeight + scrollY;
        const docHeight = document.documentElement.scrollHeight;
        if (scrollBottom >= docHeight - 30) {
          const lastCat = sortedCategories[sortedCategories.length - 1];
          if (lastCat && activeCategoryRef.current !== lastCat.id) {
            setActiveCategory(lastCat.id);
            activeCategoryRef.current = lastCat.id;
            centerChip(lastCat.id, true);
          }
          return;
        }

        // If top section is still below fixed block, 'all' is active
        const firstCat = sortedCategories[0];
        const firstEl = firstCat ? document.getElementById(firstCat.id) : null;
        if (firstEl) {
          const firstRect = firstEl.getBoundingClientRect();
          if (firstRect.top > triggerThreshold) {
            if (activeCategoryRef.current !== 'all') {
              setActiveCategory('all');
              activeCategoryRef.current = 'all';
              centerChip('all', true);
            }
            return;
          }
        }

        // Section whose top is the last one <= triggerThreshold is active
        let matchedCat = 'all';
        for (const cat of sortedCategories) {
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

        if (matchedCat !== activeCategoryRef.current) {
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
  }, [sortedCategories]);

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

  return (
    <div 
      className="w-full relative"
      style={{ '--menu-fixed-h': `${fixedHeaderHeight}px` } as React.CSSProperties}
    >
      <ItemModal 
        item={modalItem} 
        isOpen={Boolean(modalItem)} 
        onClose={() => setModalItem(null)} 
        onAddToCart={handleModalAdd} 
      />
      
      {/* Fixed Header Section: Title + Subtitle + Category Chips all in ONE sticky container */}
      <div 
        ref={fixedHeaderRef}
        className="menu-fixed-wrapper sticky top-16 z-40 w-full bg-background border-b border-border shadow-sm"
      >
        {/* Title and Subtitle */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 sm:pt-4 pb-1">
          <header>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight">Our Menu</h1>
            <p className="text-muted-foreground mt-0.5 sm:mt-1 text-xs sm:text-base truncate max-sm:max-w-[90vw]">
              Crispy Broast, Gourmet Smash Burgers &amp; Loaded Deals.
            </p>
          </header>
        </div>

        {/* Compact Chip Row */}
        <nav aria-label="Menu categories" className="menu-chip-bar max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 relative">
          <div 
            ref={chipsContainerRef}
            className="flex items-center gap-2 overflow-x-auto overscroll-x-contain snap-x py-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <a 
              href="#all"
              data-chip="all"
              aria-current={activeCategory === 'all' ? 'true' : undefined}
              onClick={(e) => { e.preventDefault(); scrollToSection('all'); }}
              className={`min-h-[44px] h-[44px] sm:min-h-[40px] sm:h-[40px] px-5 flex items-center justify-center rounded-full font-bold text-sm whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0 select-none ${
                activeCategory === 'all' 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'bg-card text-muted-foreground border border-border hover:bg-accent hover:text-foreground'
              }`}
            >
              All
            </a>
            {sortedCategories.map(cat => (
              <a 
                key={cat.id}
                href={`#${cat.id}`}
                data-chip={cat.id}
                aria-current={activeCategory === cat.id ? 'true' : undefined}
                onClick={(e) => { e.preventDefault(); scrollToSection(cat.id); }}
                className={`min-h-[44px] h-[44px] sm:min-h-[40px] sm:h-[40px] px-5 flex items-center justify-center rounded-full font-bold text-sm whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0 select-none ${
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

      {/* All Sections Rendered in Order with Dynamic Measured Scroll-Margin-Top */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-16">
        {sortedCategories.map((cat, catIdx) => {
          const catItems = sortedItems.filter(i => i.category_id === cat.id);
          if (catItems.length === 0) return null;
          return (
            <section 
              key={cat.id} 
              id={cat.id} 
              aria-labelledby={`h-${cat.id}`}
              className="space-y-6"
              style={{
                scrollMarginTop: `calc(4rem + var(--menu-fixed-h, 118px) + 0.75rem)`
              }}
            >
              <div className="flex items-baseline gap-4">
                <h2 id={`h-${cat.id}`} className="text-2xl sm:text-3xl font-bold text-foreground">{cat.name}</h2>
                <div className="h-px bg-border flex-1"></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
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
        })}
      </div>

      {/* Toast Notification (positioned above mobile bottom nav) */}
      {toastMessage && (
        <div 
          role="status"
          aria-live="polite"
          className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom)+0.75rem)] md:bottom-6 left-1/2 -translate-x-1/2 z-[80] bg-emerald-600 text-white px-5 py-3 rounded-full shadow-xl font-bold flex items-center gap-2 text-sm animate-in slide-in-from-bottom-4 fade-in duration-300"
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
