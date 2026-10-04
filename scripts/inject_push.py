import os

order_path = "src/server/order.ts"
with open(order_path, "r", encoding="utf8") as f:
    code = f.read()

code = code.replace("// trigger push here\\n    // Promise.allSettled([ sendOrderPush(data.orderId, data.status) ])", "import { sendOrderPush } from './push';\\n    sendOrderPush(data.orderId, data.status).catch(e => console.error(e));")

code = code.replace("// Trigger push via dynamic import / internal API call (will implement next)\\n    // sendOrderPush(orderId, 'received');", "import { sendOrderPush } from './push';\\n    sendOrderPush(orderId, 'received').catch(e => console.error(e));")


with open(order_path, "w", encoding="utf8") as f:
    f.write(code)
