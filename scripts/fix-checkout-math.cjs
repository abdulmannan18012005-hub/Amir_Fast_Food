const fs = require('fs');
let code = fs.readFileSync('src/routes/checkout.tsx', 'utf8');

code = code.replace(/const subtotal = cartItems\.reduce\(\(acc, item\) => acc \+ \(item\.price \* item\.quantity\), 0\);/, "const subtotal = getCartSubtotal(cartItems);");

fs.writeFileSync('src/routes/checkout.tsx', code);
