import type { CartItem } from '../types';
import { playSuccessChime } from './sound';

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem('cart');
  return saved ? JSON.parse(saved) : [];
}

export function saveCart(cart: CartItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('cart', JSON.stringify(cart));
  window.dispatchEvent(new Event('cartUpdated'));
}

export function clearCart() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('cart');
  window.dispatchEvent(new Event('cartUpdated'));
}

export function addToCart(item: CartItem, playSound = false) {
  const cart = getCart();
  const existingIdx = cart.findIndex(c => 
    c.menu_item_id === item.menu_item_id && 
    JSON.stringify(c.variants) === JSON.stringify(item.variants)
  );

  if (existingIdx !== -1) {
    cart[existingIdx].quantity += item.quantity;
  } else {
    cart.push(item);
  }

  saveCart(cart);
  if (playSound) playSuccessChime();
}

export function updateQty(menu_item_id: string, variants: any[], quantity: number) {
  if (quantity <= 0) return removeItem(menu_item_id, variants);
  const cart = getCart();
  const existingIdx = cart.findIndex(c => 
    c.menu_item_id === menu_item_id && 
    JSON.stringify(c.variants) === JSON.stringify(variants)
  );
  if (existingIdx !== -1) {
    cart[existingIdx].quantity = quantity;
    saveCart(cart);
  }
}

export function removeItem(menu_item_id: string, variants: any[]) {
  const cart = getCart();
  const newCart = cart.filter(c => !(c.menu_item_id === menu_item_id && JSON.stringify(c.variants) === JSON.stringify(variants)));
  saveCart(newCart);
}

export function getCartSubtotal(cart: CartItem[]): number {
  return cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
}
