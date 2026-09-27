import { createRootRoute, Outlet, useLocation, Scripts, HeadContent, ScrollRestoration } from '@tanstack/react-router';
import React, { useState } from 'react';
import { AmirBotDrawer } from '../components/chat/AmirBotDrawer';
import { CartDrawer } from '../components/cart/CartDrawer';
import { MobileBottomNav } from '../components/navigation/MobileBottomNav';

import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { HeaderSearch } from '../components/navigation/HeaderSearch';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const location = useLocation();
  const path = location.pathname;
  
  const [cartCount, setCartCount] = React.useState(0);
  const [cartTotal, setCartTotal] = React.useState(0);
  const [isCartOpen, setIsCartOpen] = React.useState(false);
  const [cartItems, setCartItems] = React.useState([]);

  
  React.useEffect(() => {
    const updateLabel = () => {
      const label = document.getElementById('fulfillmentLabel');
      if (label) {
        label.innerText = (localStorage.getItem('fulfillment') || 'delivery') === 'takeaway' ? 'Takeaway 🏪' : 'Delivery 🛵';
      }
    };
    updateLabel();
    window.addEventListener('fulfillmentUpdated', updateLabel);
    return () => window.removeEventListener('fulfillmentUpdated', updateLabel);
  }, []);

  React.useEffect(() => {
    const handleStorage = () => {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      setCartItems(cart);
      setCartCount(cart.reduce((acc, item) => acc + item.quantity, 0));
      setCartTotal(cart.reduce((acc, item) => {
        const varsTotal = item.variants?.reduce((vSum, v) => vSum + (v.price || 0), 0) || 0;
        return acc + ((item.price || 0) + varsTotal) * item.quantity;
      }, 0));
    };
    handleStorage();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('cartUpdated', handleStorage);
    const handleOpenCart = () => setIsCartOpen(true);
    window.addEventListener('openCart', handleOpenCart);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('cartUpdated', handleStorage);
      window.removeEventListener('openCart', handleOpenCart);
    };
  }, []);

  const handleUpdateQuantity = (id, delta) => {
    const updated = cartItems.map(item => {
      if (item.menu_item_id === id) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    });
    localStorage.setItem('cart', JSON.stringify(updated));
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const handleRemoveItem = (id) => {
    const updated = cartItems.filter(item => item.menu_item_id !== id);
    localStorage.setItem('cart', JSON.stringify(updated));
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const handleClearCart = () => {
    localStorage.setItem('cart', JSON.stringify([]));
    window.dispatchEvent(new Event('cartUpdated'));
    setIsCartOpen(false);
  };


  return (
    <html lang="en" className="dark" style={{ scrollBehavior: 'smooth' }}>
      <head>
        <HeadContent />
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
        <title>Amir Fast Food - Shawarma, Burgers & Combos</title>
        <meta name="theme-color" content="#e8590c" />
        <script src="https://cdn.tailwindcss.com"></script>
        <script dangerouslySetInnerHTML={{ __html: `
          tailwind.config = {
            darkMode: 'class',
            theme: {
              container: { center: true, padding: '1rem', screens: { '2xl': '1400px' } },
              extend: {
                fontFamily: {
                  sans: ['ui-sans-serif', 'system-ui', 'sans-serif'],
                  display: ['ui-sans-serif', 'system-ui', 'sans-serif'],
                },
                colors: {
                  border: 'hsl(var(--border))',
                  input: 'hsl(var(--input))',
                  ring: 'hsl(var(--ring))',
                  background: 'hsl(var(--background))',
                  foreground: 'hsl(var(--foreground))',
                  primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
                  secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
                  destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
                  muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
                  accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
                  popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
                  card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
                },
                borderRadius: {
                  lg: 'var(--radius)',
                  md: 'calc(var(--radius) - 2px)',
                  sm: 'calc(var(--radius) - 4px)',
                }
              }
            }
          }
        `}}></script>
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --background: 30 20% 98%; --foreground: 220 20% 10%;
            --card: 0 0% 100%; --card-foreground: 220 20% 10%;
            --popover: 0 0% 100%; --popover-foreground: 220 20% 10%;
            --primary: 25 95% 53%; --primary-foreground: 0 0% 100%;
            --secondary: 30 14% 94%; --secondary-foreground: 220 20% 10%;
            --muted: 30 14% 94%; --muted-foreground: 220 10% 46%;
            --accent: 25 95% 95%; --accent-foreground: 25 95% 30%;
            --destructive: 0 84% 60%; --destructive-foreground: 0 0% 100%;
            --border: 30 13% 89%; --input: 30 13% 89%; --ring: 25 95% 53%;
            --radius: 0.75rem;
          }
          .dark {
            --background: 220 20% 4%; --foreground: 220 10% 95%;
            --card: 220 18% 7%; --card-foreground: 220 10% 95%;
            --popover: 220 18% 7%; --popover-foreground: 220 10% 95%;
            --primary: 25 95% 53%; --primary-foreground: 0 0% 100%;
            --secondary: 220 15% 12%; --secondary-foreground: 220 10% 90%;
            --muted: 220 15% 12%; --muted-foreground: 220 10% 55%;
            --accent: 25 95% 12%; --accent-foreground: 25 95% 70%;
            --destructive: 0 72% 45%; --destructive-foreground: 0 0% 100%;
            --border: 220 15% 15%; --input: 220 15% 15%; --ring: 25 95% 53%;
          }
          body { background-color: hsl(var(--background)); color: hsl(var(--foreground)); transition: background-color 0.3s ease, color 0.3s ease; }
          .glass { border-bottom-width: 1px; border-color: hsl(var(--border) / 0.5); background-color: hsl(var(--background) / 0.8); backdrop-filter: blur(24px); }
          .gradient-primary { background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8)); }
          .text-gradient { -webkit-background-clip: text; background-clip: text; color: transparent; background-image: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7)); }
        `}}></style>
      </head>
      <body className="min-h-screen flex flex-col font-sans overflow-x-hidden">
        {/* Navigation */}
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
                <button 
                  onClick={() => {
                    const current = localStorage.getItem('fulfillment') || 'delivery';
                    const next = current === 'delivery' ? 'takeaway' : 'delivery';
                    localStorage.setItem('fulfillment', next);
                    window.dispatchEvent(new Event('fulfillmentUpdated'));
                    window.dispatchEvent(new Event('cartUpdated')); // Force total refresh if needed
                  }}
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-accent text-accent-foreground text-xs font-bold rounded-full hover:bg-accent/80 transition-colors border border-border"
                  title="Toggle Delivery / Takeaway"
                >
                  <span id="fulfillmentLabel">Delivery 🛵</span>
                </button>
              <HeaderSearch />
              <ThemeSwitcher />
              
              <button 
                onClick={() => window.dispatchEvent(new Event('toggleAmirBot'))}
                className="relative inline-flex items-center justify-center h-9 w-9 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-colors border border-transparent hover:border-border"
                aria-label="Toggle AmirBot"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse border border-background"></span>
              </button>

              <a href="/checkout" onClick={(e) => {
                e.preventDefault();
                setIsCartOpen(true);
              }}>
                <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none border border-primary bg-primary hover:bg-primary/90 text-primary-foreground h-9 rounded-full px-4 shadow-sm">
                  🛒 Cart ({cartCount}) • PKR {cartTotal}
                </button>
              </a>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-grow flex flex-col pb-16 md:pb-0">
          <Outlet />
        </main>

        {/* Footer */}
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
                  <button onClick={() => window.dispatchEvent(new Event('toggleAmirBot'))} className="text-left text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                    🤖 Ask AmirBot (AI Assistant)
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
              <p className="text-xs text-muted-foreground">© 2026 Amir Fast Food. All rights reserved.</p>
              <div className="flex gap-6 text-xs text-muted-foreground">
                <a href="/terms" className="hover:text-primary transition-colors">Terms of Use</a>
                <a href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</a>
              </div>
            </div>
          </div>
        </footer>

        <MobileBottomNav onOpenCart={() => setIsCartOpen(true)} onOpenBot={() => {
          const btn = document.querySelector('button[aria-label="Open chat"]') as HTMLButtonElement;
          if (btn) btn.click();
        }} />
        <AmirBotDrawer />
        <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} items={cartItems} onUpdateQuantity={handleUpdateQuantity} onRemoveItem={handleRemoveItem} onClearCart={handleClearCart} />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
