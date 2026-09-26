import { createFileRoute } from '@tanstack/react-router';
import React from 'react';

export const Route = createFileRoute('/')({
  component: IndexPage,
});

function IndexPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-[100svh] flex items-end">
        <div className="absolute inset-0">
          <img src="https://amirfastfood.vercel.app/assets/hero-food-DECPAvMU.jpg" alt="Amir Fast Food — Shawarma & Burgers" className="h-full w-full object-cover" loading="eager" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/10"></div>
        </div>
        <div className="relative container mx-auto px-4 pb-12 pt-32 sm:pb-20 md:pb-28">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-1 w-10 rounded-full gradient-primary"></div>
              <span className="text-sm font-medium text-primary uppercase tracking-wider">Amir Fast Food</span>
            </div>
            <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl md:text-7xl leading-[0.95]">
              The flavor that finds you <span className="text-gradient">.</span>
            </h1>
            <p className="mt-5 text-base text-muted-foreground sm:text-lg md:text-xl max-w-lg">
              Authentic shawarma, smash burgers and irresistible combos. Restaurants, food trailers & delivery — always near you.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="/menu">
                <button className="inline-flex items-center justify-center whitespace-nowrap font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary hover:bg-primary/90 h-11 gradient-primary text-primary-foreground gap-2 px-6 sm:px-8 py-6 text-base rounded-2xl">
                  Order Now
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                </button>
              </a>
              <a href="/menu">
                <button className="inline-flex items-center justify-center whitespace-nowrap font-medium ring-offset-background transition-colors focus-visible:outline-none border bg-background hover:bg-accent hover:text-accent-foreground h-11 gap-2 px-6 sm:px-8 py-6 text-base rounded-2xl border-border/50">
                  View Menu
                </button>
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-4 sm:gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-primary"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>
                <span>Near you</span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-primary"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                <span>Ready in 10 minutes</span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-primary"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>
                <span>Made fresh</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Menu Highlights Section */}
      <section className="container mx-auto px-4 py-16 sm:py-20 md:py-28">
        <div className="text-center mb-10 sm:mb-14">
          <span className="text-sm font-medium text-primary uppercase tracking-wider">Menu</span>
          <h2 className="font-display text-2xl sm:text-3xl font-bold mt-2 md:text-5xl">Our <span className="text-gradient">highlights</span></h2>
        </div>
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3">
          <div className="group relative overflow-hidden rounded-2xl sm:rounded-3xl bg-card border border-border/30">
            <div className="aspect-square overflow-hidden">
              <img src="https://amirfastfood.vercel.app/assets/food-shawarma-0HL7THD0.jpg" alt="Classic Shawarma" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
              <h3 className="font-display text-lg sm:text-xl font-bold">Classic Shawarma</h3>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Spit-roasted meat, garlic sauce & artisan pita bread</p>
            </div>
          </div>
          <div className="group relative overflow-hidden rounded-2xl sm:rounded-3xl bg-card border border-border/30">
            <div className="aspect-square overflow-hidden">
              <img src="https://amirfastfood.vercel.app/assets/food-burger-B13oD7Kh.jpg" alt="Smash Burger" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
              <h3 className="font-display text-lg sm:text-xl font-bold">Smash Burger</h3>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Exclusive blend, 200g of pure smashed beef</p>
            </div>
          </div>
          <div className="group relative overflow-hidden rounded-2xl sm:rounded-3xl bg-card border border-border/30">
            <div className="aspect-square overflow-hidden">
              <img src="https://amirfastfood.vercel.app/assets/food-combo-BbZhBSG3.jpg" alt="Combos" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
              <h3 className="font-display text-lg sm:text-xl font-bold">Combos</h3>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Burger + fries + drink at a special price</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works Section */}
      <section className="bg-card/50 border-y border-border/30">
        <div className="container mx-auto px-4 py-16 sm:py-20 md:py-28">
          <div className="text-center mb-10 sm:mb-14">
            <span className="text-sm font-medium text-primary uppercase tracking-wider">Simple</span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold mt-2 md:text-4xl">How it works</h2>
          </div>
          <div className="grid gap-8 grid-cols-1 sm:grid-cols-3 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="mx-auto mb-4 h-14 w-14 sm:h-16 sm:w-16 rounded-2xl gradient-primary flex items-center justify-center">
                <span className="font-display text-xl sm:text-2xl font-bold text-primary-foreground">01</span>
              </div>
              <h3 className="font-display text-base sm:text-lg font-semibold">Scan the QR</h3>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground">Point your camera at the table or trailer QR code</p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 h-14 w-14 sm:h-16 sm:w-16 rounded-2xl gradient-primary flex items-center justify-center">
                <span className="font-display text-xl sm:text-2xl font-bold text-primary-foreground">02</span>
              </div>
              <h3 className="font-display text-base sm:text-lg font-semibold">Build your order</h3>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground">Choose items, customize extras and add to cart</p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 h-14 w-14 sm:h-16 sm:w-16 rounded-2xl gradient-primary flex items-center justify-center">
                <span className="font-display text-xl sm:text-2xl font-bold text-primary-foreground">03</span>
              </div>
              <h3 className="font-display text-base sm:text-lg font-semibold">Get it fresh</h3>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground">Track in real time and pick up when ready</p>
            </div>
          </div>
        </div>
      </section>

      {/* Hungry Section CTA */}
      <section className="container mx-auto px-4 pb-16 sm:pb-20 mt-16">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl gradient-primary p-8 sm:p-10 md:p-16 text-center">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
          <div className="relative">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-primary-foreground md:text-4xl">Hungry?</h2>
            <p className="mt-3 text-primary-foreground/80 text-base sm:text-lg max-w-md mx-auto">Order in seconds from your phone. No lines, no waiting.</p>
            <div className="mt-6 sm:mt-8">
              <a href="/menu">
                <button className="inline-flex items-center justify-center whitespace-nowrap bg-secondary text-secondary-foreground hover:bg-secondary/80 h-11 gap-2 px-8 sm:px-10 py-6 text-base rounded-2xl font-bold">
                  Order Now
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                </button>
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
