const fs = require('fs');
let content = fs.readFileSync('src/routes/index.tsx', 'utf8');
content = content.replace(/head: \(\) => \(\{[\s\S]*?\}\),/, `head: () => {
    const s = seo({ title: 'Amir Fast Food - Shawarma, Burgers & Combos', description: 'Order the best Shawarma and Burgers in Lahore from Amir Fast Food.', path: '/' });
    return {
      meta: s.meta,
      links: [
        ...s.links,
        { rel: 'preload', as: 'image', href: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80', fetchPriority: 'high' }
      ]
    };
},`);
fs.writeFileSync('src/routes/index.tsx', content);
console.log('Fixed index.tsx');
