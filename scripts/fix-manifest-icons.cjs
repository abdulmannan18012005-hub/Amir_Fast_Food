const fs = require('fs');
let code = fs.readFileSync('public/admin.webmanifest', 'utf8');
code = code.replace(/icon-192x192\.png/, 'icon-192.png');
code = code.replace(/icon-512x512\.png/, 'icon-512.png');
fs.writeFileSync('public/admin.webmanifest', code);

// Check manifest.json too
let pubCode = fs.readFileSync('public/manifest.json', 'utf8');
pubCode = pubCode.replace(/icon-192x192\.png/, 'icon-192.png');
pubCode = pubCode.replace(/icon-512x512\.png/, 'icon-512.png');
fs.writeFileSync('public/manifest.json', pubCode);
