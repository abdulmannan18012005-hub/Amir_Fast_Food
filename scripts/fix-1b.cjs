const fs = require('fs');
for (const file of ['src/routes/admin/history.tsx', 'src/routes/admin/menu.tsx']) {
  let code = fs.readFileSync(file, 'utf8');
  if (!code.includes('getRawSession')) {
    code = code.replace(/import \{ safeJson \} from '\.\.\/\.\.\/lib\/storage';/, "import { safeJson, getRawSession } from '../../lib/storage';");
    fs.writeFileSync(file, code);
  }
}
