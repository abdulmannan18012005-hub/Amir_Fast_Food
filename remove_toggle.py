import re

with open('src/routes/__root.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find('title="Toggle Delivery / Takeaway"')
if start_idx != -1:
    # Find the <button that comes before it
    button_start = content.rfind('<button', 0, start_idx)
    # Find the </button> that comes after it
    button_end = content.find('</button>', start_idx) + len('</button>')
    
    # Remove it
    content = content[:button_start] + content[button_end:]

with open('src/routes/__root.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
