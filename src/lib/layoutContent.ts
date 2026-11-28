export type HomeSectionId = 'hero' | 'categories' | 'highlights' | 'cta';

export interface LayoutContentSection {
  id: string;
  title: string;
  body: string;
  visible: boolean;
}

export interface SiteLayoutConfig {
  home: {
    heroEyebrow: string;
    heroHeading: string;
    heroSubheading: string;
    primaryCtaLabel: string;
    primaryCtaHref: string;
    secondaryCtaLabel: string;
    secondaryCtaHref: string;
    locationBadgeText: string;
    etaBadgeText: string;
    heroImageUrl: string;
    heroImageAlt: string;
    categoriesEyebrow: string;
    categoriesHeading: string;
    categoriesVisible: boolean;
    highlightsEyebrow: string;
    highlightsHeading: string;
    highlightsVisible: boolean;
    ctaHeading: string;
    ctaSubheading: string;
    ctaButtonLabel: string;
    ctaButtonHref: string;
    ctaVisible: boolean;
    heroVisible: boolean;
    sectionOrder: HomeSectionId[];
    seoTitle: string;
    seoDescription: string;
  };
  menu: {
    heading: string;
    subheading: string;
    showSubheading: boolean;
    showHoursBadge: boolean;
    emptySearchTitle: string;
    emptySearchSubtitle: string;
    seoTitle: string;
    seoDescription: string;
  };
  highlights: {
    categorySubtitles: Record<string, string>;
    fallbackSubtitle: string;
    promoBannerEnabled: boolean;
    promoBannerText: string;
    promoBannerHref: string;
  };
  locations: {
    heading: string;
    subheading: string;
    cardTitle: string;
    deliverySubtitle: string;
    addressLabel: string;
    hoursLabel: string;
    phoneLabel: string;
    primaryCtaLabel: string;
    primaryCtaHref: string;
    directionsLabel: string;
    showMap: boolean;
    seoTitle: string;
    seoDescription: string;
  };
  cart: {
    cartHeading: string;
    cartDescription: string;
    cartButtonLabel: string;
    chatHeading: string;
    chatSubheading: string;
    chatButtonLabel: string;
  };
  terms: {
    title: string;
    lastUpdated: string;
    seoTitle: string;
    seoDescription: string;
    sections: LayoutContentSection[];
  };
  privacy: {
    title: string;
    lastUpdated: string;
    seoTitle: string;
    seoDescription: string;
    sections: LayoutContentSection[];
  };
  site: {
    brandTagline: string;
    footerLinksTitle: string;
    footerSocialTitle: string;
    footerContactTitle: string;
    facebookUrl: string;
    copyrightText: string;
  };
}

export type LayoutPageKey = keyof SiteLayoutConfig;

export const DEFAULT_HOME_SECTION_ORDER: HomeSectionId[] = ['hero', 'categories', 'highlights', 'cta'];

