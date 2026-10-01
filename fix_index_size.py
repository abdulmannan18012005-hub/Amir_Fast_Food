with open('src/routes/index.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Only change the one inside the categories map!
old_cat = """                >
                  <div className="aspect-square overflow-hidden">
                    <img src={cat.img}"""
                    
new_cat = """                >
                  <div className="h-32 sm:h-40 overflow-hidden">
                    <img src={cat.img}"""

content = content.replace(old_cat, new_cat)

with open('src/routes/index.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
