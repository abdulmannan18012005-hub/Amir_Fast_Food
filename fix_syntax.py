with open('src/routes/admin/kitchen.tsx', 'r', encoding='utf-8') as f:
    kitchen = f.read()

kitchen = kitchen.replace(
    "{ if (pin === getKitchenPass()) { setIsAuthenticated(true); sessionStorage.setItem('kitchen_auth', Date.now().toString()); } }\n                else { alert('Incorrect PIN!'); setPin(''); }",
    "if (pin === getKitchenPass()) { setIsAuthenticated(true); sessionStorage.setItem('kitchen_auth', Date.now().toString()); }\n                else { alert('Incorrect PIN!'); setPin(''); }"
)
kitchen = kitchen.replace(
    "{ if (pin === getKitchenPass()) { setIsAuthenticated(true); sessionStorage.setItem('kitchen_auth', Date.now().toString()); } }\n              else { alert('Incorrect PIN!'); setPin(''); }",
    "if (pin === getKitchenPass()) { setIsAuthenticated(true); sessionStorage.setItem('kitchen_auth', Date.now().toString()); }\n              else { alert('Incorrect PIN!'); setPin(''); }"
)

with open('src/routes/admin/kitchen.tsx', 'w', encoding='utf-8') as f:
    f.write(kitchen)

with open('src/routes/admin/menu.tsx', 'r', encoding='utf-8') as f:
    menu = f.read()

menu = menu.replace(
    "{ if (pin === getMenuPass()) { setIsAuthenticated(true); sessionStorage.setItem('menu_auth', Date.now().toString()); } }\n                else { alert('Incorrect PIN!'); setPin(''); }",
    "if (pin === getMenuPass()) { setIsAuthenticated(true); sessionStorage.setItem('menu_auth', Date.now().toString()); }\n                else { alert('Incorrect PIN!'); setPin(''); }"
)
menu = menu.replace(
    "{ if (pin === getMenuPass()) { setIsAuthenticated(true); sessionStorage.setItem('menu_auth', Date.now().toString()); } }\n              else { alert('Incorrect PIN!'); setPin(''); }",
    "if (pin === getMenuPass()) { setIsAuthenticated(true); sessionStorage.setItem('menu_auth', Date.now().toString()); }\n              else { alert('Incorrect PIN!'); setPin(''); }"
)

with open('src/routes/admin/menu.tsx', 'w', encoding='utf-8') as f:
    f.write(menu)
