import re

with open('src/routes/__root.tsx', 'r', encoding='utf-8') as f:
    root = f.read()

# Add import
root = root.replace(
    "import { AmirBotDrawer } from '../components/chat/AmirBotDrawer';",
    "import { AmirBotDrawer } from '../components/chat/AmirBotDrawer';\nimport { OrderTracker } from '../components/orders/OrderTracker';"
)

# Add component to body
root = root.replace(
    "<AmirBotDrawer />",
    "<AmirBotDrawer />\n        <OrderTracker />"
)

with open('src/routes/__root.tsx', 'w', encoding='utf-8') as f:
    f.write(root)
