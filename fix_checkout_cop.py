import re

with open('src/routes/checkout.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace Cash on Delivery label and description
replacement = '''{ (localStorage.getItem('fulfillment') || 'delivery') === 'takeaway' ? (
                            <>
                              <span className="font-bold text-foreground block text-lg">Cash on Pickup (COP)</span>
                              <span className="text-sm text-muted-foreground block mt-0.5">Pay in cash when picking up your order</span>
                            </>
                          ) : (
                            <>
                              <span className="font-bold text-foreground block text-lg">Cash on Delivery (COD)</span>
                              <span className="text-sm text-muted-foreground block mt-0.5">Pay in cash when order arrives</span>
                              {subtotal < 1000 && <span className="text-xs text-amber-500 font-bold block mt-1">PKR 100 delivery fee added (orders under PKR 1000)</span>}
                            </>
                          )}'''

content = re.sub(
    r'<span className="font-bold text-foreground block text-lg">Cash on Delivery \(COD\)</span>\s*<span className="text-sm text-muted-foreground block mt-0\.5">Pay in cash when order arrives</span>\s*\{subtotal < 1000 && <span className="text-xs text-amber-500 font-bold block mt-1">PKR 100 delivery fee added \(orders under PKR 1000\)</span>\}',
    replacement,
    content
)

# And ensure deliveryFee is 0 for takeaway. (Let's check if it's already there)
# In checkout.tsx, deliveryFee is calculated. Let's make sure it handles fulfillment.
content = re.sub(
    r'const deliveryFee = subtotal >= 1000 \? 0 : 100;',
    r'const isTakeaway = (typeof window !== "undefined" ? localStorage.getItem("fulfillment") : "delivery") === "takeaway";\n  const deliveryFee = (isTakeaway || subtotal >= 1000) ? 0 : 100;',
    content
)


with open('src/routes/checkout.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
