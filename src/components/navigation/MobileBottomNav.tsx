import { Link } from '@tanstack/react-router';
import { Home, Menu, Tag, ShoppingCart, MessageSquare } from 'lucide-react';
import { useState, useEffect } from 'react';

export function MobileBottomNav({ 
  onOpenCart, 
  onOpenBot 
}: { 
  onOpenCart: () => void; 
  onOpenBot: () => void; 
}) {
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const handleStorage = () => {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      setCartCount(cart.reduce((acc: number, item: any) => acc + item.quantity, 0));
    };
    handleStorage();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('cartUpdated', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('cartUpdated', handleStorage);
    };
  }, []);

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur border-t border-border pb-safe">
      <div className="flex justify-around items-center h-16">
        <Link to="/" className="flex flex-col items-center justify-center w-full h-full text-muted-foreground [&.active]:text-primary">
          <Home size={20} />
          <span className="text-[10px] mt-1 font-medium">Home</span>
        </Link>
        <Link to="/menu" search={{}} className="flex flex-col items-center justify-center w-full h-full text-muted-foreground [&.active]:text-primary">
          <Menu size={20} />
          <span className="text-[10px] mt-1 font-medium">Menu</span>
        </Link>
        <Link to="/menu" search={{ cat: 'cat_deals' }} className="flex flex-col items-center justify-center w-full h-full text-muted-foreground [&.active]:text-primary">
          <Tag size={20} />
          <span className="text-[10px] mt-1 font-medium">Deals</span>
        </Link>
        <button onClick={onOpenCart} className="relative flex flex-col items-center justify-center w-full h-full text-muted-foreground hover:text-foreground">
          <div className="relative">
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-primary text-black text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1 font-medium">Cart</span>
        </button>
        <button onClick={onOpenBot} className="flex flex-col items-center justify-center w-full h-full text-muted-foreground hover:text-foreground">
          <div className="relative">
            <MessageSquare size={20} />
            <span className="absolute -top-1 -right-1 bg-red-500 w-2 h-2 rounded-full animate-ping"></span>
            <span className="absolute -top-1 -right-1 bg-red-500 w-2 h-2 rounded-full"></span>
          </div>
          <span className="text-[10px] mt-1 font-medium">AmirBot</span>
        </button>
      </div>
    </div>
  );
}
