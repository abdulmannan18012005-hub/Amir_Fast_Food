const fs = require('fs');
['kitchen.tsx', 'history.tsx', 'menu.tsx'].forEach(file => {
  let p = 'src/routes/admin/' + file;
  let code = fs.readFileSync(p, 'utf8');
  
  if (code.includes('head: () => ({') || code.includes('head: () => seo({')) {
    code = code.replace(/(head:\s*\(\)\s*=>\s*seo\(\{)/, 'head: () => Object.assign(seo({');
    code = code.replace(/(path:\s*'\/admin',\s*noindex:\s*true\s*\}\))/, "path: '/admin', noindex: true }), { links: [{ rel: 'manifest', href: '/admin.webmanifest' }] })");
    
    // For kitchen which has a raw object:
    code = code.replace(/head:\s*\(\)\s*=>\s*\(\{\s*meta:\s*\[\{\s*name:\s*'robots',\s*content:\s*'noindex'\s*\}\]\s*\}\)/, "head: () => ({ meta: [{ name: 'robots', content: 'noindex' }], links: [{ rel: 'manifest', href: '/admin.webmanifest' }] })");
    
    fs.writeFileSync(p, code);
  }
});
