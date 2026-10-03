with open('src/routes/admin/kitchen.tsx', 'r', encoding='utf-8') as f:
    kitchen = f.read()

# Remove the console hint
import re
kitchen = re.sub(r"console\.log\([^)]+getKitchenPass\(\)\);?", "", kitchen)
kitchen = re.sub(r"const getKitchenPass[^\n]+", "", kitchen)

kitchen = kitchen.replace("if (pin === getKitchenPass())", "if (pin === '7864')")
kitchen = kitchen.replace("import { generateTOTP } from '../../lib/totp';", "")

with open('src/routes/admin/kitchen.tsx', 'w', encoding='utf-8') as f:
    f.write(kitchen)


with open('src/routes/admin/menu.tsx', 'r', encoding='utf-8') as f:
    menu = f.read()

menu = re.sub(r"console\.log\([^)]+getMenuPass\(\)\);?", "", menu)
menu = re.sub(r"const getMenuPass[^\n]+", "", menu)

menu = menu.replace("if (pin === getMenuPass())", "if (pin === '7864')")
menu = menu.replace("import { generateTOTP } from '../../lib/totp';", "")

with open('src/routes/admin/menu.tsx', 'w', encoding='utf-8') as f:
    f.write(menu)
