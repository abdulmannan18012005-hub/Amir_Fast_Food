const fs = require('fs');
let code = fs.readFileSync('src/components/cart/CartDrawer.tsx', 'utf8');

if (!code.includes('getCartSubtotal')) {
  code = code.replace(/(import \{ addToCart, getCart, removeItem, clearCart )( \} from '\.\.\/\.\.\/lib\/cart';)/, "$1, getCartSubtotal$2");
}

code = code.replace(/const subtotal = items\.reduce\(\(sum, item\) => \{[\s\S]*?\}, 0\);/, "const subtotal = getCartSubtotal(items);");

fs.writeFileSync('src/components/cart/CartDrawer.tsx', code);