export const DEFAULT_SITE_LAYOUT: SiteLayoutConfig = {
  home: {
    heroEyebrow: 'Amir Fast Food',
    heroHeading: 'The flavor that finds you',
    heroSubheading: 'Shawarma, burgers and combos from Kakazai, Lahore — order online for delivery.',
    primaryCtaLabel: 'Order Now',
    primaryCtaHref: '/menu',
    secondaryCtaLabel: 'View Menu',
    secondaryCtaHref: '/menu',
    locationBadgeText: 'Kakazai, Lahore',
    etaBadgeText: 'Estimated 30–40 mins',
    heroImageUrl: '/hero.webp',
    heroImageAlt: 'Amir Fast Food - Shawarma & Burgers',
    categoriesEyebrow: 'Explore',
    categoriesHeading: 'Our Categories',
    categoriesVisible: true,
    highlightsEyebrow: 'Favorites',
    highlightsHeading: 'Our highlights',
    highlightsVisible: true,
    ctaHeading: 'Hungry?',
    ctaSubheading: 'Order online in a few taps.',
    ctaButtonLabel: 'Order Now',
    ctaButtonHref: '/menu',
    ctaVisible: true,
    heroVisible: true,
    sectionOrder: ['hero', 'categories', 'highlights', 'cta'],
    seoTitle: 'Amir Fast Food - Shawarma, Burgers & Combos',
    seoDescription: 'Order Shawarma and Burgers online in Lahore from Amir Fast Food.',
  },
  menu: {
    heading: 'Our Menu',
    subheading: 'Crispy Broast, Gourmet Smash Burgers & Loaded Deals.',
    showSubheading: true,
    showHoursBadge: true,
    emptySearchTitle: 'No items found matching your search',
    emptySearchSubtitle: 'Try another item name or view the full menu.',
    seoTitle: 'Menu - Amir Fast Food',
    seoDescription: 'Explore the full Amir Fast Food menu: authentic shawarma, handcrafted smash burgers, crispy chicken, and combo deals in Lahore.',
  },
  highlights: {
    categorySubtitles: {
      cat_deals: 'Value Packs',
      cat_specials: 'Chef Recommended',
      cat_burgers: 'Smash & Zinger',
      cat_shawarma: 'Authentic Arab',
      cat_pizza: 'Oven Baked',
      cat_chicken: 'Crispy Fried',
      cat_sandwiches_fries: 'Loaded Snacks',
      cat_drinks: 'Cold Beverages',
    },
    fallbackSubtitle: 'Explore Menu',
    promoBannerEnabled: false,
    promoBannerText: '',
    promoBannerHref: '/menu',
  },
  locations: {
    heading: 'Our Location',
    subheading: 'Amir Fast Food, Kakazai, Lahore',
    cardTitle: 'Amir Fast Food',
    deliverySubtitle: 'Delivery in Lahore (see delivery area and fees in the Terms)',
    addressLabel: 'Address',
    hoursLabel: 'Operational Hours',
    phoneLabel: 'Contact Phone',
    primaryCtaLabel: 'Order Now',
    primaryCtaHref: '/menu',
    directionsLabel: 'Get Directions',
    showMap: true,
    seoTitle: 'Our Location - Amir Fast Food',
    seoDescription: 'Visit or order from Amir Fast Food in Kakazai, Lahore.',
  },
  cart: {
    cartHeading: 'Your Cart',
    cartDescription: 'Review your items and proceed to checkout when ready.',
    cartButtonLabel: 'View Cart',
    chatHeading: 'Ask AmirBot',
    chatSubheading: 'I can help you build your cart, take your delivery and payment details, and place your order.',
    chatButtonLabel: 'Open Chat',
  },
  terms: {
    title: 'Terms of Service',
    lastUpdated: 'Last updated: October 2026',
    seoTitle: 'Terms of Service - Amir Fast Food',
    seoDescription: 'Terms of Service and ordering policies for Amir Fast Food in Lahore.',
    sections: [
      {
        id: 'terms_hours',
        title: '1. Operational Hours & Service Area',
        body: 'Hours: Every day, 6:00 PM – 2:00 AM (Pakistan Standard Time). Orders are accepted during opening hours only.\nService Area: Online delivery orders are accepted within a maximum radius of 15 km from our location at Post Office Mansoora, Anwar Market, Peco Road, Kakazai, Lahore, 54000. Orders outside this distance cannot be fulfilled.',
        visible: true,
      },
      {
        id: 'terms_pricing',
        title: '2. Pricing & Menu Items',
        body: 'All prices are listed in Pakistani Rupees (PKR) and include applicable sales taxes. Menu item availability and prices are subject to change without prior notice. The total calculated at checkout is authoritative and final.',
        visible: true,
      },
      {
        id: 'terms_delivery_payment',
        title: '3. Delivery Fees & Payment Methods',
        body: 'Accepted Payment Methods: Cash on Delivery (COD), EasyPaisa, and JazzCash manual transfer.\nOnline-transfer orders start preparation after we verify the Transaction ID in our EasyPaisa/JazzCash app. Each Transaction ID can be used for one order only.\n• Free Delivery Area: Delivery is free within a 5 km radius from our restaurant.\n• Distance Fee: Deliveries beyond 5 km incur an additional PKR 100 per extra kilometer up to 15 km.\n• Cash on Delivery (COD) Fee: A PKR 100 fee applies to COD orders when the subtotal is under PKR 1000. COD fee is waived for orders of PKR 1000 or more, and for all online transfers.',
        visible: true,
      },
      {
        id: 'terms_eta',
        title: '4. Estimated Delivery Time',
        body: 'Estimated delivery 30–40 minutes, depending on distance and order volume. Delivery times are estimates and may vary depending on weather, traffic, and order volume.',
        visible: true,
      },
      {
        id: 'terms_tracking',
        title: '5. Order Tracking & Push Notifications',
        body: 'Upon completing checkout, you will receive an order confirmation and permanent link to track your order status live. You may optionally enable browser push notifications to receive real-time updates as your food moves through preparation and delivery.',
        visible: true,
      },
      {
        id: 'terms_cancel',
        title: '6. Cancellation & Refund Policy',
        body: 'You can cancel an order online on the tracking page only while its status is "Order Received" (before kitchen preparation begins). Once preparation starts, online cancellation closes — please call 0301 4265785 for assistance.\nThe restaurant reserves the right to cancel an order if items become unavailable, or if the address is unreachable or outside our delivery area. In such cases, the cancellation reason will appear in the order tracker, and online payments will be refunded promptly.',
        visible: true,
      },
      {
        id: 'terms_missing',
        title: '7. Missing or Incorrect Items',
        body: 'If any item in your delivered order is missing or incorrect, please contact us immediately on 0301 4265785. We review each situation and arrange an appropriate replacement or correction.',
        visible: true,
      },
      {
        id: 'terms_bot',
        title: '8. Automated Assistant (AmirBot)',
        body: 'AmirBot can help you build the cart and fill your details, but an order is placed only when you press "Confirm & place order". Its answers may be wrong and checkout totals are authoritative.',
        visible: true,
      },
      {
        id: 'terms_general',
        title: '9. General Terms & Updates',
        body: 'We may update these terms periodically to reflect service or operational adjustments. Continued use of the website following changes constitutes acceptance of the updated terms.',
        visible: true,
      },
      {
        id: 'terms_contact',
        title: '10. Contact Us',
        body: 'For inquiries, support, or feedback, contact Amir Fast Food at +92 301 4265785 or visit our location at Post Office Mansoora, Anwar Market, Peco Road, Kakazai, Lahore, 54000.',
        visible: true,
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    lastUpdated: 'Last updated: October 2026',
    seoTitle: 'Privacy Policy - Amir Fast Food',
    seoDescription: 'Privacy Policy for Amir Fast Food: how customer order data is handled.',
    sections: [
      {
        id: 'priv_collect',
        title: '1. Information We Collect',
        body: 'We collect only the information necessary to prepare and deliver your orders:\n• Contact Information: Your name, phone number, delivery address, and optional email address.\n• Order Details: Items and options selected, order notes, payment method (Cash on Delivery or manual online transfer), Transaction ID (for manual transfers), order timestamp, and status history.\n• Device Coordinates: Approximate latitude and longitude only if you explicitly choose to tap "Use my current location" to assist with address entry and delivery distance calculation.\n• Delivery Dispatch: Rider name and phone number assigned by restaurant staff to your delivery.',
        visible: true,
      },
      {
        id: 'priv_use',
        title: '2. How We Use Your Information',
        body: 'Your information is used solely to prepare food orders in our kitchen, calculate delivery distance, dispatch orders to your address, provide live tracking updates, and communicate with you about your order if needed.',
        visible: true,
      },
      {
        id: 'priv_payment',
        title: '3. Payment Information',
        body: 'We do not operate an automated credit card payment gateway and do not collect or store credit card numbers. Payment is made via Cash on Delivery (COD) or manual transfer through EasyPaisa / JazzCash, where you submit a Transaction ID (TID) to confirm payment.',
        visible: true,
      },
      {
        id: 'priv_providers',
        title: '4. Service Providers & Third Parties',
        body: 'We never sell, rent, or trade your personal information. We utilize trusted infrastructure providers to operate the service:\n• Supabase: Encrypted cloud database for storing order records and push subscription endpoints.\n• Vercel: Cloud application hosting and serverless functions.\n• Groq: Language model inference for our optional automated assistant (AmirBot).\n• OpenStreetMap: Nominatim API for geocoding and map tile embed on our Locations page.\n• Gmail SMTP: Dispatches receipt emails when an email address is provided.\n• Web Push Service: Browser push services for delivering order status notifications when permission is granted.',
        visible: true,
      },
      {
        id: 'priv_storage',
        title: '5. Browser Storage & Cookies',
        body: 'We do not use advertising or tracking cookies. We utilize standard client-side storage for functionality:\n• localStorage: Stores your active shopping cart, theme preference (light/dark), and recent order IDs for tracking.\n• sessionStorage: Stores conversation messages with AmirBot for the duration of your session.\n• Service Worker Cache: Caches application assets for offline capability and fast loading.',
        visible: true,
      },
      {
        id: 'priv_retention',
        title: '6. Data Retention & Your Rights',
        body: 'We keep order records only as long as necessary to fulfill orders, operate the restaurant, and satisfy accounting obligations. You may contact us at any time to verify, update, or request deletion of your information.',
        visible: true,
      },
      {
        id: 'priv_security',
        title: '7. Security',
        body: 'All communication between your browser and our servers is encrypted using HTTPS. Admin staff access is protected by a password-style PIN and an authenticated session.',
        visible: true,
      },
      {
        id: 'priv_contact',
        title: '8. Contact Us',
        body: 'For questions regarding your privacy, contact Amir Fast Food at +92 301 4265785 or visit our branch at Post Office Mansoora, Anwar Market, Peco Road, Kakazai, Lahore, 54000.',
        visible: true,
      },
    ],
  },
  site: {
    brandTagline: 'Shawarma, smash burgers, and combo deals in Lahore.',
    footerLinksTitle: 'Links',
    footerSocialTitle: 'Social',
    footerContactTitle: 'Contact',
    facebookUrl: 'https://www.facebook.com/Amirfastfoodofficial/',
    copyrightText: '© 2026 Amir Fast Food. All rights reserved.',
  },
};

function sanitizeStr(raw: unknown, fallback: string, maxLen = 500): string {
  if (typeof raw !== 'string') return fallback;
  const clean = raw.replace(/<[^>]*>/g, '').trim();
  return clean ? clean.slice(0, maxLen) : fallback;
}

export function sanitizeLinkHref(raw: unknown, fallback: string): string {
  if (typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed.slice(0, 200);
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:') {
      return parsed.toString().slice(0, 300);
    }
  } catch {}
  return fallback;
}

export function sanitizeMediaPath(raw: unknown, fallback: string): string {
  if (typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed.slice(0, 300);
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:') {
      return parsed.toString().slice(0, 400);
    }
  } catch {}
  return fallback;
}

