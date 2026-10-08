const fs = require('fs');
let code = fs.readFileSync('src/routes/__root.tsx', 'utf8');

if (!code.includes('const [botLoaded, setBotLoaded]')) {
  code = code.replace(/const \[isCartOpen, setIsCartOpen\] = React\.useState\(false\);/, "const [isCartOpen, setIsCartOpen] = React.useState(false);\n  const [botLoaded, setBotLoaded] = React.useState(false);");
  code = code.replace(/const handleOpenCart = \(\) => setIsCartOpen\(true\);/, "const handleOpenCart = () => setIsCartOpen(true);\n    const handleToggleBot = () => setBotLoaded(true);\n    window.addEventListener('toggleAmirBot', handleToggleBot);");
  code = code.replace(/window\.removeEventListener\('openCart', handleOpenCart\);/, "window.removeEventListener('openCart', handleOpenCart);\n      window.removeEventListener('toggleAmirBot', handleToggleBot);");
  code = code.replace(/<React\.Suspense fallback=\{null\}><AmirBotDrawer \/><\/React\.Suspense>/, "{botLoaded && <React.Suspense fallback={null}><AmirBotDrawer /></React.Suspense>}");
  fs.writeFileSync('src/routes/__root.tsx', code);
}
