export const SITE = 'https://amir-fast-food.vercel.app';
export function seo(o: { title: string; description: string; path: string; noindex?: boolean }) {
  return {
    meta: [
      { title: o.title },
      { name: 'description', content: o.description },
      { property: 'og:title', content: o.title },
      { property: 'og:description', content: o.description },
      { property: 'og:url', content: SITE + o.path },
      { property: 'og:type', content: 'website' },
      { property: 'og:image', content: SITE + '/icons/icon-512.png' },
      { property: 'og:site_name', content: 'Amir Fast Food' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: o.title },
      { name: 'twitter:description', content: o.description },
      { name: 'twitter:image', content: SITE + '/icons/icon-512.png' },
      ...(o.noindex ? [{ name: 'robots', content: 'noindex' }] : [])
    ],
    links: [{ rel: 'canonical', href: SITE + o.path }]
  };
}
