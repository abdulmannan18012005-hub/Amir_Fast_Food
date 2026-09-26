import { createRootRoute, Outlet, useLocation } from '@tanstack/react-router';
import React, { useState } from 'react';
import { AmirBotDrawer } from '../components/chat/AmirBotDrawer';
import { MobileBottomNav } from '../components/navigation/MobileBottomNav';

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
                <a href="/checkout" className="relative bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition-colors flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                </a>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-grow flex flex-col pb-16 md:pb-0">
          <Outlet />
        </main>

        {/* Footer */}
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

        <MobileBottomNav onOpenCart={() => window.location.href = '/checkout'} onOpenBot={() => {
          const btn = document.querySelector('button[aria-label="Open chat"]') as HTMLButtonElement;
          if (btn) btn.click();
        }} />
        <AmirBotDrawer />
      </body>
    </html>
  );
}
