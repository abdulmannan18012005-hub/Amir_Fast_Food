const fs = require('fs');
let code = fs.readFileSync('src/server/order.ts', 'utf8');

code = code.replace(/Promise\.race\(\[/g, "await Promise.race([");
fs.writeFileSync('src/server/order.ts', code);
