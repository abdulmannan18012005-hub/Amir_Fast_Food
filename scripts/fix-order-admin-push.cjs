const fs = require('fs');
let code = fs.readFileSync('src/server/order.ts', 'utf8');

if (!code.includes('sendAdminOrderPush')) {
  // Add import
  code = code.replace(/import \{ sendOrderPush \} from '\.\/push';/, "import { sendOrderPush, sendAdminOrderPush } from './push';");

  // Call it right before the email block
  const adminPushBlock = `
    // Admin Push Alert
    const adminSummary = \`New order #\${orderId.slice(0, 8).toUpperCase()} · PKR \${computedSubtotal + finalDeliveryFee} · \${payload.paymentMethod === 'cod' ? 'COD' : 'PAID'}\`;
    Promise.race([
      sendAdminOrderPush(orderId, adminSummary),
      new Promise(r => setTimeout(r, 4000))
    ]).catch(() => {});
`;

  code = code.replace(/(\/\/\ 6\.\ Send email \(fire and forget with timeout\))/, adminPushBlock + "\n    $1");
  fs.writeFileSync('src/server/order.ts', code);
}
