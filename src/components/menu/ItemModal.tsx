import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { MenuItem, CartItem, ItemVariant } from '../../types';

interface Props {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (cartItem: CartItem) => void;
}

export function ItemModal({ item, isOpen, onClose, onAddToCart }: Props) {
  const [step, setStep] = useState(1);
  const [drink, setDrink] = useState('Pepsi');
  const [side, setSide] = useState('Regular Fries');
  const [upgrades, setUpgrades] = useState<{name: string, price: number}[]>([]);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setDrink('Pepsi');
    setSide('Regular Fries');
    setUpgrades([]);
    closeBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const isDeal = item.category_id === 'cat_deals' || (item.variants && item.variants.length > 0);

  const toggleUpgrade = (name: string, price: number) => {
    setUpgrades(prev => 
      prev.find(u => u.name === name) 
        ? prev.filter(u => u.name !== name)
        : [...prev, { name, price }]
    );
  };

  const handleComplete = () => {
    const selectedVariants: ItemVariant[] = isDeal ? [
      { name: `Drink: ${drink}`, price: 0 },
      { name: `Side: ${side}`, price: 0 },
      ...upgrades
    ] : [];

    onAddToCart({
      menu_item_id: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      image_url: item.image_url || '/placeholder.webp',
      variants: selectedVariants
    });
    onClose();
  };

  const total = item.price + upgrades.reduce((s, u) => s + u.price, 0);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-item-title"
        className="bg-card border border-border w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-44 sm:h-48 overflow-hidden relative shrink-0 bg-muted">
          <img 
            src={item.image_url || '/placeholder.webp'} 
            alt={item.name} 
            onError={(e) => { e.currentTarget.src = '/placeholder.webp'; }} 
            className="w-full h-full object-cover" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-5">
            <h2 id="modal-item-title" className="text-xl sm:text-2xl font-bold text-white">{item.name}</h2>
          </div>
          <button 
            ref={closeBtnRef}
            onClick={onClose} 
            aria-label="Close customizer" 
            className="absolute top-3 right-3 bg-black/60 text-white p-2 rounded-full hover:bg-black/80 backdrop-blur-md transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {step === 1 && (
            <div className="space-y-4 animate-in slide-in-from-right-4">
              <h3 className="font-bold text-base sm:text-lg text-foreground">1. Choose your Drink</h3>
              {['Pepsi', '7Up', 'Mirinda', 'Mountain Dew', 'Diet Pepsi'].map(d => (
                <label key={d} className="flex items-center gap-3 p-3.5 bg-accent/40 rounded-xl cursor-pointer hover:bg-accent border border-border">
                  <input type="radio" name="drink" checked={drink === d} onChange={() => setDrink(d)} className="w-5 h-5 text-primary accent-primary" />
                  <span className="text-foreground font-medium text-sm sm:text-base">{d}</span>
                </label>
              ))}
              <button 
                onClick={() => setStep(2)} 
                className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl hover:bg-primary/90 mt-2 transition-colors"
              >
                Next Step
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in slide-in-from-right-4">
              <h3 className="font-bold text-base sm:text-lg text-foreground">2. Choose your Side</h3>
              {['Regular Fries', 'Masala Fries', 'Coleslaw', 'Garlic Mayo Dip'].map(s => (
                <label key={s} className="flex items-center gap-3 p-3.5 bg-accent/40 rounded-xl cursor-pointer hover:bg-accent border border-border">
                  <input type="radio" name="side" checked={side === s} onChange={() => setSide(s)} className="w-5 h-5 text-primary accent-primary" />
                  <span className="text-foreground font-medium text-sm sm:text-base">{s}</span>
                </label>
              ))}
              <div className="flex gap-3 mt-4">
                <button onClick={() => setStep(1)} className="w-1/3 bg-accent text-foreground font-bold py-3 rounded-xl hover:bg-accent/80 transition-colors">Back</button>
                <button onClick={() => setStep(3)} className="w-2/3 bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:bg-primary/90 transition-colors">Next Step</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in slide-in-from-right-4">
              <h3 className="font-bold text-base sm:text-lg text-foreground">3. Premium Upgrades</h3>
              {[
                { name: 'Extra Cheese', price: 60 },
                { name: 'Extra Dip', price: 50 },
                { name: 'Jalapenos', price: 40 }
              ].map(u => {
                const checked = upgrades.some(x => x.name === u.name);
                return (
                  <label key={u.name} className="flex items-center justify-between p-3.5 bg-accent/40 rounded-xl cursor-pointer hover:bg-accent border border-border">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked={checked} onChange={() => toggleUpgrade(u.name, u.price)} className="w-5 h-5 rounded text-primary accent-primary" />
                      <span className="text-foreground font-medium text-sm sm:text-base">{u.name}</span>
                    </div>
                    <span className="text-primary font-bold text-sm sm:text-base">+PKR {u.price}</span>
                  </label>
                );
              })}
              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(2)} className="w-1/3 bg-accent text-foreground font-bold py-3 rounded-xl hover:bg-accent/80 transition-colors">Back</button>
                <button 
                  onClick={handleComplete} 
                  className="w-2/3 bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-500 shadow-md transition-colors"
                >
                  Add - PKR {total}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
