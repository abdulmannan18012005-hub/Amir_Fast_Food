const fs = require('fs');

function fixMenu() {
  const code = fs.readFileSync('src/server/menu.ts', 'utf8');
  let newCode = code.replace(/createServerFn\("GET", async \(\): Promise<Category\[\]> => \{/g, 'createServerFn({ method: "GET" }).handler(async (): Promise<Category[]> => {');
  
  newCode = newCode.replace(/createServerFn\("GET", async \(categoryId\?: string\): Promise<MenuItem\[\]> => \{/, 'createServerFn({ method: "GET" }).validator((d: string | undefined) => d).handler(async ({ data: categoryId }): Promise<MenuItem[]> => {');
  
  newCode = newCode.replace(/createServerFn\("GET", async \(searchQuery: string\): Promise<MenuItem\[\]> => \{/, 'createServerFn({ method: "GET" }).validator((d: string) => d).handler(async ({ data: searchQuery }): Promise<MenuItem[]> => {');

  fs.writeFileSync('src/server/menu.ts', newCode);
}

function fixOrder() {
  const code = fs.readFileSync('src/server/order.ts', 'utf8');
  let newCode = code.replace(/createServerFn\("POST", async \(payload: CreateOrderPayload\): Promise<\{ success: boolean; orderId\?: string; error\?: string \}> => \{/, 'createServerFn({ method: "POST" }).validator((d: CreateOrderPayload) => d).handler(async ({ data: payload }): Promise<{ success: boolean; orderId?: string; error?: string }> => {');
  
  newCode = newCode.replace(/createServerFn\(\{ method: 'POST' \}\)\.handler\(async \(\{ data \}: \{ data: \{ orderId: string, status: string \} \}\) => \{/, 'createServerFn({ method: "POST" }).validator((d: { orderId: string, status: string }) => d).handler(async ({ data }) => {');
  
  fs.writeFileSync('src/server/order.ts', newCode);
}

function fixChat() {
  const code = fs.readFileSync('src/server/chat.ts', 'utf8');
  let newCode = code.replace(/createServerFn\("POST", async \(message: string\): Promise<\{ reply: string \}> => \{/, 'createServerFn({ method: "POST" }).validator((d: string) => d).handler(async ({ data: message }): Promise<{ reply: string }> => {');
  fs.writeFileSync('src/server/chat.ts', newCode);
}

function fixCheckout() {
  const code = fs.readFileSync('src/routes/checkout.tsx', 'utf8');
  let newCode = code.replace(/await createOrder\(payload\)/g, 'await createOrder({ data: payload })');
  fs.writeFileSync('src/routes/checkout.tsx', newCode);
}

function fixClientAndSSR() {
  // src/client.tsx
  let client = fs.readFileSync('src/client.tsx', 'utf8');
  client = client.replace(/'vinxi\/types\/client'/, "'@tanstack/start/client'");
  fs.writeFileSync('src/client.tsx', client);
  
  let ssr = fs.readFileSync('src/ssr.tsx', 'utf8');
  ssr = ssr.replace(/'vinxi\/types\/server'/, "'@tanstack/start/server'");
  fs.writeFileSync('src/ssr.tsx', ssr);
}

fixMenu();
fixOrder();
fixChat();
fixCheckout();
fixClientAndSSR();
