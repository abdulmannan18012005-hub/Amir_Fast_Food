const fs = require('fs');
['src/routes/admin/history.tsx', 'src/routes/admin/menu.tsx', 'src/routes/admin/kitchen.tsx'].forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/import \{ safeJson \} from '\.\.\/\.\.\/lib\/storage';/, "import { safeJson, getRawSession } from '../../lib/storage';");
  fs.writeFileSync(f, c);
});
