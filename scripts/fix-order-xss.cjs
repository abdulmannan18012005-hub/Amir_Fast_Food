const fs = require('fs');
let code = fs.readFileSync('src/server/order.ts', 'utf8');

code = code.replace(/const ip = getClientIp\(\);/, 
`const ip = getClientIp();
      const stripTags = (s: string) => (s || '').replace(/[<>]/g, '');
      payload.customerName = stripTags(payload.customerName);
      payload.deliveryAddress = stripTags(payload.deliveryAddress);
      if (payload.customerEmail) payload.customerEmail = stripTags(payload.customerEmail);`
);

// also fix the TS errors I saw earlier: "Expected 2 arguments, but got 1." in order.ts(219,11)
// Let's see what's at 219. Probably `sendOrderPush(order.id)`. 
// The signature is `sendOrderPush(orderId, summary)`
code = code.replace(/sendOrderPush\(order\.id\);/, "sendOrderPush(order.id, 'New Order');");

fs.writeFileSync('src/server/order.ts', code);
