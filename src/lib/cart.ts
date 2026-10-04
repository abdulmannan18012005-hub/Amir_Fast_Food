import { MenuItem, ItemVariant, CartItem } from '../types';
import { safeJson } from './storage';

// Build a standardized cart item ensuring it always has name and image_url
export function buildCartItem(menuItem: MenuItem, selectedVariants: ItemVariant[], quantity: number = 1): CartItem {
  const basePrice = menuItem.price;
  const variantsPrice = selectedVariants.reduce((sum, v) => sum + v.price, 0);
  
  return {
    menu_item_id: menuItem.id,
    name: menuItem.name,
    image_url: menuItem.image_url || '/placeholder.png',
    quantity,
    price: basePrice + variantsPrice,
    variants: selectedVariants,
  };
}

export function getCart(): CartItem[] {
  return safeJson<CartItem[]>('cart', []);
}

function saveCart(cart: CartItem[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cartUpdated'));
  }
}

export function addToCart(newItem: CartItem) {
  const cart = getCart();
  
  // Find identical item (same ID and exact same variants)
  const existingIndex = cart.findIndex(
    item => 
      item.menu_item_id === newItem.menu_item_id && 
      JSON.stringify(item.variants.sort((a, b) => a.name.localeCompare(b.name))) === 
      JSON.stringify(newItem.variants.sort((a, b) => a.name.localeCompare(b.name)))
  );

  if (existingIndex >= 0) {
    cart[existingIndex].quantity += newItem.quantity;
  } else {
    cart.push(newItem);
  }
  
  saveCart(cart);
}

export function updateQty(menuItemId: string, variants: ItemVariant[], delta: number) {
  const cart = getCart();
  const existingIndex = cart.findIndex(
    item => 
      item.menu_item_id === menuItemId && 
      JSON.stringify(item.variants.sort((a, b) => a.name.localeCompare(b.name))) === 
      JSON.stringify(variants.sort((a, b) => a.name.localeCompare(b.name)))
  );

  if (existingIndex >= 0) {
    const newQty = cart[existingIndex].quantity + delta;
    if (newQty <= 0) {
      cart.splice(existingIndex, 1);
    } else if (newQty <= 20) {
      cart[existingIndex].quantity = newQty;
    }
    saveCart(cart);
  }
}

export function removeItem(menuItemId: string, variants: ItemVariant[]) {
  const cart = getCart();
  const updatedCart = cart.filter(
    item => 
      !(item.menu_item_id === menuItemId && 
        JSON.stringify(item.variants.sort((a, b) => a.name.localeCompare(b.name))) === 
        JSON.stringify(variants.sort((a, b) => a.name.localeCompare(b.name))))
  );
  saveCart(updatedCart);
}

export function clearCart() {
  saveCart([]);
}

export function getCartSubtotal(cart: CartItem[]): number {
  return cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
}
