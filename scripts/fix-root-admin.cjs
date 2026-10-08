const fs = require('fs');
let code = fs.readFileSync('src/routes/__root.tsx', 'utf8');

if (!code.includes('const isAdmin =')) {
  code = code.replace(/const location = useLocation\(\);/, "const location = useLocation();\n  const isAdmin = location.pathname.startsWith('/admin');");
  code = code.replace(/<Header \/>/, '{!isAdmin && <Header />}');
  code = code.replace(/<Footer \/>/, '{!isAdmin && <Footer />}');
  fs.writeFileSync('src/routes/__root.tsx', code);
}
