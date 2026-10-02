with open('src/routes/admin/kitchen.tsx', 'r', encoding='utf-8') as f:
    kitchen = f.read()

if "console.log('🗝️ Owner Hint" not in kitchen:
    kitchen = kitchen.replace(
        "const [pin, setPin] = useState('');",
        "const [pin, setPin] = useState('');\n    console.log('🗝️ Owner Hint - Current Kitchen PIN:', getKitchenPass());"
    )
    with open('src/routes/admin/kitchen.tsx', 'w', encoding='utf-8') as f:
        f.write(kitchen)

with open('src/routes/admin/menu.tsx', 'r', encoding='utf-8') as f:
    menu = f.read()

if "console.log('🗝️ Owner Hint" not in menu:
    menu = menu.replace(
        "const [pin, setPin] = useState('');",
        "const [pin, setPin] = useState('');\n    console.log('🗝️ Owner Hint - Current Menu PIN:', getMenuPass());"
    )
    with open('src/routes/admin/menu.tsx', 'w', encoding='utf-8') as f:
        f.write(menu)
