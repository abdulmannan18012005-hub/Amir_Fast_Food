import { createFileRoute, Link } from '@tanstack/react-router';
import { seo } from '../lib/seo';
import React from 'react';
import { getCategories, getCategoryImagesFn, getHighlightsFn } from '../server/menu';
import { useShopStatus } from '../hooks/useShopStatus';
import { SHOP_HOURS_DISPLAY } from '../lib/shop';

const CATEGORY_SUBTITLES: Record<string, string> = {
  cat_deals: 'Value Packs',
  cat_specials: 'Chef Recommended',
  cat_burgers: 'Smash & Zinger',
  cat_shawarma: 'Authentic Arab',
  cat_pizza: 'Oven Baked',
  cat_chicken: 'Crispy Fried',
  cat_sandwiches_fries: 'Loaded Snacks',
  cat_drinks: 'Cold Beverages',
};

export const Route = createFileRoute('/')({
  staleTime: 0,
  gcTime: 0,
  component: Index,
  head: () => {
    const s = seo({ title: 'Amir Fast Food - Shawarma, Burgers & Combos', description: 'Order Shawarma and Burgers online in Lahore from Amir Fast Food.', path: '/' });
    return {
      meta: s.meta,
      links: [
        ...s.links,
        { rel: 'preload', as: 'image', href: '/hero.webp', fetchPriority: 'high' }
      ]
    };
  },
  loader: async () => {
    const [categories, categoryImages, highlights] = await Promise.all([
      getCategories(),
      getCategoryImagesFn(),
      getHighlightsFn(),
    ]);
    return { categories, categoryImages, highlights };
  }
});

