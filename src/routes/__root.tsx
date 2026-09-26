import { createRootRoute, Outlet, useLocation } from '@tanstack/react-router';
import React from 'react';
import { AmirBotDrawer } from '../components/chat/AmirBotDrawer';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const location = useLocation();
  const path = location.pathname;

  return (
    <html lang="en" className="dark">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Amir Fast Food - 3D Digital Ordering</title>
        <meta property="og:title" content="Amir Fast Food - 3D Digital Ordering" />
        <meta property="og:description" content="Order your favorite fast food with our interactive 3D digital ordering experience." />
        <meta property="og:type" content="website" />
        <script src="https://cdn.tailwindcss.com"></script>
        <style>{`
          body { background-color: #0F172A; color: #F8FAFC; }
          .preserve-3d { transform-style: preserve-3d; }
          .perspective-1000 { perspective: 1000px; }
          .scrollbar-hide::-webkit-scrollbar { display: none; }
          .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
      </head>
      <body className="min-h-screen flex flex-col font-sans">
        {/* Desktop & Mobile Header */}
        <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex-shrink-0 flex items-center gap-2">
                <a href="/">
                  <span className="text-2xl font-extrabold text-red-600 tracking-tight">AMIR<span className="text-white">FASTFOOD</span></span>
                </a>
              </div>
              <nav className="hidden md:flex space-x-8">
                <a href="/" className={`px-3 py-2 text-sm font-medium transition-colors ${path === '/' ? 'text-white' : 'text-slate-300 hover:text-white'}`}>Home</a>
                <a href="/menu" className={`px-3 py-2 text-sm font-medium transition-colors ${path === '/menu' ? 'text-white' : 'text-slate-300 hover:text-white'}`}>Menu</a>
                <a href="/checkout" className={`px-3 py-2 text-sm font-medium transition-colors ${path === '/checkout' ? 'text-white' : 'text-slate-300 hover:text-white'}`}>Checkout</a>
              </nav>
              <div className="flex items-center gap-3">
                <a href="https://wa.me/923001234567" target="_blank" className="hidden sm:flex bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold px-4 py-2 rounded-full text-white transition-colors items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"></path></svg>
                  WhatsApp
                </a>
                <button className="relative bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition-colors flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full border border-slate-900">0</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content — add bottom padding on mobile for nav bar */}
        <main className="flex-grow flex flex-col pb-16 md:pb-0">
          <Outlet />
        </main>

        {/* Footer — hidden on mobile since bottom nav covers it */}
        <footer className="hidden md:block bg-slate-900 border-t border-slate-800 py-12 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <span className="text-xl font-extrabold text-red-600 tracking-tight">AMIR<span className="text-white">FASTFOOD</span></span>
              <p className="text-slate-500 text-sm mt-2">© 2026 Amir Fast Food. All rights reserved.</p>
            </div>
            <div className="flex space-x-6 text-sm text-slate-400">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="/admin/kitchen" className="hover:text-amber-500 transition-colors">Staff KDS</a>
            </div>
          </div>
        </footer>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-around h-16 px-2">
          <a href="/" className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${path === '/' ? 'text-red-500' : 'text-slate-400'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <span className="text-[10px] font-medium">Home</span>
          </a>
          <a href="/menu" className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${path === '/menu' ? 'text-red-500' : 'text-slate-400'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
            <span className="text-[10px] font-medium">Menu</span>
          </a>
          <a href="/menu?cat=cat_deals" className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors text-slate-400`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m20.59 13.41-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" x2="7.01" y1="7" y2="7"/></svg>
            <span className="text-[10px] font-medium">Deals</span>
          </a>
          <a href="/checkout" className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${path === '/checkout' ? 'text-red-500' : 'text-slate-400'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
            <span className="text-[10px] font-medium">Cart</span>
          </a>
        </nav>

        <AmirBotDrawer />
      </body>
    </html>
  );
}
