import crypto from 'crypto';
import dns from 'dns/promises';
import net from 'net';
import { createServerFn } from '@tanstack/react-start';
import { requireAdmin } from './auth';
import { getSupabaseServer } from '../lib/supabase';
import { toSafeError, UserFacingError } from './errors';
import { invalidateAmirBotMenuCache } from './chat';
import { detectImageExtension, MAX_IMAGE_BYTES } from './imageValidation';
import type { Category, HighlightItem, ItemVariant, MenuItem } from '../types';

const MENU_IMAGE_BUCKET = 'menu-images';

const DEFAULT_CATEGORY_IMAGES: Record<string, string> = {
  cat_deals: 'https://images.unsplash.com/photo-1594968973184-9040a5a79963?auto=format&fit=crop&w=300&q=80',
  cat_specials: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80',
  cat_burgers: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80',
  cat_shawarma: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=300&q=80',
  cat_pizza: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80',
  cat_chicken: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=300&q=80',
  cat_sandwiches_fries: 'https://images.unsplash.com/photo-1534080564583-6be75777b70a?auto=format&fit=crop&w=300&q=80',
  cat_drinks: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=300&q=80',
};

const DEFAULT_HIGHLIGHTS_META: Array<{ id: string; key: string; title: string; description: string }> = [
  {
    id: 'hl_shawarma',
    key: 'hl_shawarma',
    title: 'Classic Shawarma',
    description: 'Classic chicken shawarma with pita and signature sauce',
  },
  {
    id: 'hl_burger',
    key: 'hl_burger',
    title: 'Smash Burger',
    description: 'Smashed burger patties with fresh toppings',
  },
  {
    id: 'hl_combos',
    key: 'hl_combos',
    title: 'Combos',
    description: 'Burger, fries, and drink combos — see current offers on the menu',
  },
];

function sanitizeImageUrl(v: unknown, fallback = '/placeholder.webp'): string {
  if (typeof v !== 'string') return fallback;
  const trimmed = v.trim();
  if (!trimmed) return fallback;
  if (trimmed.includes('vecteezy.com') || trimmed.includes('/images/food-placeholder.jpg')) {
    return '/placeholder.webp';
  }
  return trimmed;
}

function isPrivateOrRestrictedIp(ip: string): boolean {
  let cleanIp = ip.trim().toLowerCase();
  if (cleanIp.startsWith('::ffff:')) {
    cleanIp = cleanIp.slice(7);
  }
  if (net.isIPv4(cleanIp)) {
    const parts = cleanIp.split('.').map(Number);
    if (parts.length !== 4 || parts.some(n => isNaN(n) || n < 0 || n > 255)) return true;
    const [a, b] = parts;
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // 127.0.0.0/8 loopback
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local / cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
    if (a >= 224) return true; // Multicast & reserved
    return false;
  }
  if (net.isIPv6(cleanIp)) {
    if (cleanIp === '::' || cleanIp === '::1') return true;
    if (cleanIp.startsWith('fc') || cleanIp.startsWith('fd')) return true; // Unique local fc00::/7
    if (cleanIp.startsWith('fe8') || cleanIp.startsWith('fe9') || cleanIp.startsWith('fea') || cleanIp.startsWith('feb')) return true; // Link local fe80::/10
    if (cleanIp.startsWith('ff')) return true; // Multicast
    return false;
  }
  return true;
}

async function assertSafePublicHttpsUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new UserFacingError('Invalid URL format. Please enter a complete HTTPS image URL.', 'validation');
  }
  if (parsed.protocol !== 'https:') {
    throw new UserFacingError('Only secure HTTPS image URLs (https://...) are allowed.', 'validation');
  }
  if (parsed.username || parsed.password) {
    throw new UserFacingError('Image URLs cannot include embedded credentials.', 'validation');
  }
  if (parsed.port && parsed.port !== '443') {
    throw new UserFacingError('Custom network ports are not allowed for image URLs.', 'validation');
  }

  const host = parsed.hostname.toLowerCase();
  if (
    !host ||
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.arpa') ||
    net.isIP(host) !== 0
  ) {
    throw new UserFacingError('Private, local, or raw IP addresses are not permitted.', 'validation');
  }

  let records: { address: string }[] = [];
  try {
    records = await dns.lookup(host, { all: true });
  } catch {
    throw new UserFacingError('Could not resolve that domain name. Please check the URL.', 'validation');
  }
  if (!records || records.length === 0) {
    throw new UserFacingError('Could not resolve a public address for that image URL.', 'validation');
  }
  for (const rec of records) {
    if (isPrivateOrRestrictedIp(rec.address)) {
      throw new UserFacingError('External URL resolves to a restricted network address and was blocked.', 'validation');
    }
  }
  return parsed;
}

async function verifyExternalImageUrlServer(rawUrl: string): Promise<{ valid: true; url: string; contentType: string } | { valid: false; error: string }> {
  const deadline = Date.now() + 9000;
  const remainingMs = () => Math.max(1000, deadline - Date.now());
  try {
    let currentUrl = rawUrl.trim();
    for (let hops = 0; hops <= 3; hops++) {
      if (Date.now() >= deadline) {
        return { valid: false, error: 'Image URL verification timed out. Please try a faster direct link or upload from your device.' };
      }
      const parsed = await assertSafePublicHttpsUrl(currentUrl);
      let res = await fetch(parsed.toString(), {
        method: 'HEAD',
        redirect: 'manual',
        headers: { 'User-Agent': 'AmirFastFood-ImageValidator/1.0', 'Accept': 'image/*' },
        signal: AbortSignal.timeout(Math.min(4500, remainingMs())),
      });

      if (res.status === 405 || res.status === 501) {
        if (Date.now() >= deadline) {
          return { valid: false, error: 'Image URL verification timed out. Please try another direct image link or upload from your device.' };
        }
        res = await fetch(parsed.toString(), {
          method: 'GET',
          redirect: 'manual',
          headers: {
            'User-Agent': 'AmirFastFood-ImageValidator/1.0',
            'Accept': 'image/*',
            'Range': 'bytes=0-64',
          },
          signal: AbortSignal.timeout(Math.min(4500, remainingMs())),
        });
      }

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        if (!location) {
          return { valid: false, error: 'Image URL returned an incomplete redirect.' };
        }
        currentUrl = new URL(location, parsed).toString();
        continue;
      }

      if (!res.ok) {
        return { valid: false, error: `Image URL returned HTTP ${res.status} and could not be accessed.` };
      }

      const contentType = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
      if (!contentType.startsWith('image/') || contentType === 'image/svg+xml') {
        return {
          valid: false,
          error: `URL did not return a supported raster image (got "${contentType || 'unknown'}"). Please paste a direct link to a JPG, PNG, or WebP image.`,
        };
      }

      return { valid: true, url: parsed.toString(), contentType };
    }
    return { valid: false, error: 'Too many redirects while verifying the image URL.' };
  } catch (err: any) {
    if (err instanceof UserFacingError) {
      return { valid: false, error: err.message };
    }
    return { valid: false, error: 'Failed to reach that external image URL. Please check the link or upload from your device.' };
  }
}

