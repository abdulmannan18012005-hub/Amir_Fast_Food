const fs = require('fs');
const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));

vercel.headers.forEach(h => {
  if (h.source === '/(.*)') {
    // Check if Permissions-Policy exists
    if (!h.headers.find(x => x.key === 'Permissions-Policy')) {
      h.headers.push({
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(self)'
      });
    }
  }
});

fs.writeFileSync('vercel.json', JSON.stringify(vercel, null, 2));
console.log('Fixed vercel.json');
