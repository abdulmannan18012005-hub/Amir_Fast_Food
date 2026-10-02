with open('src/routes/admin/menu.tsx', 'r', encoding='utf-8') as f:
    menu = f.read()

# Replace hardcoded pass and add generateTOTP
menu = menu.replace(
    "import { Plus, Edit2, Trash2, X, PlusCircle, LayoutDashboard, UtensilsCrossed, Package, Info, UploadCloud } from 'lucide-react';",
    "import { Plus, Edit2, Trash2, X, PlusCircle, LayoutDashboard, UtensilsCrossed, Package, Info, UploadCloud } from 'lucide-react';\nimport { generateTOTP } from '../../lib/totp';"
)
menu = menu.replace(
    "const ADMIN_PASS = '7860';",
    """const getMenuPass = () => generateTOTP('AMIR_MENU_SECRET');"""
)
menu = menu.replace(
    "if (pass === ADMIN_PASS) {",
    "if (pass === getMenuPass()) {"
)

# And add session caching for the pass
menu = menu.replace(
    "const [isAuthenticated, setIsAuthenticated] = useState(false);",
    """const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('menu_auth');
      if (stored && Date.now() - parseInt(stored) < 300000) return true; // valid for 5 min
    }
    return false;
  });"""
)

menu = menu.replace(
    "setIsAuthenticated(true);",
    "setIsAuthenticated(true);\n      sessionStorage.setItem('menu_auth', Date.now().toString());"
)

# Update UI hint for PIN
menu = menu.replace(
    "Enter PIN to access Menu Management",
    "Enter rolling 5-min PIN to access Menu Management"
)

with open('src/routes/admin/menu.tsx', 'w', encoding='utf-8') as f:
    f.write(menu)