function mergeContentSections(raw: unknown, defaults: LayoutContentSection[]): LayoutContentSection[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return defaults.map(s => ({ ...s }));
  }
  const clean: LayoutContentSection[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < raw.length && clean.length < 30; i++) {
    const entry = raw[i] as any;
    if (!entry || typeof entry !== 'object') continue;
    const rawId = typeof entry.id === 'string' && entry.id.trim() ? entry.id.trim().slice(0, 60) : `section_${i + 1}`;
    if (seen.has(rawId)) continue;
    seen.add(rawId);
    const title = sanitizeStr(entry.title, '', 140);
    const body = sanitizeStr(entry.body, '', 4000);
    if (!title && !body) continue;
    clean.push({
      id: rawId,
      title: title || 'Section',
      body,
      visible: entry.visible !== false,
    });
  }
  return clean.length > 0 ? clean : defaults.map(s => ({ ...s }));
}

export function mergeWithLayoutDefaults(raw: unknown): SiteLayoutConfig {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
  const d = DEFAULT_SITE_LAYOUT;

  const h = (src.home && typeof src.home === 'object' ? src.home : {}) as Record<string, any>;
  const rawOrder = Array.isArray(h.sectionOrder) ? h.sectionOrder : d.home.sectionOrder;
  const validOrderSet = new Set<HomeSectionId>(DEFAULT_HOME_SECTION_ORDER);
  const cleanOrder: HomeSectionId[] = [];
  for (const s of rawOrder) {
    if (validOrderSet.has(s) && !cleanOrder.includes(s)) cleanOrder.push(s);
  }
  for (const req of DEFAULT_HOME_SECTION_ORDER) {
    if (!cleanOrder.includes(req)) cleanOrder.push(req);
  }

  const m = (src.menu && typeof src.menu === 'object' ? src.menu : {}) as Record<string, any>;
  const hl = (src.highlights && typeof src.highlights === 'object' ? src.highlights : {}) as Record<string, any>;
  const cleanSubtitles: Record<string, string> = { ...d.highlights.categorySubtitles };
  if (hl.categorySubtitles && typeof hl.categorySubtitles === 'object') {
    for (const [k, v] of Object.entries(hl.categorySubtitles)) {
      if (typeof k === 'string' && k.trim()) {
        cleanSubtitles[k.trim().slice(0, 60)] = sanitizeStr(v, d.highlights.fallbackSubtitle, 80);
      }
    }
  }

  const loc = (src.locations && typeof src.locations === 'object' ? src.locations : {}) as Record<string, any>;
  const c = (src.cart && typeof src.cart === 'object' ? src.cart : {}) as Record<string, any>;
  const t = (src.terms && typeof src.terms === 'object' ? src.terms : {}) as Record<string, any>;
  const p = (src.privacy && typeof src.privacy === 'object' ? src.privacy : {}) as Record<string, any>;
  const s = (src.site && typeof src.site === 'object' ? src.site : {}) as Record<string, any>;

  return {
    home: {
      heroEyebrow: sanitizeStr(h.heroEyebrow, d.home.heroEyebrow, 60),
      heroHeading: sanitizeStr(h.heroHeading, d.home.heroHeading, 120),
      heroSubheading: sanitizeStr(h.heroSubheading, d.home.heroSubheading, 260),
      primaryCtaLabel: sanitizeStr(h.primaryCtaLabel, d.home.primaryCtaLabel, 40),
      primaryCtaHref: sanitizeLinkHref(h.primaryCtaHref, d.home.primaryCtaHref),
      secondaryCtaLabel: sanitizeStr(h.secondaryCtaLabel, d.home.secondaryCtaLabel, 40),
      secondaryCtaHref: sanitizeLinkHref(h.secondaryCtaHref, d.home.secondaryCtaHref),
      locationBadgeText: sanitizeStr(h.locationBadgeText, d.home.locationBadgeText, 80),
      etaBadgeText: sanitizeStr(h.etaBadgeText, d.home.etaBadgeText, 80),
      heroImageUrl: sanitizeMediaPath(h.heroImageUrl, d.home.heroImageUrl),
      heroImageAlt: sanitizeStr(h.heroImageAlt, d.home.heroImageAlt, 140),
      categoriesEyebrow: sanitizeStr(h.categoriesEyebrow, d.home.categoriesEyebrow, 40),
      categoriesHeading: sanitizeStr(h.categoriesHeading, d.home.categoriesHeading, 80),
      categoriesVisible: h.categoriesVisible !== false,
      highlightsEyebrow: sanitizeStr(h.highlightsEyebrow, d.home.highlightsEyebrow, 40),
      highlightsHeading: sanitizeStr(h.highlightsHeading, d.home.highlightsHeading, 80),
      highlightsVisible: h.highlightsVisible !== false,
      ctaHeading: sanitizeStr(h.ctaHeading, d.home.ctaHeading, 80),
      ctaSubheading: sanitizeStr(h.ctaSubheading, d.home.ctaSubheading, 200),
      ctaButtonLabel: sanitizeStr(h.ctaButtonLabel, d.home.ctaButtonLabel, 40),
      ctaButtonHref: sanitizeLinkHref(h.ctaButtonHref, d.home.ctaButtonHref),
      ctaVisible: h.ctaVisible !== false,
      heroVisible: h.heroVisible !== false,
      sectionOrder: cleanOrder,
      seoTitle: sanitizeStr(h.seoTitle, d.home.seoTitle, 120),
      seoDescription: sanitizeStr(h.seoDescription, d.home.seoDescription, 220),
    },
    menu: {
      heading: sanitizeStr(m.heading, d.menu.heading, 80),
      subheading: sanitizeStr(m.subheading, d.menu.subheading, 200),
      showSubheading: m.showSubheading !== false,
      showHoursBadge: m.showHoursBadge !== false,
      emptySearchTitle: sanitizeStr(m.emptySearchTitle, d.menu.emptySearchTitle, 120),
      emptySearchSubtitle: sanitizeStr(m.emptySearchSubtitle, d.menu.emptySearchSubtitle, 200),
      seoTitle: sanitizeStr(m.seoTitle, d.menu.seoTitle, 120),
      seoDescription: sanitizeStr(m.seoDescription, d.menu.seoDescription, 220),
    },
    highlights: {
      categorySubtitles: cleanSubtitles,
      fallbackSubtitle: sanitizeStr(hl.fallbackSubtitle, d.highlights.fallbackSubtitle, 60),
      promoBannerEnabled: Boolean(hl.promoBannerEnabled),
      promoBannerText: sanitizeStr(hl.promoBannerText, d.highlights.promoBannerText, 180),
      promoBannerHref: sanitizeLinkHref(hl.promoBannerHref, d.highlights.promoBannerHref),
    },
    locations: {
      heading: sanitizeStr(loc.heading, d.locations.heading, 80),
      subheading: sanitizeStr(loc.subheading, d.locations.subheading, 160),
      cardTitle: sanitizeStr(loc.cardTitle, d.locations.cardTitle, 80),
      deliverySubtitle: sanitizeStr(loc.deliverySubtitle, d.locations.deliverySubtitle, 180),
      addressLabel: sanitizeStr(loc.addressLabel, d.locations.addressLabel, 40),
      hoursLabel: sanitizeStr(loc.hoursLabel, d.locations.hoursLabel, 40),
      phoneLabel: sanitizeStr(loc.phoneLabel, d.locations.phoneLabel, 40),
      primaryCtaLabel: sanitizeStr(loc.primaryCtaLabel, d.locations.primaryCtaLabel, 40),
      primaryCtaHref: sanitizeLinkHref(loc.primaryCtaHref, d.locations.primaryCtaHref),
      directionsLabel: sanitizeStr(loc.directionsLabel, d.locations.directionsLabel, 40),
      showMap: loc.showMap !== false,
      seoTitle: sanitizeStr(loc.seoTitle, d.locations.seoTitle, 120),
      seoDescription: sanitizeStr(loc.seoDescription, d.locations.seoDescription, 220),
    },
    cart: {
      cartHeading: sanitizeStr(c.cartHeading, d.cart.cartHeading, 80),
      cartDescription: sanitizeStr(c.cartDescription, d.cart.cartDescription, 200),
      cartButtonLabel: sanitizeStr(c.cartButtonLabel, d.cart.cartButtonLabel, 40),
      chatHeading: sanitizeStr(c.chatHeading, d.cart.chatHeading, 80),
      chatSubheading: sanitizeStr(c.chatSubheading, d.cart.chatSubheading, 220),
      chatButtonLabel: sanitizeStr(c.chatButtonLabel, d.cart.chatButtonLabel, 40),
    },
    terms: {
      title: sanitizeStr(t.title, d.terms.title, 80),
      lastUpdated: sanitizeStr(t.lastUpdated, d.terms.lastUpdated, 80),
      seoTitle: sanitizeStr(t.seoTitle, d.terms.seoTitle, 120),
      seoDescription: sanitizeStr(t.seoDescription, d.terms.seoDescription, 220),
      sections: mergeContentSections(t.sections, d.terms.sections),
    },
    privacy: {
      title: sanitizeStr(p.title, d.privacy.title, 80),
      lastUpdated: sanitizeStr(p.lastUpdated, d.privacy.lastUpdated, 80),
      seoTitle: sanitizeStr(p.seoTitle, d.privacy.seoTitle, 120),
      seoDescription: sanitizeStr(p.seoDescription, d.privacy.seoDescription, 220),
      sections: mergeContentSections(p.sections, d.privacy.sections),
    },
    site: {
      brandTagline: sanitizeStr(s.brandTagline, d.site.brandTagline, 180),
      footerLinksTitle: sanitizeStr(s.footerLinksTitle, d.site.footerLinksTitle, 40),
      footerSocialTitle: sanitizeStr(s.footerSocialTitle, d.site.footerSocialTitle, 40),
      footerContactTitle: sanitizeStr(s.footerContactTitle, d.site.footerContactTitle, 40),
      facebookUrl: sanitizeLinkHref(s.facebookUrl, d.site.facebookUrl),
      copyrightText: sanitizeStr(s.copyrightText, d.site.copyrightText, 120),
    },
  };
}
