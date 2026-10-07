export const SITE = 'https://amir-fast-food.vercel.app';
export function seo(o: { title: string; description: string; path: string; noindex?: boolean }) {
  return {
    meta: [
      { title: o.title },
      { name: 'description', content: o.description },
      { property: 'og:title', content: o.title },
      { property: 'og:description', content: o.description },
      { property: 'og:url', content: SITE + o.path },
      { property: 'og:image', content: SITE + '/icons/icon-512.png' },
      ...(o.noindex ? [{ name: 'robots', content: 'noindex' }] : [])
    ],
    links: [{ rel: 'canonical', href: SITE + o.path }]
  };
}
