const fs = require('fs');
['kitchen.tsx', 'history.tsx', 'menu.tsx'].forEach(file => {
  let p = 'src/routes/admin/' + file;
  let code = fs.readFileSync(p, 'utf8');
  if (!code.includes('AdminNav')) {
    code = code.replace(/import \{ PinGate \} from '\.\.\/\.\.\/components\/admin\/PinGate';/, "import { PinGate } from '../../components/admin/PinGate';\nimport { AdminNav } from '../../components/admin/AdminNav';");
    
    // In kitchen.tsx
    if (file === 'kitchen.tsx') {
      code = code.replace(/<PinGate>/, '<PinGate>\n      <AdminNav />');
      code = code.replace(/<header className="flex justify-between items-center mb-8">[\s\S]*?<\/header>/, '');
    }
    
    // In history.tsx
    if (file === 'history.tsx') {
      code = code.replace(/<PinGate>/, '<PinGate>\n      <AdminNav />');
      code = code.replace(/<header className="flex justify-between items-center mb-8">[\s\S]*?<\/header>/, '');
      code = code.replace(/<header className="flex justify-between items-center mb-6">[\s\S]*?<\/header>/, '');
    }
    
    // In menu.tsx
    if (file === 'menu.tsx') {
      code = code.replace(/<PinGate>/, '<PinGate>\n      <AdminNav />');
      code = code.replace(/<div className="flex justify-between items-center mb-8">[\s\S]*?<\/div>/, '');
      // sometimes it's a header
      code = code.replace(/<header className="flex justify-between items-center mb-8">[\s\S]*?<\/header>/, '');
    }
    
    fs.writeFileSync(p, code);
  }
});
