import React, { useState, useEffect } from 'react';
import { MenuItem, ItemVariant, CartItem } from '../types';
import { safeJson } from './storage';

// Build a standardized cart item ensuring it always has name and image_url
export function buildCartItem(menuItem: MenuItem, selectedVariants: ItemVariant[], quantity: number = 1): CartItem {
  const basePrice = menuItem.price;
  
  return {
    menu_item_id: menuItem.id,
    name: menuItem.name,
    image_url: menuItem.image_url || '/placeholder.png',
    quantity: Math.max(1, quantity),
    price: basePrice,
    variants: normalizeVariants(selectedVariants),
  };
}

export function getCart(): CartItem[] {
  return safeJson<CartItem[]>('cart', []);
}

export function saveCart(cart: CartItem[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cartUpdated'));
  }
}

export function normalizeVariants(variants?: ItemVariant[] | null): ItemVariant[] {
  if (!variants || !Array.isArray(variants)) return [];
  return [...variants]
    .map(v => ({
      name: String(v?.name || '').trim(),
      price: Number(v?.price) || 0,
    }))
    .filter(v => v.name.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function areVariantsEqual(v1?: ItemVariant[] | null, v2?: ItemVariant[] | null): boolean {
  const norm1 = normalizeVariants(v1);
  const norm2 = normalizeVariants(v2);
  if (norm1.length !== norm2.length) return false;
  return JSON.stringify(norm1) === JSON.stringify(norm2);
}

export function getCartLineId(menuItemId: string, variants?: ItemVariant[] | null): string {
  const norm = normalizeVariants(variants);
  if (norm.length === 0) return menuItemId;
  const vKeys = norm.map(v => `${v.name}:${v.price}`).join('|');
  return `${menuItemId}_${vKeys}`;
}

export function addToCart(newItem: CartItem) {
  const cart = getCart();
  const normalizedItem: CartItem = {
    ...newItem,
    quantity: Math.min(Math.max(1, Number(newItem.quantity) || 1), 20),
    price: Number(newItem.price) || 0,
    variants: normalizeVariants(newItem.variants),
  };
  
  // Find identical item (same ID and exact same variants)
  const existingIndex = cart.findIndex(
    item => 
      item.menu_item_id === normalizedItem.menu_item_id && 
      areVariantsEqual(item.variants, normalizedItem.variants)
  );

  if (existingIndex >= 0) {
    cart[existingIndex].quantity = Math.min(20, (cart[existingIndex].quantity || 0) + normalizedItem.quantity);
  } else {
    cart.push(normalizedItem);
  }
  
  saveCart(cart);
}

export function removeItem(menuItemId: string, variants?: ItemVariant[] | null) {
  const cart = getCart();
  const updatedCart = cart.filter(
    item => 
      !(item.menu_item_id === menuItemId && areVariantsEqual(item.variants, variants))
  );
  saveCart(updatedCart);
}

export function updateItemQuantity(menuItemId: string, variants: ItemVariant[] | null | undefined, quantity: number) {
  if (quantity <= 0) {
    removeItem(menuItemId, variants);
    return;
  }
  const cart = getCart();
  const index = cart.findIndex(
    item => 
      item.menu_item_id === menuItemId && 
      areVariantsEqual(item.variants, variants)
  );
  if (index >= 0) {
    cart[index].quantity = Math.min(Math.max(1, quantity), 20);
    saveCart(cart);
  }
}

export function clearCart() {
  saveCart([]);
}

/** Total for a single cart line: (base price + variant prices) * quantity */
export function lineTotal(item: CartItem): number {
  const varsPrice = item.variants?.reduce((s, v) => s + (Number(v.price) || 0), 0) || 0;
  return (Number(item.price) + varsPrice) * item.quantity;
}

export function getCartSubtotal(cart: CartItem[]): number {
  return cart.reduce((acc, item) => acc + lineTotal(item), 0);
}

export function getCartCount(cart?: CartItem[]): number {
  const c = cart || getCart();
  return c.reduce((acc, item) => acc + (item.quantity || 0), 0);
}

export function useCartCount(): number {
  const [count, setCount] = useState(() => getCartCount());

  useEffect(() => {
    const update = () => setCount(getCartCount());
    window.addEventListener('storage', update);
    window.addEventListener('cartUpdated', update);
    return () => {
      window.removeEventListener('storage', update);
      window.removeEventListener('cartUpdated', update);
    };
  }, []);

  return count;
}