export async function normalizeAndValidateImageInput(rawUrl: string, allowEmptyPlaceholder = false): Promise<string> {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) {
    if (allowEmptyPlaceholder) return '/placeholder.webp';
    throw new UserFacingError('Please upload an image or provide a valid HTTPS image URL.', 'validation');
  }
  if (trimmed.startsWith('/')) {
    return trimmed;
  }
  const supaUrl = (process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  if (supaUrl && trimmed.startsWith(`${supaUrl}/storage/v1/object/public/${MENU_IMAGE_BUCKET}/`)) {
    return trimmed;
  }
  const check = await verifyExternalImageUrlServer(trimmed);
  if (!check.valid) {
    throw new UserFacingError(check.error, 'validation');
  }
  return check.url;
}

async function ensureMenuImagesBucket(supabase: any) {
  const { data: bucket } = await supabase.storage.getBucket(MENU_IMAGE_BUCKET);
  if (bucket) return;
  const { error } = await supabase.storage.createBucket(MENU_IMAGE_BUCKET, {
    public: true,
    fileSizeLimit: MAX_IMAGE_BYTES,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  });
  if (error && !String(error.message || '').toLowerCase().includes('already exists')) {
    console.error('[ensureMenuImagesBucket] Failed:', error);
    throw new UserFacingError('Image storage bucket is not ready. Please check Supabase Storage configuration.', 'validation');
  }
}

export async function getKnowledgeJson<T>(title: string, fallback: T): Promise<T> {
  try {
    const supabase = getSupabaseServer();
    const { data } = await supabase.from('restaurant_knowledge').select('content').eq('title', title).maybeSingle();
    if (data && data.content) {
      try { return JSON.parse(data.content); } catch {}
    }
  } catch (err) {
    console.error('getKnowledgeJson error for ' + title + ':', err);
  }
  return fallback;
}

export async function writeKnowledgeJson(title: string, data: unknown) {
  const supabase = getSupabaseServer();
  const payloadStr = JSON.stringify(data);
  const { data: existing } = await supabase.from('restaurant_knowledge').select('id').eq('title', title).maybeSingle();
  if (existing) {
    const { error } = await supabase.from('restaurant_knowledge').update({ content: payloadStr }).eq('id', existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('restaurant_knowledge').insert({ title, content: payloadStr });
    if (error) throw new Error(error.message);
  }
}

async function saveKnowledgeJson(title: string, data: Record<string, string>, pinOrToken?: string) {
  try {
    await requireAdmin(pinOrToken);
    await writeKnowledgeJson(title, data);
    return { success: true };
  } catch (err: any) {
    throw new Error(toSafeError(err));
  }
}

async function getMenuItemMetaMap(): Promise<Record<string, { original_price?: number | null; sort_order?: number }>> {
  const raw = await getKnowledgeJson<Record<string, { original_price?: number | null; sort_order?: number }>>('menu_item_meta', {});
  return raw && typeof raw === 'object' ? raw : {};
}

async function upsertMenuItemMeta(patch: Record<string, { original_price?: number | null; sort_order?: number }>) {
  const existing = await getMenuItemMetaMap();
  const next = { ...existing };
  for (const [id, entry] of Object.entries(patch)) {
    next[id] = { ...(next[id] || {}), ...entry };
  }
  await writeKnowledgeJson('menu_item_meta', next);
}

function validateCompareAtPrice(raw: unknown, sellingPrice: number): number | null {
  if (raw === undefined || raw === null || raw === '') return null;
  const num = Number(raw);
  if (!Number.isFinite(num) || !Number.isInteger(num) || num < 0 || num > 500000) {
    throw new UserFacingError('Compare-at price must be a valid whole number between 0 and 500,000.', 'validation');
  }
  if (num === 0) {
    throw new UserFacingError('Compare-at price must be higher than the selling price, or leave it blank.', 'validation');
  }
  if (num <= sellingPrice) {
    throw new UserFacingError(`Compare-at price (PKR ${num}) must be higher than the selling price (PKR ${sellingPrice}), or leave it blank.`, 'validation');
  }
  return num;
}

function isMissingColumnError(err: any): boolean {
  const code = String(err?.code || '');
  const msg = String(err?.message || '').toLowerCase();
  return code === '42703' || msg.includes('column') && msg.includes('does not exist');
}

function sortCategoriesDeterministic(cats: Category[]): Category[] {
  return [...cats].sort((a, b) => {
    const ao = Number.isFinite(Number(a.sort_order)) && Number(a.sort_order) > 0 ? Number(a.sort_order) : 999999;
    const bo = Number.isFinite(Number(b.sort_order)) && Number(b.sort_order) > 0 ? Number(b.sort_order) : 999999;
    if (ao !== bo) return ao - bo;
    const byName = String(a.name || '').localeCompare(String(b.name || ''));
    return byName !== 0 ? byName : String(a.id || '').localeCompare(String(b.id || ''));
  });
}

function hydrateAndSortMenuItems(
  rows: any[],
  metaMap: Record<string, { original_price?: number | null; sort_order?: number }>,
  archivedIds: Set<string>
): MenuItem[] {
  return (rows || [])
    .filter((i: any) => !archivedIds.has(String(i.id)))
    .map((i: any) => {
      const meta = metaMap[String(i.id)] || {};
      const price = Math.round(Number(i.price) || 0);
      const rawComp = i.original_price !== undefined ? i.original_price : meta.original_price;
      const compNum = rawComp !== null && rawComp !== undefined ? Number(rawComp) : null;
      const validComp = compNum !== null && Number.isFinite(compNum) && compNum > price ? Math.round(compNum) : null;
      const rawSort = i.sort_order !== undefined && i.sort_order !== null && Number(i.sort_order) > 0
        ? Number(i.sort_order)
        : (meta.sort_order !== undefined && Number(meta.sort_order) > 0 ? Number(meta.sort_order) : 0);
      return {
        ...i,
        price,
        original_price: validComp,
        sort_order: rawSort,
      } as MenuItem;
    })
    .sort((a, b) => {
      const ao = a.sort_order && a.sort_order > 0 ? a.sort_order : 999999;
      const bo = b.sort_order && b.sort_order > 0 ? b.sort_order : 999999;
      if (ao !== bo) return ao - bo;
      if (a.category_id === 'cat_deals' && b.category_id === 'cat_deals') {
        const numA = parseInt(String((a.name.match(/\d+/) || [0])[0]), 10);
        const numB = parseInt(String((b.name.match(/\d+/) || [0])[0]), 10);
        if (numA !== numB) return numA - numB;
      }
      const byName = a.name.localeCompare(b.name);
      return byName !== 0 ? byName : String(a.id).localeCompare(String(b.id));
    });
}

async function getArchivedMenuItemIds(): Promise<Set<string>> {
  const arr = await getKnowledgeJson<string[]>('archived_menu_item_ids', []);
  return new Set(Array.isArray(arr) ? arr.map(String) : []);
}

function sanitizeVariants(variants?: ItemVariant[] | null): ItemVariant[] {
  if (!Array.isArray(variants)) return [];
  const clean: ItemVariant[] = [];
  const seen = new Set<string>();
  for (const v of variants) {
    const name = String(v?.name || '').trim().slice(0, 60);
    const price = Number(v?.price);
    if (!name || isNaN(price) || price < 0 || price > 100000) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    clean.push({ name, price: Math.round(price) });
  }
  return clean;
}

function slugifyName(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'category';
}

// =========================================================================
// PUBLIC READ ENDPOINTS (Used by Customer Website)
// =========================================================================

export const getCategories = createServerFn({ method: 'GET' }).handler(async (): Promise<Category[]> => {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
    return sortCategoriesDeterministic((data || []) as Category[]);
  } catch (err) {
    console.error('getCategories error:', err);
    return [];
  }
});

