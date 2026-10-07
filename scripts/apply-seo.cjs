const fs = require('fs');

const files = [
  'src/routes/cart.tsx',
  'src/routes/chat.tsx',
  'src/routes/checkout.tsx',
  'src/routes/index.tsx',
  'src/routes/locations.tsx',
  'src/routes/menu.tsx',
  'src/routes/privacy.tsx',
  'src/routes/terms.tsx',
  'src/routes/orders/$orderId.tsx',
  'src/routes/admin/history.tsx',
  'src/routes/admin/kitchen.tsx',
  'src/routes/admin/menu.tsx'
];

const seoData = {
  'src/routes/cart.tsx': { title: 'Your Cart - Amir Fast Food', desc: 'Review your cart at Amir Fast Food.', path: '/cart' },
  'src/routes/chat.tsx': { title: 'Chat with AmirBot', desc: 'Order via our AI assistant AmirBot.', path: '/chat' },
  'src/routes/checkout.tsx': { title: 'Checkout - Amir Fast Food', desc: 'Securely checkout your order at Amir Fast Food.', path: '/checkout' },
  'src/routes/index.tsx': { title: 'Amir Fast Food - Shawarma, Burgers & Combos', desc: 'Order the best Shawarma and Burgers in Lahore from Amir Fast Food.', path: '/' },
  'src/routes/locations.tsx': { title: 'Our Locations - Amir Fast Food', desc: 'Find Amir Fast Food in Lahore.', path: '/locations' },
  'src/routes/menu.tsx': { title: 'Menu - Amir Fast Food', desc: 'Explore our delicious menu of Shawarmas and Burgers.', path: '/menu' },
  'src/routes/privacy.tsx': { title: 'Privacy Policy - Amir Fast Food', desc: 'Privacy Policy for Amir Fast Food.', path: '/privacy' },
  'src/routes/terms.tsx': { title: 'Terms of Service - Amir Fast Food', desc: 'Terms of Service for Amir Fast Food.', path: '/terms' },
  'src/routes/orders/$orderId.tsx': { title: 'Track order — Amir Fast Food', desc: 'Track your Amir Fast Food order.', path: '/orders' }
};

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (file.includes('/admin/')) {
    if (!content.includes('import { seo }')) {
      content = content.replace(/import \{ createFileRoute \} from '@tanstack\/react-router';/, "import { createFileRoute } from '@tanstack/react-router';\nimport { seo } from '../../lib/seo';");
      content = content.replace(/head: \(\) => \(\{ meta: \[\{ name: 'robots', content: 'noindex' \}, \{ title: '.*?' \}\] \}\)/, "head: () => seo({ title: 'Admin - Amir Fast Food', description: 'Admin Panel', path: '/admin', noindex: true })");
      fs.writeFileSync(file, content);
    }
  } else {
    const data = seoData[file];
    if (data && !content.includes('import { seo }')) {
       let relPath = file.includes('orders') ? '../../lib/seo' : '../lib/seo';
       content = content.replace(/import \{ createFileRoute \} from '@tanstack\/react-router';/, `import { createFileRoute } from '@tanstack/react-router';\nimport { seo } from '${relPath}';`);
       
       if (content.includes('head: () =>')) {
          content = content.replace(/head: \(\) => .*?,(\n|\r\n| )+component:/, `head: () => seo({ title: '${data.title}', description: '${data.desc}', path: '${data.path}' }),\n  component:`);
       } else {
          content = content.replace(/component: /, `head: () => seo({ title: '${data.title}', description: '${data.desc}', path: '${data.path}' }),\n  component: `);
       }
       fs.writeFileSync(file, content);
    }
  }
}
console.log('Done!');
