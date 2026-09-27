import re

with open('src/components/navigation/HeaderSearch.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '<img src={item.image_url} alt={item.name} className="w-12 h-12 object-cover rounded-md" />',
    '<img src={item.image_url || "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=100&q=80"} alt={item.name} onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=100&q=80"; }} className="w-12 h-12 object-cover rounded-md bg-muted" />'
)

with open('src/components/navigation/HeaderSearch.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
