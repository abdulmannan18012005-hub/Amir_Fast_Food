const fs = require('fs');
let code = fs.readFileSync('src/routes/admin/kitchen.tsx', 'utf8');

// Insert esc at the top of handlePrint
if (!code.includes('const esc = (s: unknown)')) {
  code = code.replace(/const handlePrint = \(order: any\) => \{/, 
`const handlePrint = (order: any) => {
    const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] as string));
`);

  // Wrap variables in esc(). Wait, it's safer to just replace standard insertions.
  // The template is like \`<div ...>\${order.id}</div>\`
  // Since we don't know the exact names used in template, I'll replace \${order. with \${esc(order.
  // And \${item. with \${esc(item.
  code = code.replace(/\$\{order\.([^}]+)\}/g, '${esc(order.$1)}');
  code = code.replace(/\$\{item\.([^}]+)\}/g, '${esc(item.$1)}');
  code = code.replace(/\$\{new Date([^}]+)\}/g, '${esc(new Date$1)}');
  code = code.replace(/\$\{variant\.([^}]+)\}/g, '${esc(variant.$1)}');

  // Fix esc(esc(..)) if any
  code = code.replace(/esc\(esc\((.*?)\)\)/g, 'esc($1)');
}

fs.writeFileSync('src/routes/admin/kitchen.tsx', code);
