import { createFileRoute } from '@tanstack/react-router';
import React, { useEffect, useState } from 'react';
import { supabaseBrowser } from '../../lib/supabase';
import { updateMenuItemFn, getCategoryImagesFn, updateCategoryImagesFn, getHighlightImagesFn, updateHighlightImagesFn } from '../../server/menu';
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
  const [activeTab, setActiveTab] = useState<'items' | 'categories' | 'highlights'>('items');
  const [highlightImages, setHighlightImages] = useState<Record<string, string>>({});
  const [categoryImages, setCategoryImages] = useState<Record<string, string>>({});


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
    const fetchCategoryImages = async () => {
      const data = await getCategoryImagesFn();
      if (data) setCategoryImages(data);
    };
    fetchCategoryImages();
    const fetchHighlightImages = async () => {
      const data = await getHighlightImagesFn();
      if (data) setHighlightImages(data);
    };
    fetchHighlightImages();

  }, [isAuthenticated]);



  const handleSaveHighlights = async () => {
    try {
      await updateHighlightImagesFn({ data: highlightImages });
      alert('Highlight images updated successfully!');
    } catch (e) {
      alert('Failed to update highlight images');
      console.error(e);
    }
  };
  const handleSaveCategory = async () => {
    try {
      await updateCategoryImagesFn({ data: categoryImages });
      alert('Category images updated successfully!');
    } catch (e) {
      alert('Failed to update category images');
      console.error(e);
    }
  };
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
            <header className="mb-8 max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <Pencil className="text-primary" size={32} />
            Admin Editor
          </h1>
          <p className="text-slate-500 mt-1">Change prices, menu pictures, and category previews.</p>
        </div>
        <div className="flex bg-slate-200 p-1 rounded-lg">
          <button onClick={() => setActiveTab('items')} className={`px-4 py-2 rounded-md font-bold text-sm ${activeTab === 'items' ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}>Menu Items</button>
          <button onClick={() => setActiveTab('categories')} className={`px-4 py-2 rounded-md font-bold text-sm ${activeTab === 'categories' ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}>Home Categories</button>
          <button onClick={() => setActiveTab('highlights')} className={`px-4 py-2 rounded-md font-bold text-sm ${activeTab === 'highlights' ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}>Highlights</button>
        </div>
      </header>

      
      {activeTab === 'items' ? (
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => (
            <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col">
              {editingId === item.id ? (
                <div className="flex flex-col gap-3 h-full">
                  <h3 className="font-bold text-lg">{item.name}</h3>
                  <div>
                    <label className="text-xs font-semibold text-slate-500">Price (PKR)</label>
                    <input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} className="w-full border border-slate-300 rounded p-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500">Image URL</label>
                    <input type="text" value={editImage} onChange={e => setEditImage(e.target.value)} className="w-full border border-slate-300 rounded p-2 text-sm" />
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
                  <button onClick={() => { setEditingId(item.id); setEditPrice(item.price.toString()); setEditImage(item.image_url); }} className="mt-auto pt-4 flex items-center text-primary font-bold text-sm hover:underline">
                    <Pencil size={14} className="mr-1" /> Edit Item
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-4">Edit Home Page Category Pictures</h2>
          <div className="space-y-4">
            {Object.entries(categoryImages).map(([key, url]) => (
              <div key={key} className="flex flex-col md:flex-row gap-4 items-start md:items-center border-b pb-4">
                <div className="w-24 h-24 bg-slate-100 rounded-lg overflow-hidden shrink-0">
                  <img src={url as string} alt={key} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 w-full">
                  <label className="text-sm font-bold text-slate-700 block mb-1">{key.replace('cat_', '').toUpperCase()}</label>
                  <input 
                    type="text" 
                    value={url as string} 
                    onChange={e => setCategoryImages(prev => ({ ...prev, [key]: e.target.value }))}
                    className="w-full border border-slate-300 rounded p-2 text-sm" 
                  />
                </div>
              </div>
            ))}
          </div>
          <button onClick={handleSaveCategory} className="w-full mt-6 bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2">
            <Check size={20} /> Save All Category Pictures
          </button>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-4">Edit Home Page Highlights</h2>
          <div className="space-y-4">
            {Object.entries(highlightImages).map(([key, url]) => (
              <div key={key} className="flex flex-col md:flex-row gap-4 items-start md:items-center border-b pb-4">
                <div className="w-24 h-24 bg-slate-100 rounded-lg overflow-hidden shrink-0">
                  <img src={url as string} alt={key} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 w-full">
                  <label className="text-sm font-bold text-slate-700 block mb-1">{key.replace('hl_', '').toUpperCase()}</label>
                  <input 
                    type="text" 
                    value={url as string} 
                    onChange={e => setHighlightImages(prev => ({ ...prev, [key]: e.target.value }))}
                    className="w-full border border-slate-300 rounded p-2 text-sm" 
                  />
                </div>
              </div>
            ))}
          </div>
          <button onClick={handleSaveHighlights} className="w-full mt-6 bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2">
            <Check size={20} /> Save All Highlight Pictures
          </button>
        </div>
      )}
    </div>

  );
}
