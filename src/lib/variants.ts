import type { ItemVariant, MenuItem } from '../types';

export const DEFAULT_DRINKS = ['Pepsi', '7Up', 'Mirinda', 'Mountain Dew', 'Diet Pepsi'];
export const DEFAULT_SIDES = ['Regular Fries', 'Masala Fries', 'Coleslaw', 'Garlic Mayo Dip'];
export const DEFAULT_UPGRADES: ItemVariant[] = [
  { name: 'Extra Cheese', price: 60 },
  { name: 'Extra Dip', price: 50 },
  { name: 'Jalapenos', price: 40 },
];

export function isDealOrHasVariants(item: { category_id?: string; variants?: ItemVariant[] | null }): boolean {
  return item.category_id === 'cat_deals' || (Array.isArray(item.variants) && item.variants.length > 0);
}

export function getAllAvailableUpgrades(item: { variants?: ItemVariant[] | null }): ItemVariant[] {
  const custom = (Array.isArray(item.variants) && item.variants.length > 0) ? item.variants : [];
  const map = new Map<string, ItemVariant>();
  for (const u of DEFAULT_UPGRADES) {
    map.set(u.name.toLowerCase(), u);
  }
  for (const c of custom) {
    map.set(c.name.toLowerCase(), c);
  }
  return Array.from(map.values());
}

export function detectInitialVariants(text: string, upgrades: ItemVariant[]): {
  drink: string;
  side: string;
  selectedUpgrades: ItemVariant[];
} {
  const lower = (text || '').toLowerCase();
  
  let drink = 'Pepsi';
  for (const d of DEFAULT_DRINKS) {
    if (lower.includes(d.toLowerCase())) {
      drink = d;
      break;
    }
  }

  let side = 'Regular Fries';
  for (const s of DEFAULT_SIDES) {
    if (lower.includes(s.toLowerCase())) {
      side = s;
      break;
    }
  }

  const selectedUpgrades: ItemVariant[] = [];
  for (const u of upgrades) {
    const uLower = u.name.toLowerCase();
    if (
      lower.includes(uLower) ||
      (uLower === 'extra cheese' && lower.includes('cheese')) ||
      (uLower === 'extra dip' && lower.includes('dip')) ||
      (uLower === 'jalapenos' && (lower.includes('jalapeno') || lower.includes('jalapenos')))
    ) {
      if (!selectedUpgrades.some(x => x.name.toLowerCase() === uLower)) {
        selectedUpgrades.push(u);
      }
    }
  }

  return { drink, side, selectedUpgrades };
}

export function buildCompleteVariants(
  isDeal: boolean,
  drink: string,
  side: string,
  selectedUpgrades: ItemVariant[]
): ItemVariant[] {
  if (isDeal) {
    return [
      { name: `Drink: ${drink}`, price: 0 },
      { name: `Side: ${side}`, price: 0 },
      ...selectedUpgrades,
    ];
  }
  return [...selectedUpgrades];
}
