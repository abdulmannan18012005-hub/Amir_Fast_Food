import os

push_path = "src/server/push.ts"
if os.path.exists(push_path):
    with open(push_path, "r", encoding="utf8") as f:
        code = f.read()

    new_fn = """
export const getVapidPublicKeyFn = createServerFn({ method: "POST" })
  .handler(async () => {
    return { publicKey: process.env.VAPID_PUBLIC_KEY || '' };
  });
"""
    code += new_fn
    
    with open(push_path, "w", encoding="utf8") as f:
        f.write(code)

hook_path = "src/hooks/usePushSetup.ts"
if os.path.exists(hook_path):
    with open(hook_path, "r", encoding="utf8") as f:
        code = f.read()

    code = code.replace("const res = await fetch('/api/vapidPublicKey'); // We need to expose this, or hardcode the key for client\\n      if (!res.ok) return false;\\n      const { publicKey } = await res.json();", "const { publicKey } = await getVapidPublicKeyFn();")
    code = code.replace("import { subscribeToPushFn } from '../server/push';", "import { subscribeToPushFn, getVapidPublicKeyFn } from '../server/push';")
    
    with open(hook_path, "w", encoding="utf8") as f:
        f.write(code)
