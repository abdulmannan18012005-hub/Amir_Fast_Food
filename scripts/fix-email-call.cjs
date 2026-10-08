const fs = require('fs');
let code = fs.readFileSync('src/server/order.ts', 'utf8');

const regex = /sendOrderReceiptEmail\(\{[\s\S]*?total: computedSubtotal \+ finalDeliveryFee\s*\}\),/;
const replacement = `sendOrderReceiptEmail(
            { id: orderId, customer_name: nameStr, customer_phone: p_phone, customer_email: p_email, delivery_address: p_address, payment_method: p_method, delivery_fee: finalDeliveryFee, total_amount: computedSubtotal + finalDeliveryFee } as any,
            dbItems.map((i, idx) => ({ ...i, name: itemNames[idx] })) as any
          ),`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/server/order.ts', code);
