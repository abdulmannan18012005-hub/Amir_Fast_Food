import re

with open('src/routes/index.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the hardcoded array in index.tsx
old_array = r"\{\[\s*\{\s*id:\s*'cat_burgers'.*?\]\.map"

new_array = '''{[
                { id: 'cat_deals', name: 'Deals & Combos', sub: 'Value Packs', img: 'https://images.unsplash.com/photo-1594968973184-9040a5a79963?auto=format&fit=crop&w=300&q=80' },
                { id: 'cat_specials', name: 'Specials', sub: 'Chef Recommended', img: 'https://images.unsplash.com/photo-1544025162-811114215b80?auto=format&fit=crop&w=300&q=80' },
                { id: 'cat_burgers', name: 'Burgers', sub: 'Smash & Zinger', img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80' },
                { id: 'cat_shawarma', name: 'Shawarma', sub: 'Authentic Arab', img: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=300&q=80' },
                { id: 'cat_pizza', name: 'Pizza', sub: 'Oven Baked', img: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80' },
                { id: 'cat_chicken', name: 'Chicken & Wings', sub: 'Crispy Fried', img: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=300&q=80' },
                { id: 'cat_sandwiches_fries', name: 'Sandwiches & Fries', sub: 'Loaded Snacks', img: 'https://images.unsplash.com/photo-1534080564583-6be75777b70a?auto=format&fit=crop&w=300&q=80' },
                { id: 'cat_drinks', name: 'Drinks', sub: 'Cold Beverages', img: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=300&q=80' }
              ].map'''

content = re.sub(old_array, new_array, content, flags=re.DOTALL)

with open('src/routes/index.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
