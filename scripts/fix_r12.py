import os
import re

order_path = "src/server/order.ts"
with open(order_path, "r", encoding="utf-8") as f:
    code = f.read()

# Fix name in getPublicOrder and getPublicOrders
code = code.replace("customer_name: order.customer_name,", "customer_name: order.customer_name?.split(' ')[0] || 'Customer',")
code = code.replace("customer_name: data.customer_name,", "customer_name: data.customer_name?.split(' ')[0] || 'Customer',")

# Replace getPublicOrders UUID check
old_uuid = "const validIds = data.orderIds.slice(0, 3).filter(id => id.length === 36);"
new_uuid = "const validIds = data.orderIds.slice(0, 3).filter(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id));"
code = code.replace(old_uuid, new_uuid)

# Honeypot: Do not return orderId
# "Return a normal generic error to bots instead? No — keep silent for bots but make sure legitimate users can never hit it"
# Actually the rule says: "Return a normal generic error to bots instead? No — keep silent for bots but make sure legitimate users can never hit it (the honeypot input must never be auto-filled: set autoComplete='off', name='website_url_hp', aria-hidden, off-screen not display:none)."
# Wait, let's fix checkout.tsx for honeypot UI instead.

with open(order_path, "w", encoding="utf-8") as f:
    f.write(code)

# Now fix checkout.tsx honeypot
checkout_path = "src/routes/checkout.tsx"
with open(checkout_path, "r", encoding="utf-8") as f:
    checkout = f.read()

checkout = checkout.replace(
    '<input type="text" value={hp} onChange={e => setHp(e.target.value)} tabIndex={-1} autoComplete="off" />',
    '<input type="text" name="website_url_hp" value={hp} onChange={e => setHp(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" />'
)
checkout = checkout.replace(
    'className="hidden"',
    'className="absolute left-[-9999px] top-auto w-[1px] h-[1px] overflow-hidden"'
)

with open(checkout_path, "w", encoding="utf-8") as f:
    f.write(checkout)

