const fs = require('fs');
let c = fs.readFileSync('src/server/location.ts', 'utf8');
const uaString = `const UA = process.env.SHOP_EMAIL
  ? \`AmirFastFood/1.0 (\${process.env.SHOP_EMAIL})\`
  : 'AmirFastFood/1.0 (+https://amir-fast-food.vercel.app)';`;

c = c.replace(/const res = await fetch\(`https:\/\/nominatim\.openstreetmap\.org\/reverse\?lat=\$\{lat\}&lon=\$\{lng\}&format=json`, \{\n\s*headers: \{\n\s*'User-Agent': 'AmirFastFood\/1\.0 \(support@amirfastfood\.com\)'\n\s*\}\n\s*\}\);/, `${uaString}\n    const res = await fetch(\`https://nominatim.openstreetmap.org/reverse?lat=\${lat}&lon=\${lng}&format=json\`, {
      headers: { 'User-Agent': UA }
    });`);

c = c.replace(/const res = await fetch\(`https:\/\/nominatim\.openstreetmap\.org\/search\?q=\$\{encodeURIComponent\(address\)\}&format=json&limit=1`, \{\n\s*headers: \{\n\s*'User-Agent': 'AmirFastFood\/1\.0 \(support@amirfastfood\.com\)'\n\s*\}\n\s*\}\);/, `${uaString}\n    const res = await fetch(\`https://nominatim.openstreetmap.org/search?q=\${encodeURIComponent(address)}&format=json&limit=1\`, {
      headers: { 'User-Agent': UA }
    });`);

fs.writeFileSync('src/server/location.ts', c);
console.log('Fixed location.ts');
