import { createFileRoute, useLoaderData } from '@tanstack/react-router';
import React, { useState, useEffect, useRef } from 'react';
import { ThreeDMenuCard } from '../components/menu/ThreeDMenuCard';
import { getCategories, getMenuItems } from '../server/menu';
import { playSuccessChime } from '../lib/sound';
import type { Category, MenuItem, CartItem } from '../types';

export const Route = createFileRoute('/menu')({
  loader: async () => {
    const categories = await getCategories();
    const items = await getMenuItems({ data: 'all' });
    return { categories, items };
  },
  component: MenuPage,
});

function ItemModal({ item, onClose, onAdd }: { item: MenuItem; onClose: () => void; onAdd: (i: CartItem) => void }) {
  const [step, setStep] = useState(1);
  const [drink, setDrink] = useState('Pepsi');
  const [side, setSide] = useState('Fries');
  
  const handleComplete = () => {
    onAdd({
      menu_item_id: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      image_url: item.image_url,
      variants: [
        { name: `Drink: ${drink}`, price: 0 },
        { name: `Side: ${side}`, price: 0 }
      ]
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-card border border-border w-full max-w-md rounded-3xl overflow-hidden shadow-2xl">
        <div className="h-48 overflow-hidden relative">
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
          <button onClick={onClose} className="absolute top-4 right-4 bg-black/50 text-white rounded-full p-2 hover:bg-black/70">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-2xl font-bold text-foreground">{item.name}</h3>
            <p className="text-sm text-primary font-bold">Customize your combo</p>
          </div>
          
          {step === 1 && (
            <div className="space-y-4 animate-in slide-in-from-right-4">
              <h4 className="font-bold text-foreground">Step 1: Choose Drink</h4>
              {['Pepsi', '7UP', 'Mirinda', 'Mountain Dew'].map(d => (
                <label key={d} className="flex items-center gap-3 p-3 border border-border rounded-xl cursor-pointer hover:bg-accent/50">
                  <input type="radio" name="drink" checked={drink === d} onChange={() => setDrink(d)} className="text-primary" />
                  <span className="text-foreground">{d}</span>
                </label>
              ))}
              <button onClick={() => setStep(2)} className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:bg-primary/90 mt-4">Next Step</button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in slide-in-from-right-4">
              <h4 className="font-bold text-foreground">Step 2: Choose Side</h4>
              {['Fries', 'Wedges', 'Coleslaw'].map(s => (
                <label key={s} className="flex items-center gap-3 p-3 border border-border rounded-xl cursor-pointer hover:bg-accent/50">
                  <input type="radio" name="side" checked={side === s} onChange={() => setSide(s)} className="text-primary" />
                  <span className="text-foreground">{s}</span>
                </label>
              ))}
              <div className="flex gap-4 mt-4">
                <button onClick={() => setStep(1)} className="w-1/3 bg-accent text-foreground font-bold py-3 rounded-xl hover:bg-accent/80">Back</button>
                <button onClick={handleComplete} className="w-2/3 bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-500 shadow-lg shadow-emerald-900/50">Add to Cart</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MenuPage() {
  const { categories, items } = useLoaderData({ from: '/menu' });
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id || 'all');
  const [modalItem, setModalItem] = useState<MenuItem | null>(null);
  
  // Create refs for categories
  const categoryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    // Check URL for cat parameter
    const params = new URLSearchParams(window.location.search);
    const cat = params.get('cat');
    if (cat && categoryRefs.current[cat]) {
      setActiveCategory(cat);
      categoryRefs.current[cat]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Scroll spy logic
    const observer = new IntersectionObserver((entries) => {
      let visibleCategories = entries.filter(entry => entry.isIntersecting);
      if (visibleCategories.length > 0) {
        // Find the one closest to top
        const closest = visibleCategories.reduce((prev, curr) => {
          return (Math.abs(curr.boundingClientRect.top) < Math.abs(prev.boundingClientRect.top)) ? curr : prev;
        });
        const id = closest.target.getAttribute('data-category-id');
        if (id) setActiveCategory(id);
      }
    }, { rootMargin: '-100px 0px -60% 0px' });

    Object.values(categoryRefs.current).forEach(ref => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  const handleAddToCart = (item: MenuItem) => {
    if (item.category_id === 'cat_deals') {
      setModalItem(item);
      return;
    }
    
    // Add standalone item to cart
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existing = cart.find((i: CartItem) => i.menu_item_id === item.id && (!i.variants || i.variants.length === 0));
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({
        menu_item_id: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        image_url: item.image_url,
        variants: []
      });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cartUpdated'));
    playSuccessChime();
  };

  const handleModalAdd = (cartItem: CartItem) => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    cart.push(cartItem);
    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cartUpdated'));
    playSuccessChime();
  };

  const scrollToCategory = (id: string) => {
    setActiveCategory(id);
    categoryRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="w-full relative">
      {modalItem && <ItemModal item={modalItem} onClose={() => setModalItem(null)} onAdd={handleModalAdd} />}
      
      {/* Sticky Header & Scroll Spy Pill Bar */}
      <div className="sticky top-16 sm:top-24 z-40 bg-background/90 backdrop-blur-md border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <header className="mb-4">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">Our Menu</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">Crispy Broast, Gourmet Smash Burgers & Loaded Deals.</p>
          </header>

          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
            {categories.map(cat => (
              <button 
                key={cat.id}
                onClick={() => scrollToCategory(cat.id)}
                className={`whitespace-nowrap px-5 py-2 rounded-full font-bold text-sm snap-start transition-all ${
                  activeCategory === cat.id 
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                    : 'bg-card text-muted-foreground border border-border hover:bg-accent'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-16">
        {categories.map(cat => {
          const catItems = items.filter(i => i.category_id === cat.id);
          if (catItems.length === 0) return null;
          
          return (
            <section 
              key={cat.id} 
              data-category-id={cat.id}
              ref={el => categoryRefs.current[cat.id] = el}
              className="scroll-mt-48"
            >
              <div className="mb-6 flex items-baseline gap-4">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground">{cat.name}</h2>
                <div className="h-px bg-border flex-1"></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
                {catItems.map(item => (
                  <ThreeDMenuCard 
                    key={item.id} 
                    item={item} 
                    onAddToCart={handleAddToCart} 
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