export const getMenuItems = createServerFn({ method: 'GET' })
  .validator((d: string | undefined) => d)
  .handler(async ({ data: categoryId }): Promise<MenuItem[]> => {
    try {
      const supabase = getSupabaseServer();
      let query = supabase
        .from('menu_items')
        .select('*')
        .eq('is_available', true);

      if (categoryId && categoryId !== 'all') {
        query = query.eq('category_id', categoryId);
      }

      const [{ data, error }, archivedIds, metaMap] = await Promise.all([
        query,
        getArchivedMenuItemIds(),
        getMenuItemMetaMap(),
      ]);
      if (error) {
        console.error('Error fetching menu items:', error);
        return [];
      }
      return hydrateAndSortMenuItems(data || [], metaMap, archivedIds);
    } catch (err) {
      console.error('getMenuItems error:', err);
      return [];
    }
  });

export const searchMenuItems = createServerFn({ method: 'GET' })
  .validator((d: string) => d)
  .handler(async ({ data: searchQuery }): Promise<MenuItem[]> => {
    if (!searchQuery) return [];

    const cleanQuery = searchQuery.slice(0, 50).replace(/[,()%\*'"]/g, '').trim();
    if (!cleanQuery) return [];

    try {
      const supabase = getSupabaseServer();
      const [{ data, error }, archivedIds, metaMap] = await Promise.all([
        supabase
          .from('menu_items')
          .select('*')
          .eq('is_available', true)
          .or(`name.ilike.%${cleanQuery}%,description.ilike.%${cleanQuery}%,sub_category.ilike.%${cleanQuery}%`),
        getArchivedMenuItemIds(),
        getMenuItemMetaMap(),
      ]);

      if (error) {
        console.error('Error searching menu items:', error);
        return [];
      }
      return hydrateAndSortMenuItems(data || [], metaMap, archivedIds);
    } catch (err) {
      console.error('searchMenuItems error:', err);
      return [];
    }
  });

export const refreshCartPricesFn = createServerFn({ method: 'POST' })
  .validator((d: { itemIds: string[] }) => d)
  .handler(async ({ data }) => {
    try {
      const ids = Array.from(new Set((data.itemIds || []).map(id => String(id).trim()).filter(Boolean)));
      if (ids.length === 0) return { items: [] as Array<{ id: string; name: string; price: number; original_price: number | null; is_available: boolean; variants: ItemVariant[] }> };

      const supabase = getSupabaseServer();
      const [{ data: rows, error }, archivedIds, metaMap] = await Promise.all([
        supabase
          .from('menu_items')
          .select('*')
          .in('id', ids),
        getArchivedMenuItemIds(),
        getMenuItemMetaMap(),
      ]);

      if (error) {
        console.error('[refreshCartPricesFn] DB error:', error);
        return { error: 'Unable to verify current menu prices.', items: [] };
      }

      const hydrated = hydrateAndSortMenuItems(rows || [], metaMap, new Set());
      const items = hydrated.map((row: MenuItem) => ({
        id: String(row.id),
        name: String(row.name || ''),
        price: Math.round(Number(row.price) || 0),
        original_price: row.original_price ?? null,
        is_available: row.is_available !== false && !archivedIds.has(String(row.id)),
        variants: Array.isArray(row.variants) ? (row.variants as ItemVariant[]) : [],
      }));

      return { items };
    } catch (err) {
      console.error('[refreshCartPricesFn] Error:', err);
      return { error: 'Unable to verify current menu prices.', items: [] };
    }
  });

export const getCategoryImagesFn = createServerFn({ method: 'GET' }).handler(async () => {
  const images = await getKnowledgeJson('category_images', DEFAULT_CATEGORY_IMAGES);
  const sanitized: Record<string, string> = {};
  for (const [k, v] of Object.entries(images || {})) {
    sanitized[k] = sanitizeImageUrl(v);
  }
  return sanitized;
});

export const getHighlightImagesFn = createServerFn({ method: 'GET' }).handler(async () => {
  const images = await getKnowledgeJson('highlight_images', {
    hl_shawarma: '/placeholder.webp',
    hl_burger: '/placeholder.webp',
    hl_combos: '/placeholder.webp',
  });
  const sanitized: Record<string, string> = {};
  for (const [k, v] of Object.entries(images || {})) {
    sanitized[k] = sanitizeImageUrl(v);
  }
  return sanitized;
});

export const getHighlightsFn = createServerFn({ method: 'GET' }).handler(async (): Promise<HighlightItem[]> => {
  const stored = await getKnowledgeJson<HighlightItem[] | null>('highlights', null);
  if (Array.isArray(stored) && stored.length > 0) {
    return [...stored]
      .map((h, idx) => ({
        id: String(h.id || `hl_${idx}`),
        title: String(h.title || '').trim(),
        description: String(h.description || '').trim(),
        offer_badge: h.offer_badge ? String(h.offer_badge).trim() : undefined,
        image_url: sanitizeImageUrl(h.image_url),
        is_available: h.is_available !== false,
        sort_order: typeof h.sort_order === 'number' ? h.sort_order : idx + 1,
        created_at: h.created_at || new Date().toISOString(),
      }))
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  // Automatic first-time seed from legacy highlight_images preserving existing images
  const legacyImages = await getHighlightImagesFn();
  return DEFAULT_HIGHLIGHTS_META.map((def, idx) => ({
    id: def.id,
    title: def.title,
    description: def.description,
    image_url: sanitizeImageUrl(legacyImages[def.key]),
    is_available: true,
    sort_order: idx + 1,
    created_at: '2026-09-27T00:00:00.000Z',
  }));
});

// =========================================================================
// ADMIN IMAGE UPLOAD & SSRF-SAFE URL VALIDATION
// =========================================================================

export const uploadAdminImageFn = createServerFn({ method: 'POST' })
  .validator((d: {
    folder: 'items' | 'categories' | 'highlights' | 'layout';
    fileName: string;
    mimeType: string;
    base64Data: string;
    pin?: string;
    token?: string;
  }) => d)
  .handler(async ({ data }) => {
    try {
      await requireAdmin(data.token || data.pin);
      const { folder, mimeType, base64Data } = data;
      if (!['items', 'categories', 'highlights', 'layout'].includes(folder)) {
        throw new UserFacingError('Invalid upload folder.', 'validation');
      }
      if (!base64Data || !mimeType) {
        throw new UserFacingError('No image file data received.', 'validation');
      }

      const cleanBase64 = base64Data.replace(/^data:image\/[a-zA-Z0-9.+_-]+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      if (buffer.length > MAX_IMAGE_BYTES) {
        throw new UserFacingError('Image exceeds maximum allowed size of 5 MB.', 'validation');
      }
      if (buffer.length < 32) {
        throw new UserFacingError('Invalid or empty image file.', 'validation');
      }

      const ext = detectImageExtension(buffer, mimeType);
      const contentType = ext === 'jpg' ? 'image/jpeg' : ext === 'png' ? 'image/png' : 'image/webp';
      const storagePath = `${folder}/${Date.now()}_${crypto.randomBytes(6).toString('hex')}.${ext}`;

      const supabase = getSupabaseServer();
      await ensureMenuImagesBucket(supabase);

      const { error: uploadErr } = await supabase.storage
        .from(MENU_IMAGE_BUCKET)
        .upload(storagePath, buffer, {
          contentType,
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadErr) {
        console.error('[uploadAdminImageFn] Storage error:', uploadErr);
        throw new UserFacingError('Failed to upload image to Supabase Storage.', 'validation');
      }

      const { data: pub } = supabase.storage.from(MENU_IMAGE_BUCKET).getPublicUrl(storagePath);
      if (!pub?.publicUrl) {
        throw new UserFacingError('Upload succeeded but failed to generate public URL.', 'validation');
      }

      return { success: true, publicUrl: pub.publicUrl, storagePath };
    } catch (err: any) {
      return { success: false, error: toSafeError(err) };
    }
  });

export const validateExternalImageUrlFn = createServerFn({ method: 'POST' })
  .validator((d: { url: string; pin?: string; token?: string }) => d)
  .handler(async ({ data }) => {
    try {
      await requireAdmin(data.token || data.pin);
      return await verifyExternalImageUrlServer(data.url);
    } catch (err: any) {
      return { valid: false as const, error: toSafeError(err) };
    }
  });

// =========================================================================
// ADMIN BUNDLE LOAD
// =========================================================================

export const getAdminMenuDataFn = createServerFn({ method: 'POST' })
  .validator((d: { pin?: string; token?: string }) => d)
  .handler(async ({ data }) => {
    await requireAdmin(data.token || data.pin);
    const supabase = getSupabaseServer();
    const [itemsRes, categoriesRes, categoryImages, highlights, archivedIds, metaMap] = await Promise.all([
      supabase.from('menu_items').select('*'),
      supabase.from('categories').select('*').order('sort_order', { ascending: true }),
      getCategoryImagesFn(),
      getHighlightsFn(),
      getArchivedMenuItemIds(),
      getMenuItemMetaMap(),
    ]);

    if (itemsRes.error) throw new UserFacingError('Failed to load menu items.');
    if (categoriesRes.error) throw new UserFacingError('Failed to load categories.');

    const items = hydrateAndSortMenuItems(itemsRes.data || [], metaMap, archivedIds);

    const categories: Category[] = sortCategoriesDeterministic((categoriesRes.data || []) as Category[]).map(c => ({
      ...c,
      image_url: sanitizeImageUrl(categoryImages[c.id]),
    }));

    return { items, categories, categoryImages, highlights };
  });

// =========================================================================
// MENU ITEM CRUD (Admin)
// =========================================================================

export const createMenuItemFn = createServerFn({ method: 'POST' })
  .validator((d: {
    name: string;
    description?: string;
    category_id: string;
    sub_category?: string;
    price: number;
    original_price?: number | null;
    sort_order?: number;
    image_url: string;
    is_available?: boolean;
    variants?: ItemVariant[];
    pin?: string;
    token?: string;
  }) => d)
  .handler(async ({ data }) => {
    try {
      await requireAdmin(data.token || data.pin);
      const name = String(data.name || '').trim().slice(0, 120);
      if (name.length < 2) throw new UserFacingError('Product name must be at least 2 characters.', 'validation');

      const price = Number(data.price);
      if (!Number.isFinite(price) || !Number.isInteger(price) || price < 0 || price > 500000) {
        throw new UserFacingError('Price must be a valid non-negative whole number.', 'validation');
      }

      const compareAtPrice = validateCompareAtPrice(data.original_price, price);

      const categoryId = String(data.category_id || '').trim();
      if (!categoryId) throw new UserFacingError('Please select a category.', 'validation');

      const supabase = getSupabaseServer();
      const { data: catExists } = await supabase.from('categories').select('id').eq('id', categoryId).maybeSingle();
      if (!catExists) throw new UserFacingError('Selected category does not exist.', 'validation');

      const imageUrl = await normalizeAndValidateImageInput(data.image_url, false);
      const cleanVariants = sanitizeVariants(data.variants);
      const description = String(data.description || '').trim().slice(0, 500);
      const subCategory = String(data.sub_category || '').trim().slice(0, 80) || 'General';

      const [existingMeta, existingRowsRes] = await Promise.all([
        getMenuItemMetaMap(),
        supabase.from('menu_items').select('id'),
      ]);
      const existingCount = Array.isArray(existingRowsRes.data) ? existingRowsRes.data.length : 0;
      const maxMetaSort = Object.values(existingMeta).reduce((m, e) => Math.max(m, Number(e.sort_order) || 0), 0);
      const requestedSort = Number(data.sort_order);
      const sortOrder = Number.isFinite(requestedSort) && requestedSort > 0
        ? Math.round(requestedSort)
        : Math.max(existingCount, maxMetaSort) + 1;

      const baseInsert = {
        name,
        description,
        category_id: categoryId,
        sub_category: subCategory,
        price: Math.round(price),
        image_url: imageUrl,
        is_available: data.is_available !== false,
        variants: cleanVariants,
      };

      let { data: created, error } = await supabase
        .from('menu_items')
        .insert({
          ...baseInsert,
          original_price: compareAtPrice,
          sort_order: sortOrder,
        })
        .select('*')
        .single();

      let usedMetaFallback = false;
      if (error && isMissingColumnError(error)) {
        usedMetaFallback = true;
        const retry = await supabase
          .from('menu_items')
          .insert(baseInsert)
          .select('*')
          .single();
        created = retry.data;
        error = retry.error;
      }

      if (error || !created) {
        console.error('[createMenuItemFn] Insert error:', error);
        throw new UserFacingError('Failed to create menu item in database.', 'validation');
      }

      if (usedMetaFallback) {
        await upsertMenuItemMeta({
          [String(created.id)]: { original_price: compareAtPrice, sort_order: sortOrder },
        });
      }

      invalidateAmirBotMenuCache();
      return {
        success: true,
        item: {
          ...(created as MenuItem),
          original_price: compareAtPrice,
          sort_order: sortOrder,
        },
      };
    } catch (err: any) {
      if (err instanceof UserFacingError) throw err;
      throw new UserFacingError(toSafeError(err), 'validation');
    }
  });

export const updateMenuItemFn = createServerFn({ method: 'POST' })
  .validator((d: {
    id: string;
    name?: string;
    description?: string;
    category_id?: string;
    sub_category?: string;
    price: number;
    original_price?: number | null;
    sort_order?: number;
    image_url: string;
    is_available?: boolean;
    variants?: ItemVariant[];
    pin?: string;
    token?: string;
  }) => d)
  .handler(async ({ data }) => {
    try {
      await requireAdmin(data.token || data.pin);
      const id = String(data.id || '').trim();
      if (!id) throw new UserFacingError('Missing menu item ID.', 'validation');

      const price = Number(data.price);
      if (!Number.isFinite(price) || !Number.isInteger(price) || price < 0 || price > 500000) {
        throw new UserFacingError('Price must be a valid non-negative whole number.', 'validation');
      }

      const supabase = getSupabaseServer();
      const { data: existing } = await supabase.from('menu_items').select('*').eq('id', id).maybeSingle();
      if (!existing) throw new UserFacingError('Menu item not found.', 'validation');

      const nextName = data.name !== undefined ? String(data.name).trim().slice(0, 120) : existing.name;
      if (nextName.length < 2) throw new UserFacingError('Product name must be at least 2 characters.', 'validation');

      const nextCategoryId = data.category_id !== undefined ? String(data.category_id).trim() : existing.category_id;
      if (nextCategoryId !== existing.category_id) {
        const { data: catExists } = await supabase.from('categories').select('id').eq('id', nextCategoryId).maybeSingle();
        if (!catExists) throw new UserFacingError('Selected category does not exist.', 'validation');
      }

      let nextImageUrl = existing.image_url || '/placeholder.webp';
      if (data.image_url !== undefined && data.image_url.trim() !== (existing.image_url || '').trim()) {
        nextImageUrl = await normalizeAndValidateImageInput(data.image_url, true);
      }

      const existingMetaMap = await getMenuItemMetaMap();
      const existingMeta = existingMetaMap[data.id] || {};
      const existingComp = existing.original_price ?? existingMeta.original_price;
      const nextCompareAt = data.original_price !== undefined
        ? validateCompareAtPrice(data.original_price, price)
        : (typeof existingComp === 'number' && Number.isFinite(existingComp) && existingComp > price ? Math.round(existingComp) : null);

      const parsedSort = Number(data.sort_order);
      const nextSortOrder = data.sort_order !== undefined && Number.isFinite(parsedSort) && parsedSort > 0
        ? Math.round(parsedSort)
        : (existing.sort_order ?? existingMeta.sort_order ?? undefined);

      const coreUpdate: Record<string, any> = {
        name: nextName,
        category_id: nextCategoryId,
        price: Math.round(price),
        image_url: nextImageUrl,
      };
      if (data.description !== undefined) coreUpdate.description = String(data.description).trim().slice(0, 500);
      if (data.sub_category !== undefined) coreUpdate.sub_category = String(data.sub_category).trim().slice(0, 80) || 'General';
      if (data.is_available !== undefined) coreUpdate.is_available = Boolean(data.is_available);
      if (data.variants !== undefined) coreUpdate.variants = sanitizeVariants(data.variants);

      const fullUpdate: Record<string, any> = {
        ...coreUpdate,
        original_price: nextCompareAt,
      };
      if (nextSortOrder !== undefined) {
        fullUpdate.sort_order = nextSortOrder;
      }

      let { data: updated, error } = await supabase
        .from('menu_items')
        .update(fullUpdate)
        .eq('id', id)
        .select('*')
        .single();

      let usedMetaFallback = false;
      if (error && isMissingColumnError(error)) {
        usedMetaFallback = true;
        const retry = await supabase
          .from('menu_items')
          .update(coreUpdate)
          .eq('id', id)
          .select('*')
          .single();
        updated = retry.data;
        error = retry.error;
      }

      if (error || !updated) {
        console.error('[updateMenuItemFn] DB error:', error);
        throw new UserFacingError('Failed to update menu item.', 'validation');
      }

      if (usedMetaFallback) {
        await upsertMenuItemMeta({
          [id]: {
            original_price: nextCompareAt,
            ...(nextSortOrder !== undefined ? { sort_order: nextSortOrder } : {}),
          },
        });
      }

      invalidateAmirBotMenuCache();
      return {
        success: true,
        item: {
          ...(updated as MenuItem),
          original_price: nextCompareAt,
          sort_order: nextSortOrder ?? updated.sort_order ?? 0,
        },
      };
    } catch (err: any) {
      if (err instanceof UserFacingError) throw err;
      throw new UserFacingError(toSafeError(err), 'validation');
    }
  });

export const deleteMenuItemFn = createServerFn({ method: 'POST' })
  .validator((d: { id: string; pin?: string; token?: string }) => d)
  .handler(async ({ data }) => {
    try {
      await requireAdmin(data.token || data.pin);
      const id = String(data.id || '').trim();
      if (!id) throw new UserFacingError('Missing menu item ID.', 'validation');

      const supabase = getSupabaseServer();
      const { data: existing } = await supabase.from('menu_items').select('id, name').eq('id', id).maybeSingle();
      if (!existing) throw new UserFacingError('Menu item not found.', 'validation');

      // Preserve customer order history if this item appears in past order_items
      const { count } = await supabase
        .from('order_items')
        .select('*', { count: 'exact', head: true })
        .eq('menu_item_id', id);

      if ((count || 0) > 0) {
        const archived = await getArchivedMenuItemIds();
        archived.add(id);
        await supabase.from('menu_items').update({ is_available: false }).eq('id', id);
        await writeKnowledgeJson('archived_menu_item_ids', Array.from(archived));
        invalidateAmirBotMenuCache();
        return {
          success: true,
          archived: true,
          message: `"${existing.name}" has existing customer orders, so it was removed from the live menu and archived safely to preserve order history.`,
        };
      }

      const { error: delErr } = await supabase.from('menu_items').delete().eq('id', id);
      if (delErr) {
        if (delErr.code === '23503') {
          const archived = await getArchivedMenuItemIds();
          archived.add(id);
          await supabase.from('menu_items').update({ is_available: false }).eq('id', id);
          await writeKnowledgeJson('archived_menu_item_ids', Array.from(archived));
          invalidateAmirBotMenuCache();
          return {
            success: true,
            archived: true,
            message: `"${existing.name}" has historical order references and was archived safely to preserve order history.`,
          };
        }
        console.error('[deleteMenuItemFn] Delete error:', delErr);
        throw new UserFacingError('Database refused to delete this menu item.', 'validation');
      }

      invalidateAmirBotMenuCache();
      return { success: true, archived: false, message: `"${existing.name}" deleted successfully.` };
    } catch (err: any) {
      if (err instanceof UserFacingError) throw err;
      throw new UserFacingError(toSafeError(err), 'validation');
    }
  });

// =========================================================================
// CATEGORY CRUD & REASSIGNMENT (Admin)
// =========================================================================

export const createCategoryFn = createServerFn({ method: 'POST' })
  .validator((d: { name: string; slug?: string; sort_order?: number; image_url: string; pin?: string; token?: string }) => d)
  .handler(async ({ data }) => {
    try {
      await requireAdmin(data.token || data.pin);
      const name = String(data.name || '').trim().slice(0, 60);
      if (name.length < 2) throw new UserFacingError('Category name must be at least 2 characters.', 'validation');

      const imageUrl = await normalizeAndValidateImageInput(data.image_url, false);
      const baseSlug = slugifyName(data.slug || name);
      const supabase = getSupabaseServer();

      const { data: existingCats } = await supabase.from('categories').select('id, slug, name, sort_order');
      const cats = (existingCats || []) as Category[];

      if (cats.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        throw new UserFacingError(`A category named "${name}" already exists.`, 'validation');
      }

      let slug = baseSlug;
      let id = `cat_${baseSlug.replace(/-/g, '_')}`;
      let suffix = 2;
      while (cats.some(c => c.id === id || c.slug === slug)) {
        slug = `${baseSlug}-${suffix}`;
        id = `cat_${baseSlug.replace(/-/g, '_')}_${suffix}`;
        suffix++;
      }

      const maxOrder = cats.reduce((m, c) => Math.max(m, Number(c.sort_order) || 0), 0);
      const sortOrder = typeof data.sort_order === 'number' && isFinite(data.sort_order) ? data.sort_order : maxOrder + 1;

      const { data: inserted, error } = await supabase
        .from('categories')
        .insert({ id, name, slug, sort_order: sortOrder })
        .select('*')
        .single();

      if (error || !inserted) {
        console.error('[createCategoryFn] Error:', error);
        throw new UserFacingError('Failed to create category in database.', 'validation');
      }

      const categoryImages = await getKnowledgeJson<Record<string, string>>('category_images', DEFAULT_CATEGORY_IMAGES);
      await writeKnowledgeJson('category_images', { ...categoryImages, [id]: imageUrl });

      return { success: true, category: { ...(inserted as Category), image_url: imageUrl } };
    } catch (err: any) {
      if (err instanceof UserFacingError) throw err;
      throw new UserFacingError(toSafeError(err), 'validation');
    }
  });

export const updateCategoryFn = createServerFn({ method: 'POST' })
  .validator((d: { id: string; name: string; slug?: string; sort_order?: number; image_url: string; pin?: string; token?: string }) => d)
  .handler(async ({ data }) => {
    try {
      await requireAdmin(data.token || data.pin);
      const id = String(data.id || '').trim();
      const name = String(data.name || '').trim().slice(0, 60);
      if (!id || name.length < 2) throw new UserFacingError('Valid category ID and name are required.', 'validation');

      const supabase = getSupabaseServer();
      const { data: existing } = await supabase.from('categories').select('*').eq('id', id).maybeSingle();
      if (!existing) throw new UserFacingError('Category not found.', 'validation');

      const categoryImages = await getKnowledgeJson<Record<string, string>>('category_images', DEFAULT_CATEGORY_IMAGES);
      const existingImg = (categoryImages[id] || '').trim();
      let nextImageUrl = existingImg || '/placeholder.webp';
      if (data.image_url !== undefined && data.image_url.trim() !== existingImg) {
        nextImageUrl = await normalizeAndValidateImageInput(data.image_url, true);
      }

      const nextSlug = data.slug ? slugifyName(data.slug) : existing.slug;
      const nextOrder = typeof data.sort_order === 'number' && isFinite(data.sort_order) ? data.sort_order : existing.sort_order;

      const { data: updated, error } = await supabase
        .from('categories')
        .update({ name, slug: nextSlug, sort_order: nextOrder })
        .eq('id', id)
        .select('*')
        .single();

      if (error || !updated) {
        console.error('[updateCategoryFn] Error:', error);
        throw new UserFacingError('Failed to update category.', 'validation');
      }

      await writeKnowledgeJson('category_images', { ...categoryImages, [id]: nextImageUrl });
      return { success: true, category: { ...(updated as Category), image_url: nextImageUrl } };
    } catch (err: any) {
      if (err instanceof UserFacingError) throw err;
      throw new UserFacingError(toSafeError(err), 'validation');
    }
  });

export const reassignCategoryItemsFn = createServerFn({ method: 'POST' })
  .validator((d: { fromCategoryId: string; toCategoryId: string; pin?: string; token?: string }) => d)
  .handler(async ({ data }) => {
    try {
      await requireAdmin(data.token || data.pin);
      const fromId = String(data.fromCategoryId || '').trim();
      const toId = String(data.toCategoryId || '').trim();
      if (!fromId || !toId || fromId === toId) {
        throw new UserFacingError('Please select a different valid replacement category.', 'validation');
      }

      const supabase = getSupabaseServer();
      const [{ data: fromCat }, { data: toCat }] = await Promise.all([
        supabase.from('categories').select('id, name').eq('id', fromId).maybeSingle(),
        supabase.from('categories').select('id, name').eq('id', toId).maybeSingle(),
      ]);
      if (!fromCat || !toCat) throw new UserFacingError('Source or target category does not exist.', 'validation');

      const { data: beforeRows } = await supabase.from('menu_items').select('id').eq('category_id', fromId);
      const toMoveCount = beforeRows?.length || 0;

      if (toMoveCount > 0) {
        const { error: moveErr } = await supabase
          .from('menu_items')
          .update({ category_id: toId })
          .eq('category_id', fromId);

        if (moveErr) {
          console.error('[reassignCategoryItemsFn] Move error:', moveErr);
          throw new UserFacingError('Failed to reassign products to the selected category.', 'validation');
        }
      }

      // Mandatory verification: confirm zero products remain in fromId
      const { count: remaining } = await supabase
        .from('menu_items')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', fromId);

      if ((remaining || 0) > 0) {
        throw new UserFacingError(`Reassignment incomplete: ${remaining} product(s) still remain in this category.`, 'validation');
      }

      invalidateAmirBotMenuCache();
      return { success: true, movedCount: toMoveCount, remainingCount: 0, toCategoryName: toCat.name };
    } catch (err: any) {
      if (err instanceof UserFacingError) throw err;
      throw new UserFacingError(toSafeError(err), 'validation');
    }
  });

export const deleteCategoryFn = createServerFn({ method: 'POST' })
  .validator((d: { id: string; pin?: string; token?: string }) => d)
  .handler(async ({ data }) => {
    try {
      await requireAdmin(data.token || data.pin);
      const id = String(data.id || '').trim();
      if (!id) throw new UserFacingError('Missing category ID.', 'validation');

      const supabase = getSupabaseServer();
      const { data: existing } = await supabase.from('categories').select('id, name').eq('id', id).maybeSingle();
      if (!existing) throw new UserFacingError('Category not found.', 'validation');

      // Count non-archived products in this category
      const [{ data: catItems }, archivedIds] = await Promise.all([
        supabase.from('menu_items').select('id').eq('category_id', id),
        getArchivedMenuItemIds(),
      ]);

      const activeItems = (catItems || []).filter((i: any) => !archivedIds.has(i.id));
      if (activeItems.length > 0) {
        throw new UserFacingError(
          `Cannot delete "${existing.name}" because it still contains ${activeItems.length} product(s). Please reassign all products first.`,
          'validation'
        );
      }

      // Move any hidden archived historical items away from this category if needed so FK never fails
      const archivedInCat = (catItems || []).filter((i: any) => archivedIds.has(i.id));
      if (archivedInCat.length > 0) {
        const { data: fallbackCat } = await supabase.from('categories').select('id').neq('id', id).limit(1).maybeSingle();
        if (fallbackCat?.id) {
          await supabase.from('menu_items').update({ category_id: fallbackCat.id }).in('id', archivedInCat.map((i: any) => i.id));
        }
      }

      const { error: delErr } = await supabase.from('categories').delete().eq('id', id);
      if (delErr) {
        console.error('[deleteCategoryFn] Delete error:', delErr);
        throw new UserFacingError('Database prevented deleting this category. Ensure no products remain in it.', 'validation');
      }

      const categoryImages = await getKnowledgeJson<Record<string, string>>('category_images', DEFAULT_CATEGORY_IMAGES);
      if (id in categoryImages) {
        const nextImgs = { ...categoryImages };
        delete nextImgs[id];
        await writeKnowledgeJson('category_images', nextImgs);
      }

      return { success: true };
    } catch (err: any) {
      if (err instanceof UserFacingError) throw err;
      throw new UserFacingError(toSafeError(err), 'validation');
    }
  });

export const updateCategoryImagesFn = createServerFn({ method: 'POST' })
  .validator((d: { data: Record<string, string>; pin?: string; token?: string }) => d)
  .handler(async ({ data: payload }) => {
    return saveKnowledgeJson('category_images', payload.data, payload.token || payload.pin);
  });

// =========================================================================
// HIGHLIGHTS CRUD (Admin)
// =========================================================================

export const createHighlightFn = createServerFn({ method: 'POST' })
  .validator((d: {
    title: string;
    description: string;
    offer_badge?: string;
    image_url: string;
    is_available?: boolean;
    sort_order?: number;
    pin?: string;
    token?: string;
  }) => d)
  .handler(async ({ data }) => {
    try {
      await requireAdmin(data.token || data.pin);
      const title = String(data.title || '').trim().slice(0, 80);
      const description = String(data.description || '').trim().slice(0, 240);
      if (title.length < 2) throw new UserFacingError('Highlight title must be at least 2 characters.', 'validation');
      if (description.length < 2) throw new UserFacingError('Highlight description is required.', 'validation');

      const imageUrl = await normalizeAndValidateImageInput(data.image_url, false);
      const current = await getHighlightsFn();
      const maxOrder = current.reduce((m, h) => Math.max(m, h.sort_order || 0), 0);
      const newHighlight: HighlightItem = {
        id: `hl_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        title,
        description,
        offer_badge: data.offer_badge ? String(data.offer_badge).trim().slice(0, 40) : undefined,
        image_url: imageUrl,
        is_available: data.is_available !== false,
        sort_order: typeof data.sort_order === 'number' && isFinite(data.sort_order) ? data.sort_order : maxOrder + 1,
        created_at: new Date().toISOString(),
      };

      const nextList = [...current, newHighlight];
      await writeKnowledgeJson('highlights', nextList);
      return { success: true, highlight: newHighlight };
    } catch (err: any) {
      if (err instanceof UserFacingError) throw err;
      throw new UserFacingError(toSafeError(err), 'validation');
    }
  });

export const updateHighlightFn = createServerFn({ method: 'POST' })
  .validator((d: {
    id: string;
    title: string;
    description: string;
    offer_badge?: string;
    image_url: string;
    is_available?: boolean;
    sort_order?: number;
    pin?: string;
    token?: string;
  }) => d)
  .handler(async ({ data }) => {
    try {
      await requireAdmin(data.token || data.pin);
      const id = String(data.id || '').trim();
      const title = String(data.title || '').trim().slice(0, 80);
      const description = String(data.description || '').trim().slice(0, 240);
      if (!id || title.length < 2 || description.length < 2) {
        throw new UserFacingError('Highlight title and description are required.', 'validation');
      }

      const current = await getHighlightsFn();
      const idx = current.findIndex(h => h.id === id);
      if (idx < 0) throw new UserFacingError('Highlight not found.', 'validation');

      const existing = current[idx];
      let nextImageUrl = existing.image_url || '/placeholder.webp';
      if (data.image_url !== undefined && data.image_url.trim() !== (existing.image_url || '').trim()) {
        nextImageUrl = await normalizeAndValidateImageInput(data.image_url, true);
      }

      const updated: HighlightItem = {
        ...existing,
        title,
        description,
        offer_badge: data.offer_badge ? String(data.offer_badge).trim().slice(0, 40) : undefined,
        image_url: nextImageUrl,
        is_available: data.is_available !== false,
        sort_order: typeof data.sort_order === 'number' && isFinite(data.sort_order) ? data.sort_order : existing.sort_order,
      };

      const nextList = [...current];
      nextList[idx] = updated;
      await writeKnowledgeJson('highlights', nextList);

      // Sync legacy highlight_images key if applicable
      const legacyImgs = await getKnowledgeJson<Record<string, string>>('highlight_images', {});
      if (id in legacyImgs) {
        await writeKnowledgeJson('highlight_images', { ...legacyImgs, [id]: nextImageUrl });
      }

      return { success: true, highlight: updated };
    } catch (err: any) {
      if (err instanceof UserFacingError) throw err;
      throw new UserFacingError(toSafeError(err), 'validation');
    }
  });

export const deleteHighlightFn = createServerFn({ method: 'POST' })
  .validator((d: { id: string; pin?: string; token?: string }) => d)
  .handler(async ({ data }) => {
    try {
      await requireAdmin(data.token || data.pin);
      const id = String(data.id || '').trim();
      if (!id) throw new UserFacingError('Missing highlight ID.', 'validation');

      const current = await getHighlightsFn();
      const target = current.find(h => h.id === id);
      if (!target) throw new UserFacingError('Highlight not found.', 'validation');

      const nextList = current.filter(h => h.id !== id);
      await writeKnowledgeJson('highlights', nextList);

      const legacyImgs = await getKnowledgeJson<Record<string, string>>('highlight_images', {});
      if (id in legacyImgs) {
        const nextLegacy = { ...legacyImgs };
        delete nextLegacy[id];
        await writeKnowledgeJson('highlight_images', nextLegacy);
      }

      return { success: true };
    } catch (err: any) {
      if (err instanceof UserFacingError) throw err;
      throw new UserFacingError(toSafeError(err), 'validation');
    }
  });

export const updateHighlightImagesFn = createServerFn({ method: 'POST' })
  .validator((d: { data: Record<string, string>; pin?: string; token?: string }) => d)
  .handler(async ({ data: payload }) => {
    return saveKnowledgeJson('highlight_images', payload.data, payload.token || payload.pin);
  });

// =========================================================================
// REORDER ENDPOINTS (Categories, Menu Items, Highlights)
// =========================================================================

export const reorderCategoriesFn = createServerFn({ method: 'POST' })
  .validator((d: { orderedIds: string[]; pin?: string; token?: string }) => d)
  .handler(async ({ data }) => {
    try {
      await requireAdmin(data.token || data.pin);
      const ids = Array.from(new Set((data.orderedIds || []).map(x => String(x || '').trim()).filter(Boolean)));
      if (ids.length === 0) throw new UserFacingError('No category IDs supplied for reordering.', 'validation');

      const supabase = getSupabaseServer();
      await Promise.all(
        ids.map((id, idx) =>
          supabase.from('categories').update({ sort_order: idx + 1 }).eq('id', id)
        )
      );
      return { success: true };
    } catch (err: any) {
      if (err instanceof UserFacingError) throw err;
      throw new UserFacingError(toSafeError(err), 'validation');
    }
  });

export const reorderMenuItemsFn = createServerFn({ method: 'POST' })
  .validator((d: { orderedIds: string[]; pin?: string; token?: string }) => d)
  .handler(async ({ data }) => {
    try {
      await requireAdmin(data.token || data.pin);
      const ids = Array.from(new Set((data.orderedIds || []).map(x => String(x || '').trim()).filter(Boolean)));
      if (ids.length === 0) throw new UserFacingError('No menu item IDs supplied for reordering.', 'validation');

      const supabase = getSupabaseServer();
      let useMetaFallback = false;
      for (let idx = 0; idx < ids.length; idx++) {
        const { error } = await supabase.from('menu_items').update({ sort_order: idx + 1 }).eq('id', ids[idx]);
        if (error && isMissingColumnError(error)) {
          useMetaFallback = true;
          break;
        }
        if (error) {
          console.error('[reorderMenuItemsFn] Error:', error);
          throw new UserFacingError('Failed to save product order.', 'validation');
        }
      }

      if (useMetaFallback) {
        const metaPatch: Record<string, { sort_order: number }> = {};
        ids.forEach((id, idx) => {
          metaPatch[id] = { sort_order: idx + 1 };
        });
        await upsertMenuItemMeta(metaPatch);
      }

      invalidateAmirBotMenuCache();
      return { success: true };
    } catch (err: any) {
      if (err instanceof UserFacingError) throw err;
      throw new UserFacingError(toSafeError(err), 'validation');
    }
  });

export const reorderHighlightsFn = createServerFn({ method: 'POST' })
  .validator((d: { orderedIds: string[]; pin?: string; token?: string }) => d)
  .handler(async ({ data }) => {
    try {
      await requireAdmin(data.token || data.pin);
      const ids = Array.from(new Set((data.orderedIds || []).map(x => String(x || '').trim()).filter(Boolean)));
      if (ids.length === 0) throw new UserFacingError('No highlight IDs supplied for reordering.', 'validation');

      const current = await getHighlightsFn();
      const map = new Map(current.map(h => [h.id, h]));
      const reordered: HighlightItem[] = [];
      let order = 1;
      for (const id of ids) {
        const item = map.get(id);
        if (item) {
          reordered.push({ ...item, sort_order: order++ });
          map.delete(id);
        }
      }
      for (const leftover of map.values()) {
        reordered.push({ ...leftover, sort_order: order++ });
      }
      await writeKnowledgeJson('highlights', reordered);
      return { success: true };
    } catch (err: any) {
      if (err instanceof UserFacingError) throw err;
      throw new UserFacingError(toSafeError(err), 'validation');
    }
  });
