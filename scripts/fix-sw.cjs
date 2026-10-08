const fs = require('fs');
let code = fs.readFileSync('public/sw.js', 'utf8');

const replacement = "const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : ((event.notification.data && event.notification.data.orderId) ? `/orders/${event.notification.data.orderId}` : '/');";

code = code.replace(/const targetUrl = \(event\.notification\.data && event\.notification\.data\.orderId\) \?\s*`\/orders\/\$\{event\.notification\.data\.orderId\}` : '\/';/, replacement);
fs.writeFileSync('public/sw.js', code);
