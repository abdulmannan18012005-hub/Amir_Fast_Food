import re

with open('src/routes/menu.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace sticky classes
content = content.replace(
    'className="sticky top-16 z-40 bg-background/90 backdrop-blur-md border-b border-border shadow-sm"',
    'className="w-full border-b border-border/40 bg-background/50 py-4"'
)

# Remove the scrollMarginTop since it's no longer sticky
content = content.replace('style={{ scrollMarginTop: "280px" }}', '')

with open('src/routes/menu.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