function Index() {
  const { categories, categoryImages, highlights } = Route.useLoaderData();
  const shopStatus = useShopStatus();
  const sortedCategories = [...categories].sort((a, b) => a.name.localeCompare(b.name));
  const activeHighlights = highlights.filter(h => h.is_available !== false);
  return (
    <>
      {/* Hero Section */}
      <section className="relative w-full min-w-0 bg-background min-h-[520px] lg:min-h-[620px] flex items-center pt-20 sm:pt-24 pb-12 lg:py-16">
        <div className="container mx-auto px-4 relative lg:static z-10 w-full min-w-0">
          <div className="flex flex-col lg:w-1/2 lg:pr-12 relative z-10">
            <div className="inline-flex items-center gap-2 mb-6 mt-4 lg:mt-0">
              <div className="h-0.5 w-12 bg-primary"></div>
              <span className="text-xs sm:text-sm font-medium uppercase tracking-wider text-primary">Amir Fast Food</span>
            </div>
            
            <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 leading-[1.1]">
              The flavor that finds you <span className="text-primary">.</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-muted-foreground mb-8 sm:mb-10 max-w-lg">
              Shawarma, burgers and combos from Kakazai, Lahore — order online for delivery.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/menu" preload="intent" className="w-full sm:w-auto inline-flex items-center justify-center whitespace-nowrap bg-primary text-primary-foreground hover:bg-primary/90 h-12 sm:h-14 px-8 sm:px-10 text-base sm:text-lg font-bold rounded-full transition-all shadow-lg shadow-primary/30">
                Order Now
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2 h-5 w-5" aria-hidden="true" focusable="false"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
              </Link>
              <Link to="/menu" preload="intent" className="w-full sm:w-auto inline-flex items-center justify-center whitespace-nowrap bg-card border border-border text-foreground hover:bg-accent h-12 sm:h-14 px-8 sm:px-10 text-base sm:text-lg font-bold rounded-full transition-all">
                View Menu
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-3 sm:gap-5 text-muted-foreground text-sm font-medium">
              <span className="flex items-center gap-1.5"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary" aria-hidden="true" focusable="false"><path d="M3 10l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg> Kakazai, Lahore</span>
              <span className="flex items-center gap-1.5"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> Estimated 30–40 mins</span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                shopStatus.open
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30'
              }`}>
                <span className={`w-2 h-2 rounded-full ${shopStatus.open ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                {shopStatus.open ? `Open Now (${SHOP_HOURS_DISPLAY} PKT)` : `Closed · Opens ${shopStatus.opensAtLabel} PKT`}
              </span>
            </div>

            {!shopStatus.open && (
              <div role="status" className="mt-4 max-w-lg p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-medium leading-relaxed">
                {shopStatus.closedMessage}
              </div>
            )}
          </div>
          
          {/* Responsive Hero Image - In-flow rounded block on < lg, full-bleed absolute on >= lg */}
          <div className="mt-12 w-full lg:mt-0 lg:w-1/2 aspect-[4/3] lg:aspect-auto rounded-2xl lg:rounded-none overflow-hidden relative lg:absolute lg:top-0 lg:right-0 lg:h-full z-0">
            <img 
              src="/hero.webp" 
              alt="Amir Fast Food - Shawarma &amp; Burgers" 
              width={800}
              height={640}
              className="w-full h-full object-cover object-center" 
              fetchPriority="high" 
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent pointer-events-none hidden lg:block" />
          </div>
        </div>
      </section>

      {/* Category Showcase Slider */}
      <section className="py-16 bg-card border-y border-border w-full min-w-0">
        <div className="container mx-auto px-4 min-w-0">
          <div className="text-center mb-10 sm:mb-14">
            <span className="text-sm font-medium text-primary uppercase tracking-wider">Explore</span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold mt-2 md:text-5xl">Our <span className="text-gradient">Categories</span></h2>
          </div>
          <div tabIndex={0} role="region" aria-label="Category showcase scroller" className="flex overflow-x-auto overscroll-x-contain gap-4 pb-8 scrollbar-hide snap-x focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-2xl">
            {sortedCategories.map(cat => (
              <Link 
                key={cat.id} 
                to="/menu" 
                hash={cat.id} 
                preload="intent"
                className="w-[168px] sm:w-[205px] h-52 flex-shrink-0 snap-start group relative overflow-hidden rounded-2xl bg-card border border-border hover:border-primary transition-colors shadow-lg"
              >
                <div className="h-32 sm:h-36 overflow-hidden bg-muted">
                  <img
                    src={categoryImages[cat.id] || '/placeholder.webp'}
                    alt={cat.name}
                    onError={(e) => { e.currentTarget.src = '/placeholder.webp'; }}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
                <div className="p-3.5 bg-background border-t border-border absolute bottom-0 left-0 right-0">
                  <h3 className="font-bold text-sm sm:text-base text-foreground truncate">{cat.name}</h3>
                  <p className="text-xs text-primary truncate">{CATEGORY_SUBTITLES[cat.id] || 'Explore Menu'}</p>
                </div>
              </Link>
            ))} 
          </div>
        </div>
      </section>

      {/* Menu Highlights Section (Dynamic from Admin Highlights) */}
      {activeHighlights.length > 0 && (
        <section className="container mx-auto px-4 py-16 sm:py-20 md:py-28 w-full min-w-0">
          <div className="text-center mb-10 sm:mb-14">
            <span className="text-sm font-medium text-primary uppercase tracking-wider">Favorites</span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold mt-2 md:text-5xl">Our <span className="text-primary">highlights</span></h2>
          </div>
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3">
            {activeHighlights.map((hl) => (
              <div key={hl.id} className="group relative overflow-hidden rounded-2xl sm:rounded-3xl bg-card border border-border/30 aspect-square">
                <img
                  src={hl.image_url || '/placeholder.webp'}
                  alt={hl.title}
                  onError={(e) => { e.currentTarget.src = '/placeholder.webp'; }}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
                {hl.offer_badge && (
                  <div className="absolute top-3 left-3 z-10 bg-primary text-primary-foreground text-xs font-black px-3 py-1 rounded-full shadow-md">
                    {hl.offer_badge}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent"></div>
                <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
                  <h3 className="font-display text-lg sm:text-xl font-bold text-foreground line-clamp-1">{hl.title}</h3>
                  <p className="mt-1 text-xs sm:text-sm text-muted-foreground line-clamp-2">{hl.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}


      {/* Hungry Section CTA */}
      <section className="container mx-auto px-4 pb-16 sm:pb-20 mt-16 w-full min-w-0">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-8 sm:p-10 md:p-16 text-center shadow-xl shadow-primary/20">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
          <div className="relative z-10">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-primary-foreground md:text-4xl">Hungry?</h2>
            <p className="mt-3 text-primary-foreground/90 text-base sm:text-lg max-w-md mx-auto">Order online in a few taps.</p>
            <div className="mt-6 sm:mt-8">
              <Link to="/menu" preload="intent" className="inline-flex items-center justify-center whitespace-nowrap bg-background text-foreground hover:bg-background/90 h-11 gap-2 px-8 sm:px-10 py-6 text-base rounded-2xl font-bold shadow-lg">
                  Order Now
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true" focusable="false"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
