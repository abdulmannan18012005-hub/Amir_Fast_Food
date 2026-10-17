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

  const chipsContainerRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScrollRef = useRef(false);
  const scrollLockTimerRef = useRef<any>(null);

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

  // Programmatic smooth scroll to a category
  const scrollToSection = (catId: string, smooth = true) => {
    isProgrammaticScrollRef.current = true;
    setActiveCategory(catId);
    history.replaceState(null, '', catId === 'all' ? '#all' : `#${catId}`);

    // Center active chip in chips container
    if (chipsContainerRef.current) {
      const chipEl = chipsContainerRef.current.querySelector(`[data-chip="${catId}"]`) as HTMLElement | null;
      if (chipEl) {
        const container = chipsContainerRef.current;
        const left = chipEl.offsetLeft - (container.clientWidth / 2) + (chipEl.clientWidth / 2);
        container.scrollTo({ left, behavior: smooth ? 'smooth' : 'auto' });
      }
    }

    if (catId === 'all') {
      window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
    } else {
      const section = document.getElementById(catId);
      if (section) {
        section.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
      }
    }

    clearTimeout(scrollLockTimerRef.current);
    scrollLockTimerRef.current = setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 700);
  };

  // Scroll-spy: highlight chip following scroll
  useEffect(() => {
    const handleScroll = () => {
      if (isProgrammaticScrollRef.current) return;

      const scrollY = window.scrollY;
      // If user scrolled near the top: highlight 'All'
      if (scrollY < 120) {
        if (activeCategory !== 'all') {
          setActiveCategory('all');
          centerChip('all');
        }
        return;
      }

      // If scrolled to bottom of page: highlight last category
      const scrollBottom = window.innerHeight + scrollY;
      const docHeight = document.documentElement.scrollHeight;
      if (scrollBottom >= docHeight - 40) {
        const lastCat = sortedCategories[sortedCategories.length - 1];
        if (lastCat && activeCategory !== lastCat.id) {
          setActiveCategory(lastCat.id);
          centerChip(lastCat.id);
        }
        return;
      }

      // Determine category just below sticky header (header 64px + catbar 56px + offset 16px = ~136px)
      const offset = 140;
      let matchedCat = 'all';
      for (const cat of sortedCategories) {
        const el = document.getElementById(cat.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= offset) {
            matchedCat = cat.id;
          } else {
            break;
          }
        }
      }

      if (matchedCat !== activeCategory) {
        setActiveCategory(matchedCat);
        centerChip(matchedCat);
      }
    };

    const centerChip = (catId: string) => {
      if (!chipsContainerRef.current) return;
      const chipEl = chipsContainerRef.current.querySelector(`[data-chip="${catId}"]`) as HTMLElement | null;
      if (chipEl) {
        const container = chipsContainerRef.current;
        const left = chipEl.offsetLeft - (container.clientWidth / 2) + (chipEl.clientWidth / 2);
        container.scrollTo({ left, behavior: 'smooth' });
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sortedCategories, activeCategory]);

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
    <div className="w-full relative">
      <ItemModal 
        item={modalItem} 
        isOpen={Boolean(modalItem)} 
        onClose={() => setModalItem(null)} 
        onAddToCart={handleModalAdd} 
      />
      
      {/* Page Title Block (scrolls away normally) */}
      <div className="w-full bg-background pt-6 pb-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <header>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">Our Menu</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">Crispy Broast, Gourmet Smash Burgers & Loaded Deals.</p>
          </header>
        </div>
      </div>

      {/* Sticky Category Bar: sticks directly below 4rem site header (top-16) */}
      <div className="sticky top-16 z-40 w-full bg-background/95 backdrop-blur-md border-b border-border shadow-sm">
        <nav aria-label="Menu categories" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 relative">
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

      {/* All Sections Rendered in Order (Scroll-margin-top 132px for sticky header & bar) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-16">
        {sortedCategories.map((cat, catIdx) => {
          const catItems = sortedItems.filter(i => i.category_id === cat.id);
          if (catItems.length === 0) return null;
          return (
            <section 
              key={cat.id} 
              id={cat.id} 
              aria-labelledby={`h-${cat.id}`}
              className="scroll-mt-[132px] space-y-6"
              style={catIdx >= 2 ? { contentVisibility: 'auto', containIntrinsicSize: '0 500px' } : undefined}
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
