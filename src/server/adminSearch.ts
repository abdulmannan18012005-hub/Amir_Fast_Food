const FULL_UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Sanitizes an admin search input by trimming whitespace and removing
 * PostgREST filter operator / wildcard delimiters so queries cannot inject filters.
 */
export function sanitizeAdminSearchTerm(raw?: string | null, maxLen = 60): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw.trim().replace(/[,()%\*'"\\]/g, '').slice(0, maxLen).trim();
}

/**
 * Resolves UUID/short-code matches safely without invoking `id.ilike` (which fails on PostgreSQL uuid columns).
 * Supports `#3EA1DA9C`, partial hex substrings, and full UUIDs.
 */
export async function findOrderIdsByHexFragment(
  supabase: any,
  rawTerm: string,
  extraOrderFilter?: (q: any) => any
): Promise<string[]> {
  const candidate = rawTerm.replace(/^#+/, '').trim().toLowerCase();
  if (!candidate || !/^[0-9a-f-]{2,36}$/i.test(candidate)) {
    return [];
  }

  if (FULL_UUID_REGEX.test(candidate)) {
    return [candidate];
  }

  try {
    let q = supabase.from('orders').select('id').order('created_at', { ascending: false }).limit(2000);
    if (extraOrderFilter) {
      q = extraOrderFilter(q);
    }
    const { data, error } = await q;
    if (error || !Array.isArray(data)) return [];
    return data
      .map((r: any) => String(r.id || ''))
      .filter(id => id.toLowerCase().includes(candidate));
  } catch {
    return [];
  }
}

/**
 * Builds a safe PostgREST `.or(...)` clause over text columns plus matched UUIDs.
 */
export function buildSafeOrderOrClause(
  textColumns: string[],
  term: string,
  matchedOrderIds: string[],
  idColumn = 'id'
): string {
  const parts = textColumns.map(col => `${col}.ilike.%${term}%`);
  if (matchedOrderIds.length > 0) {
    // Limit IN clause length to avoid oversized URLs
    const boundedIds = matchedOrderIds.slice(0, 120);
    parts.push(`${idColumn}.in.(${boundedIds.join(',')})`);
  }
  return parts.join(',');
}
