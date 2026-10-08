const fs = require('fs');
let indexCode = fs.readFileSync('src/routes/index.tsx', 'utf8');
indexCode = indexCode.replace(/https:\/\/images\.unsplash\.com\/photo-1550547660-d9450f859349\?auto=format&fit=crop&w=1200&q=80/g, '/hero.webp');
fs.writeFileSync('src/routes/index.tsx', indexCode);

let menuCode = fs.readFileSync('src/routes/menu.tsx', 'utf8');
menuCode = menuCode.replace(/https:\/\/images\.unsplash\.com\/photo-1568901346375-23c9450c58cd\?auto=format&fit=crop&w=400&q=80/g, '/placeholder.webp');
fs.writeFileSync('src/routes/menu.tsx', menuCode);

let headerSearchCode = fs.readFileSync('src/components/navigation/HeaderSearch.tsx', 'utf8');
headerSearchCode = headerSearchCode.replace(/https:\/\/images\.unsplash\.com\/photo-1568901346375-23c9450c58cd\?auto=format&fit=crop&w=100&q=80/g, '/placeholder.webp');
fs.writeFileSync('src/components/navigation/HeaderSearch.tsx', headerSearchCode);
