import { createFileRoute } from '@tanstack/react-router';
import React, { useEffect, useState } from 'react';
import { supabaseBrowser } from '../../lib/supabase';
import { updateMenuItemFn } from '../../server/menu';
import { ChefHat, Pencil, Check, X, Image as ImageIcon } from 'lucide-react';
import type { MenuItem } from '../../types';

export const Route = createFileRoute('/admin/menu')({
  component: AdminMenuEditor,
});

function AdminMenuEditor() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editImage, setEditImage] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchItems = async () => {
      const { data } = await supabaseBrowser
        .from('menu_items')
        .select('*')
        .order('category_id');
      if (data) setItems(data);
    };
    fetchItems();
  }, [isAuthenticated]);

  const handleSave = async (id: string) => {
    try {
      const updates = {
        price: parseFloat(editPrice),
        image_url: editImage
      };
      
      await updateMenuItemFn({ data: { id, price: parseFloat(editPrice), image_url: editImage } });
      
      setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
      setEditingId(null);
    } catch (e) {
      alert('Failed to update item!');
      console.error(e);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="bg-card border border-border p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl">
          <ChefHat className="text-primary w-16 h-16 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Menu Editor Access</h1>
          <p className="text-muted-foreground mb-6 text-sm">Enter the admin PIN (7860) to edit the menu.</p>
          <input 
            type="password" 
            value={pin}
            onChange={e => setPin(e.target.value)}
            placeholder="Enter PIN"
            className="w-full bg-background border border-border text-foreground text-center text-xl tracking-[0.5em] rounded-xl py-3 mb-4 focus:outline-none focus:border-primary"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                if (pin === '7860') setIsAuthenticated(true);
                else { alert('Incorrect PIN!'); setPin(''); }
              }
            }}
          />
          <button 
            onClick={() => {
              if (pin === '7860') setIsAuthenticated(true);
              else { alert('Incorrect PIN!'); setPin(''); }
            }}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-xl transition-colors"
          >
            Unlock Editor
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <header className="mb-8 flex items-center justify-between max-w-6xl mx-auto">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <Pencil className="text-primary" size={32} />
            Menu Editor
          </h1>
          <p className="text-slate-500 mt-1">Change prices and pictures for all 79 items.</p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(item => (
          <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col">
            {editingId === item.id ? (
              <div className="flex flex-col gap-3 h-full">
                <h3 className="font-bold text-lg">{item.name}</h3>
                
                <div>
                  <label className="text-xs font-semibold text-slate-500">Price (PKR)</label>
                  <input 
                    type="number" 
                    value={editPrice}
                    onChange={e => setEditPrice(e.target.value)}
                    className="w-full border border-slate-300 rounded p-2 text-sm"
                  />
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-slate-500">Image URL</label>
                  <input 
                    type="text" 
                    value={editImage}
                    onChange={e => setEditImage(e.target.value)}
                    className="w-full border border-slate-300 rounded p-2 text-sm"
                  />
                </div>
                
                <div className="mt-auto flex gap-2 pt-4">
                  <button onClick={() => handleSave(item.id)} className="flex-1 bg-green-500 text-white rounded p-2 flex items-center justify-center gap-1 font-bold text-sm">
                    <Check size={16} /> Save
                  </button>
                  <button onClick={() => setEditingId(null)} className="flex-1 bg-slate-200 text-slate-700 rounded p-2 flex items-center justify-center gap-1 font-bold text-sm">
                    <X size={16} /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="w-full h-32 bg-slate-100 rounded-lg mb-3 overflow-hidden relative">
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  <span className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded font-bold">PKR {item.price}</span>
                </div>
                <h3 className="font-bold text-slate-900 leading-tight">{item.name}</h3>
                <p className="text-xs text-slate-500 mt-1">{item.category_id}</p>
                <button 
                  onClick={() => {
                    setEditingId(item.id);
                    setEditPrice(item.price.toString());
                    setEditImage(item.image_url);
                  }} 
                  className="mt-auto pt-4 flex items-center text-primary font-bold text-sm hover:underline"
                >
                  <Pencil size={14} className="mr-1" /> Edit Item
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
