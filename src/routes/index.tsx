import { createFileRoute, Link } from '@tanstack/react-router';
import { seo } from '../lib/seo';
import React from 'react';
import { getCategories, getCategoryImagesFn, getHighlightsFn } from '../server/menu';
import { getPublishedLayoutFn } from '../server/layoutApi';
import { useShopStatus } from '../hooks/useShopStatus';
import { usePublishedLayout } from '../lib/layoutContext';
import { DEFAULT_SITE_LAYOUT, sanitizeLinkHref, sanitizeMediaPath, type HomeSectionId } from '../lib/layoutContent';
import { SHOP_HOURS_DISPLAY } from '../lib/shop';

export const Route = createFileRoute('/')({
  staleTime: 0,
  gcTime: 0,
  component: Index,
  head: ({ loaderData }) => {
    const h = loaderData?.layout?.home || DEFAULT_SITE_LAYOUT.home;
    const s = seo({ title: h.seoTitle, description: h.seoDescription, path: '/' });
    return {
      meta: s.meta,
      links: [
        ...s.links,
        { rel: 'preload', as: 'image', href: sanitizeMediaPath(h.heroImageUrl, '/hero.webp'), fetchPriority: 'high' }
      ]
    };
  },
  loader: async () => {
    const [categories, categoryImages, highlights, layout] = await Promise.all([
      getCategories(),
      getCategoryImagesFn(),
      getHighlightsFn(),
      getPublishedLayoutFn(),
    ]);
    return { categories, categoryImages, highlights, layout };
  }
});

