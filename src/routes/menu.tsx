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
  const [side, setSide] = useState('Regular Fries');
  const [upgrades, setUpgrades] = useState<{name: string, price: number}[]>([]);
  
  const handleComplete = () => {
    onAdd({
      menu_item_id: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      image_url: item.image_url,
      variants: [
        { name: `Drink: ${drink}`, price: 0 },
        { name: `Side: ${side}`, price: 0 },
        ...upgrades
      ]
    });
    onClose();
  };

  const toggleUpgrade = (name: string, price: number) => {
    setUpgrades(prev => 
      prev.find(u => u.name === name) 
        ? prev.filter(u => u.name !== name)
        : [...prev, { name, price }]
    );
  };

  const total = item.price + upgrades.reduce((s, u) => s + u.price, 0);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-card border border-border w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="h-48 overflow-hidden relative shrink-0">
          <img src={item.image_url || "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80"} alt={item.name} onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80"; }} className="w-full h-full object-cover bg-muted" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-6">
            <h2 className="text-2xl font-bold text-white">{item.name}</h2>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          {step === 1 && (
            <div className="space-y-4 animate-in slide-in-from-right-4">
              <h3 className="font-bold text-lg text-foreground">1. Choose your Drink</h3>
              {['Pepsi', '7Up', 'Mirinda', 'Mountain Dew', 'Diet Pepsi'].map(d => (
                <label key={d} className="flex items-center gap-3 p-4 bg-accent/50 rounded-xl cursor-pointer hover:bg-accent border border-border">
                  <input type="radio" name="drink" checked={drink === d} onChange={() => setDrink(d)} className="w-5 h-5 text-primary" />
                  <span className="text-foreground font-medium">{d}</span>
                </label>
              ))}
              <button onClick={() => setStep(2)} className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl hover:bg-primary/90 mt-4">Next Step</button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in slide-in-from-right-4">
              <h3 className="font-bold text-lg text-foreground">2. Choose your Side</h3>
              {['Regular Fries', 'Masala Fries', 'Coleslaw', 'Garlic Mayo Dip'].map(s => (
                <label key={s} className="flex items-center gap-3 p-4 bg-accent/50 rounded-xl cursor-pointer hover:bg-accent border border-border">
                  <input type="radio" name="side" checked={side === s} onChange={() => setSide(s)} className="w-5 h-5 text-primary" />
                  <span className="text-foreground font-medium">{s}</span>
                </label>
              ))}
              <div className="flex gap-3 mt-4">
                <button onClick={() => setStep(1)} className="w-1/3 bg-accent text-foreground font-bold py-3.5 rounded-xl hover:bg-accent/80">Back</button>
                <button onClick={() => setStep(3)} className="w-2/3 bg-primary text-primary-foreground font-bold py-3.5 rounded-xl hover:bg-primary/90">Next Step</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in slide-in-from-right-4">
              <h3 className="font-bold text-lg text-foreground">3. Premium Upgrades</h3>
              {[
                { name: 'Extra Cheese', price: 60 },
                { name: 'Extra Dip', price: 50 },
                { name: 'Jalapenos', price: 40 }
              ].map(u => {
                const checked = upgrades.some(x => x.name === u.name);
                return (
                  <label key={u.name} className="flex items-center justify-between p-4 bg-accent/50 rounded-xl cursor-pointer hover:bg-accent border border-border">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked={checked} onChange={() => toggleUpgrade(u.name, u.price)} className="w-5 h-5 rounded text-primary" />
                      <span className="text-foreground font-medium">{u.name}</span>
                    </div>
                    <span className="text-primary font-bold">+PKR {u.price}</span>
                  </label>
                );
              })}
              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(2)} className="w-1/3 bg-accent text-foreground font-bold py-3.5 rounded-xl hover:bg-accent/80">Back</button>
                <button onClick={handleComplete} className="w-2/3 bg-emerald-600 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-500 shadow-lg shadow-emerald-600/30">
                  Add - PKR {total}
                </button>
              </div>
            </div>
          )}
        </div>
        
        <button onClick={onClose} className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/80 backdrop-blur-md z-50">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
    </div>
  );
}

function MenuPage() {
  const { categories, items } = useLoaderData({ from: '/menu' });
  const [activeCategory, setActiveCategory] = useState('cat_burgers');
  const [modalItem, setModalItem] = useState<MenuItem | null>(null);

  useEffect(() => {
    // Check URL for cat parameter
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.replace('#', '');
    const cat = params.get('cat') || hash;
    if (cat && categories.find(c => c.id === cat)) {
      setActiveCategory(cat);
    }
  }, [categories]);

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

  // Sort categories alphabetically
  const sortedCategories = [...categories].sort((a,b) => a.name.localeCompare(b.name));
  
  // Sort items: Deals numerically, others alphabetically
  const sortedItems = [...items].sort((a, b) => {
    if (a.category_id === 'cat_deals' && b.category_id === 'cat_deals') {
      const numA = parseInt((a.name.match(/\d+/) || [0])[0]);
      const numB = parseInt((b.name.match(/\d+/) || [0])[0]);
      return numA - numB;
    }
    return a.name.localeCompare(b.name);
  });


  return (
    <div className="w-full relative">
      {modalItem && <ItemModal item={modalItem} onClose={() => setModalItem(null)} onAdd={handleModalAdd} />}
      
      <div className="w-full bg-background border-b border-border/40 pb-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <header className="mb-6">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">Our Menu</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">Crispy Broast, Gourmet Smash Burgers & Loaded Deals.</p>
          </header>

          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button 
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-5 py-2.5 rounded-full font-bold text-sm transition-all shadow-sm ${
                  activeCategory === cat.id 
                    ? 'bg-primary text-primary-foreground shadow-primary/20 scale-105' 
                    : 'bg-card text-muted-foreground border border-border hover:bg-accent hover:text-foreground'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[50vh] space-y-16">
        {sortedCategories.map(cat => {
          const catItems = sortedItems.filter(i => i.category_id === cat.id);
          if (catItems.length === 0) return null;
          return (
            <section key={cat.id} id={cat.id} className="scroll-mt-24">
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