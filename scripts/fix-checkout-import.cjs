const fs = require('fs');
let code = fs.readFileSync('src/routes/checkout.tsx', 'utf8');
if (!code.includes('import { getCartSubtotal }')) {
    code = code.replace(/import \{ CartItem \} from '\.\.\/types';/, "import { CartItem } from '../types';\nimport { getCartSubtotal } from '../lib/cart';");
    fs.writeFileSync('src/routes/checkout.tsx', code);
}
