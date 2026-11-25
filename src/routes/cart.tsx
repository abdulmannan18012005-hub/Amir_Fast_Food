import { createFileRoute } from '@tanstack/react-router';
import { seo } from '../lib/seo';
import React from 'react';
import { useShopStatus } from '../hooks/useShopStatus';
import { SHOP_HOURS_DISPLAY } from '../lib/shop';

export const Route = createFileRoute('/cart')({
  head: () => seo({ title: 'Your Cart - Amir Fast Food', description: 'Review your cart at Amir Fast Food.', path: '/cart' }),
  component: CartPage,
});

function CartPage() {
  const shopStatus = useShopStatus();

  React.useEffect(() => {
    window.dispatchEvent(new Event('openCart'));
  }, []);
  
  return (
    <div className="container mx-auto px-4 py-12 sm:py-20 min-h-[70vh] flex flex-col items-center justify-center w-full min-w-0">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary" aria-hidden="true" focusable="false"><circle cx="8" cy="21" r="1"></circle><circle cx="19" cy="21" r="1"></circle><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path></svg>
        </div>
        <h1 className="text-3xl font-bold font-display text-foreground">Your Cart</h1>
        <p className="text-muted-foreground">
          Review your items and proceed to checkout when ready. Ordering hours: {SHOP_HOURS_DISPLAY} (PKT).
        </p>
        {!shopStatus.open && (
          <div role="alert" className="p-3.5 bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 rounded-2xl text-xs font-semibold leading-relaxed">
            {shopStatus.closedMessage}
          </div>
        )}
        <button onClick={() => window.dispatchEvent(new Event('openCart'))} className="bg-primary text-primary-foreground px-8 py-3 rounded-full font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors mt-4">
          View Cart
        </button>
      </div>
    </div>
  );
}
