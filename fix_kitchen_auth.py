with open('src/routes/admin/kitchen.tsx', 'r', encoding='utf-8') as f:
    kitchen = f.read()

# Replace hardcoded pass and add generateTOTP
kitchen = kitchen.replace(
    "import { OrderTracker } from '../../components/orders/OrderTracker';",
    "import { OrderTracker } from '../../components/orders/OrderTracker';\nimport { generateTOTP } from '../../lib/totp';"
)
kitchen = kitchen.replace(
    "import { Loader2 } from 'lucide-react';",
    "import { Loader2 } from 'lucide-react';\nimport { generateTOTP } from '../../lib/totp';"
)
kitchen = kitchen.replace(
    "const ADMIN_PASS = '7860';",
    """const getKitchenPass = () => generateTOTP('AMIR_KITCHEN_SECRET');"""
)
kitchen = kitchen.replace(
    "if (pass === ADMIN_PASS) {",
    "if (pass === getKitchenPass()) {"
)

# And add session caching for the pass
kitchen = kitchen.replace(
    "const [isAuthenticated, setIsAuthenticated] = useState(false);",
    """const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('kitchen_auth');
      if (stored && Date.now() - parseInt(stored) < 300000) return true; // valid for 5 min
    }
    return false;
  });"""
)

kitchen = kitchen.replace(
    "setIsAuthenticated(true);",
    "setIsAuthenticated(true);\n      sessionStorage.setItem('kitchen_auth', Date.now().toString());"
)

# Update UI hint for PIN
kitchen = kitchen.replace(
    "Enter PIN to access Kitchen Display System",
    "Enter rolling 5-min PIN to access Kitchen Display System"
)

with open('src/routes/admin/kitchen.tsx', 'w', encoding='utf-8') as f:
    f.write(kitchen)
