import { createRootRoute, Outlet, useLocation, Scripts, HeadContent, ScrollRestoration } from '@tanstack/react-router';
import React, { useState, useEffect } from 'react';
const AmirBotDrawer = React.lazy(() => import('../components/chat/AmirBotDrawer').then(m => ({ default: m.AmirBotDrawer })));
import { OrderTracker } from '../components/orders/OrderTracker';
const CartDrawer = React.lazy(() => import('../components/cart/CartDrawer').then(m => ({ default: m.CartDrawer })));
import { MobileBottomNav } from '../components/navigation/MobileBottomNav';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { HeaderSearch } from '../components/navigation/HeaderSearch';
import { getCartSubtotal } from '../lib/cart';
import '../index.css';

export const Route = createRootRoute({
  component: RootComponent,
  links: () => []
});

function RootComponent() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  const [cartCount, setCartCount] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>([]);

  useEffect(() => {
    const updateLabel = () => {
      const label = document.getElementById('fulfillmentLabel');
      if (label) {
        label.innerText = (localStorage.getItem('fulfillment') || 'delivery') === 'takeaway' ? 'Takeaway' : 'Delivery';
      }
    };
    updateLabel();
    window.addEventListener('fulfillmentUpdated', updateLabel);
    return () => window.removeEventListener('fulfillmentUpdated', updateLabel);
  }, []);

  useEffect(() => {
    const handleStorage = () => {
      try {
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        setCartItems(cart);
        setCartCount(cart.reduce((acc: number, item: any) => acc + item.quantity, 0));
        setCartTotal(getCartSubtotal(cart));
      } catch {
        setCartItems([]);
        setCartCount(0);
        setCartTotal(0);
      }
    };
    handleStorage();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('cartUpdated', handleStorage);
    const handleOpenCart = () => setIsCartOpen(true);
    window.addEventListener('openCart', handleOpenCart);

    // AmirBot: open and toggle events
    const handleOpenBot = () => setChatOpen(true);
    const handleToggleBot = () => setChatOpen(prev => !prev);
    window.addEventListener('openAmirBot', handleOpenBot);
    window.addEventListener('toggleAmirBot', handleToggleBot);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('cartUpdated', handleStorage);
      window.removeEventListener('openCart', handleOpenCart);
      window.removeEventListener('openAmirBot', handleOpenBot);
      window.removeEventListener('toggleAmirBot', handleToggleBot);
    };
  }, []);

  const handleUpdateQuantity = (id: string, delta: number) => {
    const updated = cartItems.map((item: any) => {
      if (item.menu_item_id === id) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    });
    localStorage.setItem('cart', JSON.stringify(updated));
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const handleRemoveItem = (id: string) => {
    const updated = cartItems.filter((item: any) => item.menu_item_id !== id);
    localStorage.setItem('cart', JSON.stringify(updated));
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const handleClearCart = () => {
    localStorage.setItem('cart', JSON.stringify([]));
    window.dispatchEvent(new Event('cartUpdated'));
    setIsCartOpen(false);
  };

  return (
    <html lang="en" style={{ scrollBehavior: 'smooth' }}>
      <head>
        <HeadContent />
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        {isAdmin
          ? <link rel="manifest" href="/admin.webmanifest" />
          : <link rel="manifest" href="/manifest.json" />
        }
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#f97415" />

        <script type="application/ld+json" dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Restaurant",
            "name": "Amir Fast Food",
            "image": "https://amir-fast-food.vercel.app/icons/icon-512.png",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "Post Office Mansoora, Anwar Market, Peco Road, Kakazai",
              "addressLocality": "Lahore",
              "addressCountry": "PK"
            },
            "geo": {
              "@type": "GeoCoordinates",
              "latitude": 31.492160,
              "longitude": 74.290800
            },
            "servesCuisine": "Fast Food, Shawarma, Burgers",
            "priceRange": "PKR",
            "telephone": "+923014265785"
          })
        }} />
      </head>
      <body className="min-h-screen flex flex-col font-sans overflow-x-hidden">

        {/* Public shell: hidden on admin routes */}
        {!isAdmin && (
          <nav className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border/40">
            <div className="container flex h-16 items-center justify-between">
              <a className="flex items-center gap-2.5" href="/">
                <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-primary-foreground"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>
                </div>
                <div className="flex flex-col">
                  <span className="font-display text-lg font-bold tracking-tight leading-tight">Amir</span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary leading-none">Fast Food</span>
                </div>
              </a>
              <div className="flex items-center gap-2 sm:gap-4">
                <a href="/" className="hidden sm:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Home</a>
                <a href="/menu" className="hidden sm:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Menu</a>
                <a href="/locations" className="hidden sm:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Locations</a>

                <HeaderSearch />
                <ThemeSwitcher />

                <button
                  onClick={() => setChatOpen(prev => !prev)}
                  className="relative inline-flex items-center justify-center h-9 w-9 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-colors border border-transparent hover:border-border"
                  aria-label="Toggle AmirBot"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse border border-background"></span>
                </button>

                <a href="/checkout" onClick={(e) => { e.preventDefault(); setIsCartOpen(true); }}>
                  <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none border border-primary bg-primary hover:bg-primary/90 text-primary-foreground h-9 rounded-full px-4 shadow-sm">
                    Cart ({cartCount})
                  </button>
                </a>
              </div>
            </div>
          </nav>
        )}

        {/* Main Content */}
        <main className={`flex-grow flex flex-col ${isAdmin ? '' : 'pb-16 md:pb-0'}`}>
          <span className="sr-only">Amir Fast Food</span>
          <Outlet />
        </main>

        {/* Footer: hidden on admin routes */}
        {!isAdmin && (
          <footer className="border-t border-border/30 bg-card/30">
            <div className="container py-10 sm:py-14">
              <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-primary-foreground"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>
                    </div>
                    <div>
                      <span className="font-display text-lg font-bold">Amir</span>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary block leading-none">Fast Food</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-4">Authentic shawarma, handcrafted burgers, and irresistible combos.</p>
                </div>
                <div className="space-y-3">
                  <h4 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">Links</h4>
                  <div className="flex flex-col gap-3 text-sm">
                    <a href="/menu" className="text-muted-foreground hover:text-foreground transition-colors">Menu</a>
                    <a href="/locations" className="text-muted-foreground hover:text-foreground transition-colors">Locations</a>
                    <button onClick={() => setChatOpen(true)} className="text-left text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                      Ask AmirBot (AI Assistant)
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">Social</h4>
                  <div className="flex gap-3">
                    <a href="https://www.facebook.com/Amirfastfoodofficial/" target="_blank" rel="noopener noreferrer" className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"></path></svg>
                    </a>
                    <a href="https://wa.me/923014265785" target="_blank" rel="noopener noreferrer" className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"></path></svg>
                    </a>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">Contact</h4>
                  <div className="flex flex-col gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-primary/80"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                      <span>+92 301 4265785</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-primary/80"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"></path><circle cx="12" cy="10" r="3"></circle></svg>
                      <span><a href="/locations" className="hover:text-primary transition-colors">Amir Fast Food, Kakazai, Lahore</a></span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-8 border-t border-border/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs text-muted-foreground">&copy; 2026 Amir Fast Food. All rights reserved.</p>
                <div className="flex gap-6 text-xs text-muted-foreground">
                  <a href="/terms" className="hover:text-primary transition-colors">Terms of Use</a>
                  <a href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</a>
                </div>
              </div>
            </div>
          </footer>
        )}

        {/* Public overlays: hidden on admin routes */}
        {!isAdmin && (
          <>
            <MobileBottomNav
              onOpenCart={() => setIsCartOpen(true)}
              onOpenBot={() => setChatOpen(true)}
            />
            <OrderTracker />
            <React.Suspense fallback={null}>
              <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} items={cartItems} onUpdateQuantity={handleUpdateQuantity} onRemoveItem={handleRemoveItem} onClearCart={handleClearCart} />
            </React.Suspense>
          </>
        )}

        {/* AmirBot: rendered when open, hidden on admin routes */}
        {chatOpen && !isAdmin && (
          <React.Suspense fallback={null}>
            <AmirBotDrawer isOpen={chatOpen} onClose={() => setChatOpen(false)} />
          </React.Suspense>
        )}

        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
