import os

checkout_path = "src/routes/checkout.tsx"
with open(checkout_path, "r", encoding="utf-8") as f:
    code = f.read()

# Replace session storage code
old_code = """        playSuccessChime();
        localStorage.removeItem('cart');
        localStorage.setItem('user_profile', JSON.stringify({ name, phone, email, address }));
        sessionStorage.setItem('just_ordered', res.orderId || ''); 
        window.dispatchEvent(new Event('cartUpdated'));"""

new_code = """        playSuccessChime();
        localStorage.removeItem('cart');
        localStorage.setItem('user_profile', JSON.stringify({ name, phone, email, address }));
        if (res.orderId) {
          addActiveOrder(res.orderId);
          markJustOrdered(res.orderId);
        }
        window.dispatchEvent(new Event('cartUpdated'));
        window.dispatchEvent(new Event('orderPlaced'));"""

code = code.replace(old_code, new_code)

# Add import
import_stmt = "import { addActiveOrder, markJustOrdered } from '../lib/activeOrders';"
if import_stmt not in code:
    code = code.replace("import { createOrderFn } from '../server/order';", "import { createOrderFn } from '../server/order';\n" + import_stmt)

with open(checkout_path, "w", encoding="utf-8") as f:
    f.write(code)