function CtaActionLink({ href, className, children }: { href: string; className: string; children: React.ReactNode }) {
  const safeHref = sanitizeLinkHref(href, '/menu');
  if (safeHref.startsWith('/')) {
    return (
      <Link to={safeHref as any} preload="intent" className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={safeHref} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}

function Index() {
  const { categories, categoryImages, highlights } = Route.useLoaderData();
  const publishedLayout = usePublishedLayout();
  const h = publishedLayout.home;
  const hlConfig = publishedLayout.highlights;
  const shopStatus = useShopStatus();

  const sortedCategories = [...categories].sort((a, b) => {
    const ao = Number.isFinite(Number(a.sort_order)) && Number(a.sort_order) > 0 ? Number(a.sort_order) : 999999;
    const bo = Number.isFinite(Number(b.sort_order)) && Number(b.sort_order) > 0 ? Number(b.sort_order) : 999999;
    if (ao !== bo) return ao - bo;
    const byName = a.name.localeCompare(b.name);
    return byName !== 0 ? byName : String(a.id).localeCompare(String(b.id));
  });
  const activeHighlights = [...highlights]
    .filter(item => item.is_available !== false)
    .sort((a, b) => (Number(a.sort_order) || 999) - (Number(b.sort_order) || 999));

  const renderSection = (secId: HomeSectionId) => {
    if (secId === 'hero') {
      if (!h.heroVisible) return null;
      return (
        <section key="hero" className="relative w-full min-w-0 bg-background min-h-[520px] lg:min-h-[620px] flex items-center pt-20 sm:pt-24 pb-12 lg:py-16">
          <div className="container mx-auto px-4 relative lg:static z-10 w-full min-w-0">
            <div className="flex flex-col lg:w-1/2 lg:pr-12 relative z-10">
              <div className="inline-flex items-center gap-2 mb-6 mt-4 lg:mt-0">
                <div className="h-0.5 w-12 bg-primary"></div>
                <span className="text-xs sm:text-sm font-medium uppercase tracking-wider text-primary">{h.heroEyebrow}</span>
              </div>

              <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 leading-[1.1]">
                {h.heroHeading} <span className="text-primary">.</span>
              </h1>

              <p className="text-lg sm:text-xl text-muted-foreground mb-8 sm:mb-10 max-w-lg">
                {h.heroSubheading}
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <CtaActionLink
                  href={h.primaryCtaHref}
                  className="w-full sm:w-auto inline-flex items-center justify-center whitespace-nowrap bg-primary text-primary-foreground hover:bg-primary/90 h-12 sm:h-14 px-8 sm:px-10 text-base sm:text-lg font-bold rounded-full transition-all shadow-lg shadow-primary/30"
                >
                  {h.primaryCtaLabel}
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2 h-5 w-5" aria-hidden="true" focusable="false"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                </CtaActionLink>
                <CtaActionLink
                  href={h.secondaryCtaHref}
                  className="w-full sm:w-auto inline-flex items-center justify-center whitespace-nowrap bg-card border border-border text-foreground hover:bg-accent h-12 sm:h-14 px-8 sm:px-10 text-base sm:text-lg font-bold rounded-full transition-all"
                >
                  {h.secondaryCtaLabel}
                </CtaActionLink>
              </div>

              <div className="mt-8 flex flex-wrap gap-3 sm:gap-5 text-muted-foreground text-sm font-medium">
                <span className="flex items-center gap-1.5"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary" aria-hidden="true" focusable="false"><path d="M3 10l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg> {h.locationBadgeText}</span>
                <span className="flex items-center gap-1.5"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> {h.etaBadgeText}</span>
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
                src={sanitizeMediaPath(h.heroImageUrl, '/hero.webp')}
                alt={h.heroImageAlt}
                width={800}
                height={640}
                onError={(e) => { e.currentTarget.src = '/hero.webp'; }}
                className="w-full h-full object-cover object-center"
                fetchPriority="high"
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent pointer-events-none hidden lg:block" />
            </div>
          </div>
        </section>
      );
    }

    if (secId === 'categories') {
      if (!h.categoriesVisible) return null;
      return (
        <section key="categories" className="py-16 bg-card border-y border-border w-full min-w-0">
          <div className="container mx-auto px-4 min-w-0">
            <div className="text-center mb-10 sm:mb-14">
              <span className="text-sm font-medium text-primary uppercase tracking-wider">{h.categoriesEyebrow}</span>
              <h2 className="font-display text-2xl sm:text-3xl font-bold mt-2 md:text-5xl">{h.categoriesHeading}</h2>
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
                    <p className="text-xs text-primary truncate">{hlConfig.categorySubtitles[cat.id] || hlConfig.fallbackSubtitle}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      );
    }

    if (secId === 'highlights') {
      if (!h.highlightsVisible || activeHighlights.length === 0) return null;
      return (
        <section key="highlights" className="container mx-auto px-4 py-16 sm:py-20 md:py-28 w-full min-w-0">
          <div className="text-center mb-10 sm:mb-14">
            <span className="text-sm font-medium text-primary uppercase tracking-wider">{h.highlightsEyebrow}</span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold mt-2 md:text-5xl">{h.highlightsHeading}</h2>
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
      );
    }

    if (secId === 'cta') {
      if (!h.ctaVisible) return null;
      return (
        <section key="cta" className="container mx-auto px-4 pb-16 sm:pb-20 mt-16 w-full min-w-0">
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-8 sm:p-10 md:p-16 text-center shadow-xl shadow-primary/20">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
            <div className="relative z-10">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-primary-foreground md:text-4xl">{h.ctaHeading}</h2>
              <p className="mt-3 text-primary-foreground/90 text-base sm:text-lg max-w-md mx-auto">{h.ctaSubheading}</p>
              <div className="mt-6 sm:mt-8">
                <CtaActionLink
                  href={h.ctaButtonHref}
                  className="inline-flex items-center justify-center whitespace-nowrap bg-background text-foreground hover:bg-background/90 h-11 gap-2 px-8 sm:px-10 py-6 text-base rounded-2xl font-bold shadow-lg"
                >
                  {h.ctaButtonLabel}
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true" focusable="false"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                </CtaActionLink>
              </div>
            </div>
          </div>
        </section>
      );
    }

    return null;
  };

  return (
    <>
      {hlConfig.promoBannerEnabled && hlConfig.promoBannerText.trim() && (
        <div className="bg-primary text-primary-foreground text-center px-4 py-2 text-xs sm:text-sm font-bold">
          <CtaActionLink href={hlConfig.promoBannerHref || '/menu'} className="hover:underline">
            {hlConfig.promoBannerText}
          </CtaActionLink>
        </div>
      )}
      {h.sectionOrder.map(secId => renderSection(secId))}
    </>
  );
}
