const fs = require('fs');
let code = fs.readFileSync('src/server/order.ts', 'utf8');
code = code.replace(/sendOrderPush\(order\.id\);/g, "sendOrderPush(order.id, 'New Order');");
fs.writeFileSync('src/server/order.ts', code);
