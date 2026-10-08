const fs = require('fs');
let code = fs.readFileSync('src/lib/cart.ts', 'utf8');

// Change buildCartItem to store base price
code = code.replace(/price: basePrice \+ variantsPrice,/, "price: basePrice,");

// Update getCartSubtotal to compute (price + variants) * qty
const newGetCartSubtotal = `export function getCartSubtotal(cart: CartItem[]): number {
  return cart.reduce((acc, item) => {
    const varsPrice = item.variants?.reduce((s, v) => s + (Number(v.price) || 0), 0) || 0;
    return acc + ((Number(item.price) || 0) + varsPrice) * item.quantity;
  }, 0);
}`;
code = code.replace(/export function getCartSubtotal[\s\S]*?\}\n/, newGetCartSubtotal + '\n');
fs.writeFileSync('src/lib/cart.ts', code);
