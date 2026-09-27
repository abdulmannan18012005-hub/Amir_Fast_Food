import { createFileRoute } from '@tanstack/react-router';
import React from 'react';

export const Route = createFileRoute('/')({
  component: Index,
});

function Index() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative bg-background min-h-[80vh] flex items-center pt-24 sm:pt-28 pb-16 lg:py-0">
        <div className="absolute top-0 right-0 w-full lg:w-1/2 h-full overflow-hidden flex flex-col justify-center items-end pointer-events-none select-none z-10 pr-4 lg:pr-16 text-right">
          <div className="text-[20vw] lg:text-[10vw] font-black leading-[0.8] tracking-tighter opacity-[0.04] text-stroke text-primary">
            AMIR
          </div>
          <div className="text-[20vw] lg:text-[10vw] font-black leading-[0.8] tracking-tighter opacity-[0.04]">
            FAST<br/>FOOD
          </div>
        </div>

        {/* Right side image - full bleed on desktop */}
        <div className="absolute top-0 right-0 w-full lg:w-1/2 h-full z-0 hidden lg:block">
          <img src="https://amirfastfood.vercel.app/assets/hero-food-DECPAvMU.jpg" alt="Amir Fast Food - Shawarma & Burgers" className="w-full h-full object-cover object-center" loading="eager" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10 w-full">
          <div className="flex flex-col lg:w-1/2 lg:pr-12">
            <div className="inline-flex items-center gap-2 mb-6 mt-8 lg:mt-0">
              <div className="h-0.5 w-12 bg-primary"></div>
              <span className="text-xs sm:text-sm font-medium uppercase tracking-wider text-primary">Amir Fast Food</span>
            </div>
            
            <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 leading-[1.1]">
              The flavor that finds you <span className="text-primary">.</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-muted-foreground mb-8 sm:mb-10 max-w-lg">
              Authentic shawarma, smash burgers and irresistible combos. Restaurants, food trailers & delivery — always near you.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="/menu" className="w-full sm:w-auto">
                <button className="w-full inline-flex items-center justify-center whitespace-nowrap bg-primary text-primary-foreground hover:bg-primary/90 h-12 sm:h-14 px-8 sm:px-10 text-base sm:text-lg font-bold rounded-full transition-all shadow-lg shadow-primary/30">
                  Order Now
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2 h-5 w-5"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                </button>
              </a>
              <a href="/menu" className="w-full sm:w-auto">
                <button className="w-full inline-flex items-center justify-center whitespace-nowrap bg-card border border-border text-foreground hover:bg-accent h-12 sm:h-14 px-8 sm:px-10 text-base sm:text-lg font-bold rounded-full transition-all">
                  View Menu
                </button>
              </a>
            </div>

            <div className="mt-10 flex flex-wrap gap-4 sm:gap-6 text-muted-foreground text-sm font-medium">
              <span className="flex items-center gap-1.5"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"><path d="M3 10l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg> Near you</span>
              <span className="flex items-center gap-1.5"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> Ready in 30 mins</span>
              <span className="flex items-center gap-1.5"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"></path></svg> Made fresh</span>
            </div>
          </div>
          
          {/* Mobile Image */}
          <div className="mt-12 w-full lg:hidden rounded-2xl overflow-hidden aspect-[4/3] relative">
            <img src="https://amirfastfood.vercel.app/assets/hero-food-DECPAvMU.jpg" alt="Amir Fast Food - Shawarma & Burgers" className="w-full h-full object-cover" />
          </div>
        </div>
      </section>

      {/* Category Showcase Slider */}
      <section className="py-16 bg-card/50 border-y border-border/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10 sm:mb-14">
            <span className="text-sm font-medium text-primary uppercase tracking-wider">Explore</span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold mt-2 md:text-5xl">Our <span className="text-gradient">Categories</span></h2>
          </div>
          <div className="flex overflow-x-auto gap-4 pb-8 scrollbar-hide snap-x">
            {[
                { id: 'cat_deals', name: 'Deals & Combos', sub: 'Value Packs', img: 'https://images.unsplash.com/photo-1594968973184-9040a5a79963?auto=format&fit=crop&w=300&q=80' },
                { id: 'cat_specials', name: 'Specials', sub: 'Chef Recommended', img: 'https://images.unsplash.com/photo-1544025162-811114215b80?auto=format&fit=crop&w=300&q=80' },
                { id: 'cat_burgers', name: 'Burgers', sub: 'Smash & Zinger', img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80' },
                { id: 'cat_shawarma', name: 'Shawarma', sub: 'Authentic Arab', img: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=300&q=80' },
                { id: 'cat_pizza', name: 'Pizza', sub: 'Oven Baked', img: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80' },
                { id: 'cat_chicken', name: 'Chicken & Wings', sub: 'Crispy Fried', img: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=300&q=80' },
                { id: 'cat_sandwiches_fries', name: 'Sandwiches & Fries', sub: 'Loaded Snacks', img: 'https://images.unsplash.com/photo-1534080564583-6be75777b70a?auto=format&fit=crop&w=300&q=80' },
                { id: 'cat_drinks', name: 'Drinks', sub: 'Cold Beverages', img: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=300&q=80' }
              ].map(cat => (
              <a 
                key={cat.id} 
                href={`/menu?cat=${cat.id}`}
                className="min-w-[160px] sm:min-w-[200px] flex-shrink-0 snap-start group relative overflow-hidden rounded-2xl bg-card border border-border hover:border-primary transition-colors shadow-lg"
              >
                <div className="h-32 sm:h-40 overflow-hidden">
                  <img src={cat.img} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                </div>
                <div className="p-4 bg-gradient-to-t from-background to-background/80 absolute bottom-0 left-0 right-0">
                  <h3 className="font-bold text-foreground">{cat.name}</h3>
                  <p className="text-xs text-primary">{cat.sub}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Menu Highlights Section */}
      <section className="container mx-auto px-4 py-16 sm:py-20 md:py-28">
        <div className="text-center mb-10 sm:mb-14">
          <span className="text-sm font-medium text-primary uppercase tracking-wider">Favorites</span>
          <h2 className="font-display text-2xl sm:text-3xl font-bold mt-2 md:text-5xl">Our <span className="text-primary">highlights</span></h2>
        </div>
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3">
          <div className="group relative overflow-hidden rounded-2xl sm:rounded-3xl bg-card border border-border/30">
            <div className="aspect-square overflow-hidden">
              <img src="https://amirfastfood.vercel.app/assets/food-shawarma-0HL7THD0.jpg" alt="Classic Shawarma" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
              <h3 className="font-display text-lg sm:text-xl font-bold text-foreground">Classic Shawarma</h3>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Spit-roasted meat, garlic sauce & artisan pita bread</p>
            </div>
          </div>
          <div className="group relative overflow-hidden rounded-2xl sm:rounded-3xl bg-card border border-border/30">
            <div className="aspect-square overflow-hidden">
              <img src="https://amirfastfood.vercel.app/assets/food-burger-B13oD7Kh.jpg" alt="Smash Burger" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
              <h3 className="font-display text-lg sm:text-xl font-bold text-foreground">Smash Burger</h3>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Exclusive blend, 200g of pure smashed beef</p>
            </div>
          </div>
          <div className="group relative overflow-hidden rounded-2xl sm:rounded-3xl bg-card border border-border/30">
            <div className="aspect-square overflow-hidden">
              <img src="https://amirfastfood.vercel.app/assets/food-combo-BbZhBSG3.jpg" alt="Combos" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
              <h3 className="font-display text-lg sm:text-xl font-bold text-foreground">Combos</h3>
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
            <h2 className="font-display text-2xl sm:text-3xl font-bold mt-2 md:text-4xl text-foreground">How it works</h2>
          </div>
          <div className="grid gap-8 grid-cols-1 sm:grid-cols-3 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="mx-auto mb-4 h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
                <span className="font-display text-xl sm:text-2xl font-bold text-primary-foreground">01</span>
              </div>
              <h3 className="font-display text-base sm:text-lg font-semibold text-foreground">Scan the QR</h3>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground">Point your camera at the table or trailer QR code</p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
                <span className="font-display text-xl sm:text-2xl font-bold text-primary-foreground">02</span>
              </div>
              <h3 className="font-display text-base sm:text-lg font-semibold text-foreground">Build your order</h3>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground">Choose items, customize extras and add to cart</p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
                <span className="font-display text-xl sm:text-2xl font-bold text-primary-foreground">03</span>
              </div>
              <h3 className="font-display text-base sm:text-lg font-semibold text-foreground">Get it fresh</h3>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground">Track in real time and pick up when ready</p>
            </div>
          </div>
        </div>
      </section>

      {/* Hungry Section CTA */}
      <section className="container mx-auto px-4 pb-16 sm:pb-20 mt-16">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-8 sm:p-10 md:p-16 text-center shadow-xl shadow-primary/20">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
          <div className="relative z-10">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-primary-foreground md:text-4xl">Hungry?</h2>
            <p className="mt-3 text-primary-foreground/90 text-base sm:text-lg max-w-md mx-auto">Order in seconds from your phone. No lines, no waiting.</p>
            <div className="mt-6 sm:mt-8">
              <a href="/menu">
                <button className="inline-flex items-center justify-center whitespace-nowrap bg-background text-foreground hover:bg-background/90 h-11 gap-2 px-8 sm:px-10 py-6 text-base rounded-2xl font-bold shadow-lg">
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
