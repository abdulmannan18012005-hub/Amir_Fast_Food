import re

with open('src/routes/menu.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('className="scroll-mt-96"', 'style={{ scrollMarginTop: "280px" }}')

with open('src/routes/menu.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
