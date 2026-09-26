import React, { useState } from 'react';
import type { MenuItem, ItemVariant } from '../../types';

interface Props {
  item: MenuItem;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: MenuItem, quantity: number, selectedVariants: ItemVariant[]) => void;
}

export function ItemModal({ item, isOpen, onClose, onAddToCart }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState<ItemVariant[]>([]);

  if (!isOpen) return null;

  const handleToggleVariant = (variant: ItemVariant) => {
    setSelectedVariants(prev => 
      prev.some(v => v.name === variant.name)
        ? prev.filter(v => v.name !== variant.name)
        : [...prev, variant]
    );
  };

  const variantsTotal = selectedVariants.reduce((sum, v) => sum + v.price, 0);
  const lineTotal = (item.price + variantsTotal) * quantity;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 w-full max-w-lg relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 rounded-full p-1">
          <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
        
        <img src={item.image_url} alt={item.name} className="w-full h-48 object-cover rounded-xl mb-6 shadow-md" />
        
        <h2 className="text-2xl font-bold text-white mb-2">{item.name}</h2>
        <p className="text-slate-400 text-sm mb-6">{item.description}</p>
        
        {item.variants && item.variants.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-bold text-white mb-3">Add-ons & Modifiers</h3>
            <div className="space-y-2">
              {item.variants.map((v, i) => (
                <label key={i} className="flex items-center justify-between p-3 border border-slate-700 rounded-lg bg-slate-800/50 cursor-pointer hover:bg-slate-800">
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 accent-red-600 rounded bg-slate-900 border-slate-600"
                      checked={selectedVariants.some(sv => sv.name === v.name)}
                      onChange={() => handleToggleVariant(v)}
                    />
                    <span className="text-slate-200">{v.name}</span>
                  </div>
                  <span className="text-slate-400">+PKR {v.price}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-6 bg-slate-800 p-2 rounded-lg">
          <button 
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="w-10 h-10 bg-slate-700 rounded text-white font-bold hover:bg-slate-600"
          >-</button>
          <span className="text-xl font-bold text-white">{quantity}</span>
          <button 
            onClick={() => setQuantity(quantity + 1)}
            className="w-10 h-10 bg-slate-700 rounded text-white font-bold hover:bg-slate-600"
          >+</button>
        </div>

        <button 
          onClick={() => {
            onAddToCart(item, quantity, selectedVariants);
            onClose();
          }}
          className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl shadow-lg transition-colors flex justify-between items-center px-6"
        >
          <span>Add to Order</span>
          <span>PKR {lineTotal.toFixed(2)}</span>
        </button>
      </div>
    </div>
  );
}
