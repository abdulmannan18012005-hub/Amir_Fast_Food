import { Link } from '@tanstack/react-router';
import React from 'react';
import type { CartItem } from '../../types';
import { getCartSubtotal, lineTotal } from '../../lib/cart';
import { useShopStatus } from '../../hooks/useShopStatus';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  items: (CartItem & { name: string; image_url: string })[];
  onUpdateQuantity: (menu_item_id: string, delta: number) => void;
  onRemoveItem: (menu_item_id: string) => void;
  onClearCart: () => void;
}

export function CartDrawer({ isOpen, onClose, items, onUpdateQuantity, onRemoveItem, onClearCart }: Props) {
  const shopStatus = useShopStatus();
  const subtotal = getCartSubtotal(items);
  
  
  

  // Delivery/COD fees are calculated at checkout (depend on distance + payment method)
  const total = subtotal;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40" 
          onClick={onClose} 
        />
      )}
      
      {/* Drawer */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-card shadow-2xl z-50 transform transition-transform duration-300 border-l border-border flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 border-b border-border flex justify-between items-center bg-card">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            Your Order <span className="bg-primary text-xs px-2 py-1 rounded-full">{items.length}</span>
          </h2>
          <div className="flex items-center gap-4">
            {items.length > 0 && (
              <button onClick={onClearCart} className="text-sm text-destructive hover:text-destructive/80 font-bold">Clear Cart</button>
            )}
            <button onClick={onClose} aria-label="Close cart drawer" className="text-muted-foreground hover:text-foreground">
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto p-6 space-y-6">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <svg width="64" height="64" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1" className="mb-4 opacity-50"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
              <p className="mb-6">Your cart is empty</p>
              <Link to="/menu" onClick={onClose} preload="intent" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 px-6 rounded-full transition-colors shadow-md">
                Browse Menu
              </Link>
            </div>
          ) : (
            items.map((item, idx) => {
              const varsTotal = item.variants?.reduce((s, v) => s + (v.price || 0), 0) || 0;
              const lineTotal = ((item.price || 0) + varsTotal) * item.quantity;
              return (
                <div key={idx} className="flex gap-4 border-b border-border pb-4">
                  <img src={item.image_url} alt={item.name} className="w-20 h-20 object-cover rounded-lg" />
                  <div className="flex-1">
                    <h3 className="text-foreground font-bold">{item.name}</h3>
                    {item.variants && item.variants.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        + {item.variants.map(v => v.name).join(', ')}
                      </p>
                    )}
                    <div className="flex justify-between items-end mt-2">
                      <div className="flex gap-4 items-center">
                        <div className="flex items-center bg-accent rounded">
                          <button onClick={() => onUpdateQuantity(item.menu_item_id, -1)} aria-label="Decrease quantity" className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground">-</button>
                          <span className="w-8 text-center text-foreground text-sm">{item.quantity}</span>
                          <button onClick={() => onUpdateQuantity(item.menu_item_id, 1)} aria-label="Increase quantity" className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground">+</button>
                        </div>
                        <button onClick={() => onRemoveItem(item.menu_item_id)} aria-label="Remove item" className="text-xs text-destructive font-bold hover:underline">Remove</button>
                      </div>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">PKR {lineTotal}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {items.length > 0 && (
          <div className="p-6 bg-background border-t border-border space-y-4">
            <div className="rounded-xl bg-accent/60 p-3 text-xs text-muted-foreground border border-border/50">
              Free delivery within 5 km. Delivery beyond 5 km and COD fees under PKR 1,000 apply at checkout.
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>PKR {subtotal}</span>
            </div>
            <div className="flex justify-between text-muted-foreground items-center text-sm">
              <span>Delivery &amp; fees</span>
              <span className="text-xs text-muted-foreground">Calculated at checkout</span>
            </div>
            <div className="flex justify-between text-foreground text-xl font-bold pt-4 border-t border-border">
              <span>Total</span>
              <span>PKR {total}</span>
            </div>
            {!shopStatus.open && (
              <div role="alert" className="rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 p-3 text-xs font-semibold leading-relaxed">
                {shopStatus.closedMessage}
              </div>
            )}
            <Link to="/checkout" onClick={onClose} preload="intent" className="block w-full bg-primary hover:bg-primary/90 text-primary-foreground text-center font-bold py-4 rounded-xl shadow-lg transition-colors">
              Proceed to Checkout
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
