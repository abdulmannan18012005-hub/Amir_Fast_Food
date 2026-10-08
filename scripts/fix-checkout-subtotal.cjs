const fs = require('fs');
let code = fs.readFileSync('src/routes/checkout.tsx', 'utf8');

// Replace the inline subtotal with the helper
code = code.replace(/const subtotal = cartItems\.reduce\(\(acc, item\) => acc \+ \(item\.price \* item\.quantity\), 0\);/, "const subtotal = getCartSubtotal(cartItems);");

// Ensure getCartSubtotal is imported
if (!code.includes('getCartSubtotal')) {
  code = code.replace(/(import \{[^\}]+)(\} from '\.\.\/lib\/cart';)/, "$1, getCartSubtotal $2");
}

fs.writeFileSync('src/routes/checkout.tsx', code);
