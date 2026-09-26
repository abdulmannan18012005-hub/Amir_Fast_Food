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
    <html lang="en" className="dark" style={{ scrollBehavior: 'smooth' }}>
      <head>
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
          body { background-color: hsl(var(--background)); color: hsl(var(--foreground)); }
          .glass { border-bottom-width: 1px; border-color: hsl(var(--border) / 0.5); background-color: hsl(var(--background) / 0.8); backdrop-filter: blur(24px); }
          .gradient-primary { background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8)); }
          .text-gradient { -webkit-background-clip: text; background-clip: text; color: transparent; background-image: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7)); }
        `}}></style>
      </head>
      <body className="min-h-screen flex flex-col font-sans overflow-x-hidden">
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 glass">
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
              <a href="/menu" className="hidden sm:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Menu</a>
              <a href="/menu" className="hidden sm:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Locations</a>
              <a href="/checkout">
                <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 rounded-md px-3">
                  Checkout
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
                <p className="text-sm text-muted-foreground">Authentic shawarma, handcrafted burgers, and irresistible combos.</p>
              </div>
              <div className="space-y-3">
                <h4 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground">Links</h4>
                <div className="flex flex-col gap-2 text-sm">
                  <a href="/menu" className="text-muted-foreground hover:text-foreground transition-colors">Menu</a>
                  <a href="/checkout" className="text-muted-foreground hover:text-foreground transition-colors">Checkout</a>
                </div>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-border/20 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">© 2026 Amir Fast Food. All rights reserved.</p>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>Terms of Use</span>
                <span>Privacy Policy</span>
              </div>
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
