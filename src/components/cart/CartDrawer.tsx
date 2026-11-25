import { Link } from '@tanstack/react-router';
import React from 'react';
import { Trash2 } from 'lucide-react';
import type { CartItem, ItemVariant } from '../../types';
import { getCartSubtotal, lineTotal, getCartLineId } from '../../lib/cart';
import { useShopStatus } from '../../hooks/useShopStatus';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  items: (CartItem & { name: string; image_url: string })[];
  onUpdateQuantity: (menu_item_id: string, variants: ItemVariant[], delta: number) => void;
  onRemoveItem: (menu_item_id: string, variants: ItemVariant[]) => void;
  onClearCart: () => void;
}

export function CartDrawer({ isOpen, onClose, items, onUpdateQuantity, onRemoveItem, onClearCart }: Props) {
  const shopStatus = useShopStatus();
  if (!isOpen) return null;

  const subtotal = getCartSubtotal(items);
  const totalCount = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const total = subtotal;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 z-40" 
        onClick={onClose} 
        aria-hidden="true"
      />
      
      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Shopping Cart"
        className="fixed top-0 right-0 h-full w-full max-w-md bg-card shadow-2xl z-50 border-l border-border flex flex-col animate-in slide-in-from-right duration-200"
      >
        <div className="p-6 border-b border-border flex justify-between items-center bg-card">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            Your Order <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">{totalCount}</span>
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
            items.map((item) => {
              const itemTotal = lineTotal(item);
              const lineKey = getCartLineId(item.menu_item_id, item.variants || []);
              return (
                <div key={lineKey} className="flex gap-4 border-b border-border pb-4">
                  <img src={item.image_url || '/placeholder.webp'} alt={item.name} onError={(e) => { e.currentTarget.src = '/placeholder.webp'; }} className="w-20 h-20 object-cover rounded-lg bg-muted shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-foreground font-bold truncate">{item.name}</h3>
                    {item.variants && item.variants.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        + {item.variants.map(v => v.name).join(', ')}
                      </p>
                    )}
                    <div className="flex justify-between items-center mt-2 gap-2">
                      <div className="flex gap-2 items-center">
                        <div className="flex items-center bg-accent rounded-lg">
                          <button type="button" onClick={() => onUpdateQuantity(item.menu_item_id, item.variants || [], -1)} aria-label={`Decrease quantity of ${item.name}`} className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground font-bold">-</button>
                          <span className="w-8 text-center text-foreground text-sm font-semibold">{item.quantity}</span>
                          <button type="button" onClick={() => onUpdateQuantity(item.menu_item_id, item.variants || [], 1)} aria-label={`Increase quantity of ${item.name}`} className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground font-bold">+</button>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.menu_item_id, item.variants || [])}
                          aria-label={`Remove ${item.name}`}
                          title="Remove item"
                          className="min-w-[40px] min-h-[40px] p-2 rounded-lg text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                        >
                          <Trash2 size={18} aria-hidden="true" />
                        </button>
                      </div>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">PKR {itemTotal.toLocaleString()}</span>
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
              <span>PKR {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-muted-foreground items-center text-sm">
              <span>Delivery &amp; fees</span>
              <span className="text-xs text-muted-foreground">Calculated at checkout</span>
            </div>
            <div className="flex justify-between text-foreground text-xl font-bold pt-4 border-t border-border">
              <span>Total</span>
              <span>PKR {total.toLocaleString()}</span>
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