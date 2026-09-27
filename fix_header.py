import re

with open('src/routes/__root.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the button block
pattern = r'<button[^>]*?title="Toggle Delivery / Takeaway"[^>]*?>\s*<span id="fulfillmentLabel">.*?</span>\s*</button>'
content = re.sub(pattern, '', content, flags=re.DOTALL)

with open('src/routes/__root.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
