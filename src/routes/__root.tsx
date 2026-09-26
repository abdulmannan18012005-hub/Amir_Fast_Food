import { createRootRoute, Outlet, useLocation, Scripts, HeadContent, ScrollRestoration } from '@tanstack/react-router';
import React, { useState } from 'react';
import { AmirBotDrawer } from '../components/chat/AmirBotDrawer';
import { MobileBottomNav } from '../components/navigation/MobileBottomNav';

import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { HeaderSearch } from '../components/navigation/HeaderSearch';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const location = useLocation();
  const path = location.pathname;

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
              <HeaderSearch />
              <ThemeSwitcher />
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
                <p className="text-sm text-muted-foreground mt-4">Authentic shawarma, handcrafted burgers, and irresistible combos.</p>
              </div>
              <div className="space-y-3">
                <h4 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">Links</h4>
                <div className="flex flex-col gap-3 text-sm">
                  <a href="/menu" className="text-muted-foreground hover:text-foreground transition-colors">Menu</a>
                  <a href="/menu" className="text-muted-foreground hover:text-foreground transition-colors">Locations</a>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">Social</h4>
                <div className="flex gap-3">
                  <a href="#" className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"></path></svg>
                  </a>
                  <a href="#" className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"></path></svg>
                  </a>
                  <a href="#" className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"></path></svg>
                  </a>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">Contact</h4>
                <div className="flex flex-col gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-primary/80"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                    <span>(11) 99999-9999</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-primary/80"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    <span>São Paulo, SP</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t border-border/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-muted-foreground">© 2026 Amir Fast Food. All rights reserved.</p>
              <div className="flex gap-6 text-xs text-muted-foreground">
                <a href="#" className="hover:text-primary transition-colors">Terms of Use</a>
                <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
              </div>
            </div>
          </div>
        </footer>

        <MobileBottomNav onOpenCart={() => window.location.href = '/checkout'} onOpenBot={() => {
          const btn = document.querySelector('button[aria-label="Open chat"]') as HTMLButtonElement;
          if (btn) btn.click();
        }} />
        <AmirBotDrawer />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
