import type { ItemVariant } from '../types';

/**
 * Returns true only when an item actually defines selectable variants in the database.
 * Never invents hardcoded variants for Deals or regular products.
 */
export function isDealOrHasVariants(item: { category_id?: string; variants?: ItemVariant[] | null }): boolean {
  return Array.isArray(item?.variants) && item.variants.length > 0;
}

/**
 * Returns authoritative variants configured for this database item.
 */
export function getAllAvailableUpgrades(item: { variants?: ItemVariant[] | null }): ItemVariant[] {
  if (!Array.isArray(item?.variants)) return [];
  return item.variants
    .filter(v => v && typeof v.name === 'string' && v.name.trim().length > 0)
    .map(v => ({ name: v.name.trim(), price: Number(v.price) || 0 }));
}

export function detectInitialVariants(text: string, configuredVariants: ItemVariant[]): {
  selectedUpgrades: ItemVariant[];
} {
  const lower = (text || '').toLowerCase();
  const selectedUpgrades: ItemVariant[] = [];

  for (const v of configuredVariants || []) {
    const vLower = v.name.toLowerCase();
    if (lower.includes(vLower)) {
      if (!selectedUpgrades.some(x => x.name.toLowerCase() === vLower)) {
        selectedUpgrades.push(v);
      }
    }
  }

  return { selectedUpgrades };
}

export function buildCompleteVariants(selectedVariants: ItemVariant[]): ItemVariant[] {
  return (selectedVariants || []).map(v => ({
    name: v.name,
    price: Number(v.price) || 0,
  }));
}
