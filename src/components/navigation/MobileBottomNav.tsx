import { useCartCount } from '../../lib/cart';
import { Link } from '@tanstack/react-router';
import { Home, Menu, ShoppingCart, MessageSquare } from 'lucide-react';
import { useState, useEffect } from 'react';

export function MobileBottomNav({ 
  onOpenCart, 
  onOpenBot 
}: { 
  onOpenCart: () => void; 
  onOpenBot: () => void; 
}) {
  const cartCount = useCartCount();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card text-card-foreground border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center h-16">
        <Link to="/" className="flex flex-col items-center justify-center w-full h-full text-muted-foreground [&.active]:text-primary">
          <Home size={20} />
          <span className="text-xs mt-1 font-medium">Home</span>
        </Link>
        <Link to="/menu" className="flex flex-col items-center justify-center w-full h-full text-muted-foreground [&.active]:text-primary">
          <Menu size={20} />
          <span className="text-xs mt-1 font-medium">Menu</span>
        </Link>
        
        <button onClick={onOpenCart}  className="relative flex flex-col items-center justify-center w-full h-full text-muted-foreground hover:text-foreground">
          <div className="relative">
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </div>
          <span className="text-xs mt-1 font-medium">Cart</span>
        </button>
        <button onClick={onOpenBot}  className="flex flex-col items-center justify-center w-full h-full text-muted-foreground hover:text-foreground">
          <div className="relative">
            <MessageSquare size={20} />
            <span className="absolute -top-1 -right-1 bg-red-500 w-2 h-2 rounded-full animate-ping"></span>
            <span className="absolute -top-1 -right-1 bg-red-500 w-2 h-2 rounded-full"></span>
          </div>
          <span className="text-xs mt-1 font-medium">AmirBot</span>
        </button>
      </div>
    </div>
  );
}
