import React from 'react';
import type { CartItem } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  items: (CartItem & { name: string; image_url: string })[];
  onUpdateQuantity: (menu_item_id: string, delta: number) => void;
}

export function CartDrawer({ isOpen, onClose, items, onUpdateQuantity }: Props) {
  const subtotal = items.reduce((sum, item) => {
    const varsTotal = item.variants.reduce((vSum, v) => vSum + v.price, 0);
    return sum + (item.price + varsTotal) * item.quantity;
  }, 0);
  
  const deliveryFee = subtotal < 1000 && subtotal > 0 ? 100 : 0;
  const total = subtotal + deliveryFee;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" 
          onClick={onClose} 
        />
      )}
      
      {/* Drawer */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-slate-900 shadow-2xl z-50 transform transition-transform duration-300 border-l border-slate-800 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/90 backdrop-blur">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Your Order <span className="bg-red-600 text-xs px-2 py-1 rounded-full">{items.length}</span>
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-6 space-y-6">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500">
              <svg width="64" height="64" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1" className="mb-4 opacity-50"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
              <p>Your cart is empty</p>
            </div>
          ) : (
            items.map((item, idx) => {
              const varsTotal = item.variants.reduce((s, v) => s + v.price, 0);
              const lineTotal = (item.price + varsTotal) * item.quantity;
              return (
                <div key={idx} className="flex gap-4 border-b border-slate-800 pb-4">
                  <img src={item.image_url} alt={item.name} className="w-20 h-20 object-cover rounded-lg" />
                  <div className="flex-1">
                    <h4 className="text-white font-bold">{item.name}</h4>
                    {item.variants.length > 0 && (
                      <p className="text-xs text-slate-400 mt-1">
                        + {item.variants.map(v => v.name).join(', ')}
                      </p>
                    )}
                    <div className="flex justify-between items-end mt-2">
                      <div className="flex items-center bg-slate-800 rounded">
                        <button onClick={() => onUpdateQuantity(item.menu_item_id, -1)} className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-white">-</button>
                        <span className="w-8 text-center text-white text-sm">{item.quantity}</span>
                        <button onClick={() => onUpdateQuantity(item.menu_item_id, 1)} className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-white">+</button>
                      </div>
                      <span className="font-bold text-emerald-400">PKR {lineTotal}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {items.length > 0 && (
          <div className="p-6 bg-slate-950 border-t border-slate-800 space-y-4">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal</span>
              <span>PKR {subtotal}</span>
            </div>
            <div className="flex justify-between text-slate-400 items-center">
              <span>Delivery Fee</span>
              {deliveryFee === 0 ? (
                <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2 py-1 rounded">FREE Delivery</span>
              ) : (
                <span>PKR {deliveryFee}</span>
              )}
            </div>
            <div className="flex justify-between text-white text-xl font-bold pt-4 border-t border-slate-800">
              <span>Total</span>
              <span>PKR {total}</span>
            </div>
            <a href="/checkout" className="block w-full bg-red-600 hover:bg-red-500 text-white text-center font-bold py-4 rounded-xl shadow-lg transition-colors">
              Proceed to Checkout
            </a>
          </div>
        )}
      </div>
    </>
  );
}
