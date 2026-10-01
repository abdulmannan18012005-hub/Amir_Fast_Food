import re

with open('src/routes/orders/$orderId.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "if (Notification.permission === 'default') {",
    "if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js').catch(console.error); }\n    if (Notification.permission === 'default') {"
)

with open('src/routes/orders/$orderId.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
