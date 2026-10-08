const fs = require('fs');
let code = fs.readFileSync('src/server/location.ts', 'utf8');
code = code.replace(/`AMR Fast Food \/ \$\{process\.env\.SHOP_EMAIL \|\| 'support@amirfastfood\.com'\}`/g, 
  "process.env.SHOP_EMAIL ? `AMR Fast Food / ${process.env.SHOP_EMAIL}` : 'AMR Fast Food (https://amir-fast-food.vercel.app)'"
);
fs.writeFileSync('src/server/location.ts', code);
