import { createFileRoute } from '@tanstack/react-router';
import { seo } from '../../lib/seo';
import React, { useEffect, useState } from 'react';
import { supabaseBrowser } from '../../lib/supabase';
import { updateMenuItemFn, getCategoryImagesFn, updateCategoryImagesFn, getHighlightImagesFn, updateHighlightImagesFn } from '../../server/menu';
import { ChefHat, Pencil, Check, X, Image as ImageIcon, Save } from 'lucide-react';
import { PinGate } from '../../components/admin/PinGate';
import { safeJson, getRawSession } from '../../lib/storage';
import type { MenuItem } from '../../types';

export const Route = createFileRoute('/admin/menu')({
  head: () => seo({ title: 'Admin - Amir Fast Food', description: 'Admin Panel', path: '/admin', noindex: true }),
  component: AdminMenuRoute,
});

function AdminMenuRoute() {
  return (
    <PinGate>
      <AdminMenuEditor />
    </PinGate>
  );
}

function AdminMenuEditor() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editImage, setEditImage] = useState('');
  const [editIsAvailable, setEditIsAvailable] = useState(true);
  const [activeTab, setActiveTab] = useState<'items' | 'categories' | 'highlights'>('items');
  const [highlightImages, setHighlightImages] = useState<Record<string, string>>({});
  const [categoryImages, setCategoryImages] = useState<Record<string, string>>({});
  const [activeAdminCategory, setActiveAdminCategory] = useState<string>('all');

  useEffect(() => {
    const fetchItems = async () => {
      const { data } = await supabaseBrowser.from('menu_items').select('*');
      if (data) {
        data.sort((a, b) => {
          if (a.category_id === 'cat_deals' && b.category_id === 'cat_deals') {
            const numA = parseInt((a.name.match(/\d+/) || [0])[0] as string);
            const numB = parseInt((b.name.match(/\d+/) || [0])[0] as string);
            return numA - numB;
          }
          return a.name.localeCompare(b.name);
        });
        setItems(data as MenuItem[]);
      }
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
  }, []);

  const handleSaveHighlights = async () => {
    try {
      const pin = getRawSession('admin_pin') || '';
      await updateHighlightImagesFn({ data: { data: highlightImages, pin } });
      alert('Highlight images updated successfully!');
    } catch (e: any) {
      alert(e.message || 'Failed to update highlight images');
    }
  };

  const handleSaveCategory = async () => {
    try {
      const pin = getRawSession('admin_pin') || '';
      await updateCategoryImagesFn({ data: { data: categoryImages, pin } });
      alert('Category images updated successfully!');
    } catch (e: any) {
      alert(e.message || 'Failed to update category images');
    }
  };

  const handleSaveItem = async (id: string) => {
    try {
      const pin = getRawSession('admin_pin') || '';
      const price = parseFloat(editPrice);
      if (isNaN(price)) return alert('Invalid price');

      await updateMenuItemFn({ data: { id, price, image_url: editImage, is_available: editIsAvailable, pin } });
      
      setItems(prev => prev.map(item => item.id === id ? { ...item, price, image_url: editImage, is_available: editIsAvailable } : item));
      setEditingId(null);
    } catch (e: any) {
      alert(e.message || 'Failed to update item!');
    }
  };

  const categories = Array.from(new Set(items.map(i => i.category_id))).sort();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <header className="bg-white border-b border-border px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <ChefHat className="text-primary" size={28} />
          <h1 className="text-xl font-bold text-slate-900">Menu Editor</h1>
        </div>
        <div className="flex bg-slate-100 rounded-lg p-1">
          <button onClick={() => setActiveTab('items')} className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${activeTab === 'items' ? 'bg-white shadow text-primary' : 'text-slate-600 hover:bg-slate-200'}`}>Items</button>
          <button onClick={() => setActiveTab('categories')} className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${activeTab === 'categories' ? 'bg-white shadow text-primary' : 'text-slate-600 hover:bg-slate-200'}`}>Categories</button>
          <button onClick={() => setActiveTab('highlights')} className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${activeTab === 'highlights' ? 'bg-white shadow text-primary' : 'text-slate-600 hover:bg-slate-200'}`}>Highlights</button>
        </div>
      </header>

      <div className="p-6 max-w-6xl mx-auto">
        {activeTab === 'items' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-wrap gap-2 mb-6">
               <button 
                 onClick={() => setActiveAdminCategory('all')}
                 className={`px-4 py-2 rounded-full text-sm font-bold transition-colors border ${activeAdminCategory === 'all' ? 'bg-primary text-white border-primary' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
               >
                 All Items
               </button>
               {categories.map(cat => (
                 <button 
                   key={cat}
                   onClick={() => setActiveAdminCategory(cat)}
                   className={`px-4 py-2 rounded-full text-sm font-bold transition-colors border ${activeAdminCategory === cat ? 'bg-primary text-white border-primary' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                 >
                   {cat.replace('cat_', '').replace(/_/g, ' ').toUpperCase()}
                 </button>
               ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.filter(i => activeAdminCategory === 'all' || i.category_id === activeAdminCategory).map(item => (
                <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                  {editingId === item.id ? (
                    <div className="p-4 flex-1">
                      <div className="mb-4 text-sm font-bold text-slate-500 uppercase">{item.category_id.replace('cat_', '')}</div>
                      <h3 className="font-bold text-lg mb-4">{item.name}</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex">Price (PKR)</label>
                          <input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-primary" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><ImageIcon size={14}/> Image URL</label>
                          <input type="text" value={editImage} onChange={e => setEditImage(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-primary text-sm" />
                        </div>
                        <div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={editIsAvailable} onChange={e => setEditIsAvailable(e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary" />
                            <span className="text-sm font-bold text-slate-700">In Stock</span>
                          </label>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-6">
                        <button onClick={() => setEditingId(null)} className="flex-1 bg-slate-100 text-slate-700 font-bold py-2 rounded-lg flex items-center justify-center gap-1"><X size={16}/> Cancel</button>
                        <button onClick={() => handleSaveItem(item.id)} className="flex-1 bg-primary text-primary-foreground font-bold py-2 rounded-lg flex items-center justify-center gap-1"><Check size={16}/> Save</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="aspect-[4/3] w-full bg-slate-100 relative">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 flex-col gap-2">
                            <ImageIcon size={32} />
                            <span className="text-sm font-medium">No Image</span>
                          </div>
                        )}
                        {!item.is_available && (
                          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
                            <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border border-red-200">Out of Stock</span>
                          </div>
                        )}
                      </div>
                      <div className="p-4 flex flex-col flex-1">
                         <div className="flex justify-between items-start mb-2">
                           <div>
                             <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">{item.category_id.replace('cat_', '')}</p>
                             <h3 className="font-bold text-slate-900 leading-tight">{item.name}</h3>
                           </div>
                           <p className="font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-lg">Rs {item.price}</p>
                         </div>
                         <button 
                           onClick={() => {
                             setEditingId(item.id);
                             setEditPrice(item.price.toString());
                             setEditImage(item.image_url || '');
                             setEditIsAvailable(item.is_available);
                           }}
                           className="mt-auto w-full border border-slate-200 hover:border-primary hover:text-primary text-slate-600 font-bold py-2 rounded-xl flex items-center justify-center gap-2 transition-colors"
                         >
                           <Pencil size={16} /> Edit Details
                         </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="animate-in fade-in max-w-2xl mx-auto">
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-slate-900">Category Cover Images</h2>
                <button onClick={handleSaveCategory} className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm">
                  <Save size={18} /> Save Changes
                </button>
              </div>
              <p className="text-slate-500 mb-8">Set the 16:9 banner images shown at the top of the menu when a category is selected.</p>
              
              <div className="space-y-6">
                {categories.map(cat => (
                   <div key={cat} className="flex gap-4 items-center">
                      <div className="w-1/3">
                        <p className="font-bold text-slate-700 capitalize">{cat.replace('cat_', '').replace(/_/g, ' ')}</p>
                      </div>
                      <div className="w-2/3">
                        <input 
                          type="text" 
                          value={categoryImages[cat] || ''} 
                          onChange={(e) => setCategoryImages({...categoryImages, [cat]: e.target.value})}
                          className="w-full bg-slate-50 border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary text-sm"
                          placeholder="https://images.unsplash.com/..."
                        />
                      </div>
                   </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'highlights' && (
          <div className="animate-in fade-in max-w-2xl mx-auto">
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-slate-900">Featured Highlight Carousel</h2>
                <button onClick={handleSaveHighlights} className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm">
                  <Save size={18} /> Save Carousel
                </button>
              </div>
              <p className="text-slate-500 mb-8">Set the 16:9 images shown in the auto-scrolling carousel on the home page.</p>
              
              <div className="space-y-6">
                {[1, 2, 3].map(num => (
                   <div key={num} className="flex gap-4 items-center">
                      <div className="w-1/4">
                        <p className="font-bold text-slate-700">Slide {num}</p>
                      </div>
                      <div className="w-3/4">
                        <input 
                          type="text" 
                          value={highlightImages[`slide${num}`] || ''} 
                          onChange={(e) => setHighlightImages({...highlightImages, [`slide${num}`]: e.target.value})}
                          className="w-full bg-slate-50 border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary text-sm"
                          placeholder="https://images.unsplash.com/..."
                        />
                      </div>
                   </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
