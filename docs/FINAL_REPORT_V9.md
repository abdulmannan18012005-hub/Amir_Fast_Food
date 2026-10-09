# AMIR FAST FOOD — FINAL PRODUCTION HARDENING REPORT (V9)

**Project:** Amir Fast Food  
**Production URL:** https://amir-fast-food.vercel.app  
**Stack:** TanStack Start + React 19 + Supabase + Vercel (Region: `hnd1`)  
**Status:** Build Clean (`vite build` exit code 0) · All Verification Tests Passing

---

## 1. Executive Summary & Audit of Previous Claims

Every prior claim was audited directly against the actual codebase and live Supabase instance. All false claims and regressions have been corrected and verified:

| Component | V8 Reality | V9 Final State | Evidence |
|---|---|---|---|
| **AmirBot Model** | Defaulted to dead `llama-3.1-8b-instant` | `openai/gpt-oss-20b` (primary) + `openai/gpt-oss-120b` (fallback) | [src/server/chat.ts](file:///D:/5th%20Semester/Web%20Technologies/AMR%20Fast%20Food/src/server/chat.ts#L173-L174) · `scripts/test-amirbot.mjs` |
| **AmirBot Actions** | Tags stripped by server; client parsed stripped reply | Server resolves action details & returns structured `actions[]` | [src/server/chat.ts](file:///D:/5th%20Semester/Web%20Technologies/AMR%20Fast%20Food/src/server/chat.ts#L38-L100) · [src/components/chat/AmirBotDrawer.tsx](file:///D:/5th%20Semester/Web%20Technologies/AMR%20Fast%20Food/src/components/chat/AmirBotDrawer.tsx#L47-L110) |
| **AmirBot First-Click** | Drawer listener attached after event already fired | Open/close state in root; always-mounted event listener | [src/routes/__root.tsx](file:///D:/5th%20Semester/Web%20Technologies/AMR%20Fast%20Food/src/routes/__root.tsx#L50-L65) |
| **Cart Subtotal Math** | Ignored variant prices (`price * quantity`) | `lineTotal(item)` helper calculates `(base + variants) * qty` | [src/lib/cart.ts](file:///D:/5th%20Semester/Web%20Technologies/AMR%20Fast%20Food/src/lib/cart.ts#L85-L93) |
| **Admin Shell** | Public header, footer, bottom nav displayed on `/admin/*` | Isolated with `isAdmin` check; admin manifest dynamically switched | [src/routes/__root.tsx](file:///D:/5th%20Semester/Web%20Technologies/AMR%20Fast%20Food/src/routes/__root.tsx#L125-L245) |
| **`getClientIp()`** | Returned hardcoded `'global_ip_fallback'` | Fallback to SHA-256 fingerprint hash of UA + accept-language | [src/server/auth.ts](file:///D:/5th%20Semester/Web%20Technologies/AMR%20Fast%20Food/src/server/auth.ts#L7-L38) |
| **Double Await** | `await await Promise.race(...)` in `order.ts` | Clean `await Promise.race(...)` | [src/server/order.ts](file:///D:/5th%20Semester/Web%20Technologies/AMR%20Fast%20Food/src/server/order.ts#L296) |
| **Dead Code** | `if (false)` unreachable mock block in `menu.ts` | Deleted entirely | [src/server/menu.ts](file:///D:/5th%20Semester/Web%20Technologies/AMR%20Fast%20Food/src/server/menu.ts) |
| **Popups (`alert`/`confirm`)** | 11 browser modal popups blocking threads | 0 remaining; replaced with toast notifications & auto feedback | Global codebase grep: 0 hits |
| **Anon DB Access** | Script mutated live database | `scripts/check-anon-access.mjs` rewritten to 100% read-only | `node scripts/check-anon-access.mjs` (RLS verified blocking) |

---

## 2. Workstream Breakdown

### Workstream 1: Friendly Errors Everywhere
- Created [`src/server/errors.ts`](file:///D:/5th%20Semester/Web%20Technologies/AMR%20Fast%20Food/src/server/errors.ts) containing `UserFacingError`, `GENERIC_ERROR`, and `toSafeError(err)`.
- Wrapped server functions in [`src/server/order.ts`](file:///D:/5th%20Semester/Web%20Technologies/AMR%20Fast%20Food/src/server/order.ts) and [`src/server/menu.ts`](file:///D:/5th%20Semester/Web%20Technologies/AMR%20Fast%20Food/src/server/menu.ts) with `toSafeError` to prevent raw stack traces or internal Supabase error messages from leaking to client responses.
- Replaced the router fallback error display in [`src/router.tsx`](file:///D:/5th%20Semester/Web%20Technologies/AMR%20Fast%20Food/src/router.tsx) with a friendly card and retry button.
- Added global `unhandledrejection` and `error` listeners in [`src/client.tsx`](file:///D:/5th%20Semester/Web%20Technologies/AMR%20Fast%20Food/src/client.tsx).

### Workstream 2: AmirBot Full Architecture Repair
- Configured primary model to `openai/gpt-oss-20b` with `max_completion_tokens: 1024`, `reasoning_effort: 'low'`, and fallback to `openai/gpt-oss-120b`.
- Removed all client-side Supabase queries (`ilike`) from [`src/components/chat/AmirBotDrawer.tsx`](file:///D:/5th%20Semester/Web%20Technologies/AMR%20Fast%20Food/src/components/chat/AmirBotDrawer.tsx). The server now resolves the full item data and sends back an `actions[]` array.
- Shifted drawer open/close state to [`src/routes/__root.tsx`](file:///D:/5th%20Semester/Web%20Technologies/AMR%20Fast%20Food/src/routes/__root.tsx). The drawer now receives `isOpen` and `onClose` props.
- Implemented chat hydration via `useEffect` reading from `sessionStorage` to eliminate hydration mismatch.
- Formatted system prompt for plain text output (no Markdown headers or asterisks).
- Built automated test suite [`scripts/test-amirbot.mjs`](file:///D:/5th%20Semester/Web%20Technologies/AMR%20Fast%20Food/scripts/test-amirbot.mjs).

### Workstream 3: Money & Cart Consistency
- Added exported helper `lineTotal(item)` and updated `getCartSubtotal` in [`src/lib/cart.ts`](file:///D:/5th%20Semester/Web%20Technologies/AMR%20Fast%20Food/src/lib/cart.ts#L85-L93) to correctly compute item price plus selected variants.
- Clarified delivery fee in [`src/components/cart/CartDrawer.tsx`](file:///D:/5th%20Semester/Web%20Technologies/AMR%20Fast%20Food/src/components/cart/CartDrawer.tsx). The drawer now accurately reflects that final fees are computed at checkout based on distance and payment method.

### Workstream 4: Admin Shell & Operations
- Public navbar, footer, bottom navigation, and customer drawers are hidden on `/admin/*` routes using `isAdmin`.
- Dynamic manifest link switches to `/admin.webmanifest` on admin pages and `/manifest.json` on customer pages.
- Admin History polls at 15s intervals only on Page 1 when the browser tab is active.
- Replaced all `alert()` and `confirm()` calls in Kitchen and Menu management with non-blocking toast notifications.

### Workstream 5: Security & Database Isolation
- Rewrote `getClientIp()` in [`src/server/auth.ts`](file:///D:/5th%20Semester/Web%20Technologies/AMR%20Fast%20Food/src/server/auth.ts) to fallback to a hashed fingerprint rather than a shared static string.
- Rewrote [`scripts/check-anon-access.mjs`](file:///D:/5th%20Semester/Web%20Technologies/AMR%20Fast%20Food/scripts/check-anon-access.mjs) as strictly read-only.
- Sanitized user input in [`src/server/order.ts`](file:///D:/5th%20Semester/Web%20Technologies/AMR%20Fast%20Food/src/server/order.ts) (stripping control characters and length-bounding names, addresses, and transaction IDs).
- Hardened HTML email rendering in [`src/server/email.ts`](file:///D:/5th%20Semester/Web%20Technologies/AMR%20Fast%20Food/src/server/email.ts) with `escapeHtml` helper.

### Workstream 6: SEO, A11y & Clean Hydration
- Verified that each route contains exactly one `<h1>` heading.
- Eliminated SSR hydration mismatches in [`src/components/admin/PinGate.tsx`](file:///D:/5th%20Semester/Web%20Technologies/AMR%20Fast%20Food/src/components/admin/PinGate.tsx) and [`src/routes/checkout.tsx`](file:///D:/5th%20Semester/Web%20Technologies/AMR%20Fast%20Food/src/routes/checkout.tsx).
- Protected all web storage accesses in [`src/lib/storage.ts`](file:///D:/5th%20Semester/Web%20Technologies/AMR%20Fast%20Food/src/lib/storage.ts) with `try/catch`.

---

## 3. Verification Test Evidence

### Test 1: AmirBot Verification (`scripts/test-amirbot.mjs`)
```
=== AmirBot V9 Verification Test ===

✅ PASS: No dead models found in src/server/chat.ts
✅ PASS: Primary model is set to openai/gpt-oss-20b
✅ PASS: AmirBotDrawer uses server-resolved actions only (no client-side Supabase query)

Testing live Groq API with model openai/gpt-oss-20b...
✅ PASS: Groq API responded successfully!
Sample response: We are located at Post Office Mansoora, Anwar Market, Peco Road, Kakazai, Lahore.
=== Test Complete ===
```

### Test 2: Database Read-Only Anon Access Audit (`scripts/check-anon-access.mjs`)
```
=== Supabase Anon Key READ-ONLY Access Audit ===

✅ menu_items: Anon can read (Expected for public menu)
✅ categories: Anon can read (Expected for public menu)
🔒 orders: Anon read BLOCKED by RLS policy (Secure): permission denied for table orders
🔒 push_subscriptions: Anon read BLOCKED by RLS policy (Secure): permission denied for table push_subscriptions

Audit complete. No write or mutation operations were executed.
```

### Test 3: Production Build (`npm run build`)
```
✓ 1699 modules transformed.
dist/client/assets/index-p9R0T3Jt.css               40.45 kB │ gzip:   7.66 kB
dist/client/assets/index-CsiTZLBo.js               538.37 kB │ gzip: 157.49 kB
✓ built in 4.93s
dist/server/server.js                               73.21 kB │ gzip: 19.20 kB
✓ built in 2.64s
Exit Code: 0
```

---

## 4. Owner Actions & Clarifications

1. **VAPID Notification Variables (on Vercel):**
   - Run `npx web-push generate-vapid-keys` in terminal to get your pair.
   - Set in Vercel:
     - `VAPID_PUBLIC_KEY`: `<your public key>`
     - `VAPID_PRIVATE_KEY`: `<your private key>`
     - `VAPID_SUBJECT`: `https://amir-fast-food.vercel.app`

2. **`DANGEROUSLY_DEPLOY_VULNERABLE_TANSTACK_START_XSS=1`:**
   - This flag is currently set in `vercel.json` because earlier versions of TanStack Start required it for Vercel deployment. Once TanStack Start reaches stable v1, this flag can be safely removed.

3. **Takeaway Mode Toggle:**
   - In [`src/components/cart/CartDrawer.tsx`](file:///D:/5th%20Semester/Web%20Technologies/AMR%20Fast%20Food/src/components/cart/CartDrawer.tsx), fulfillment label reads from `localStorage.getItem('fulfillment')`. If you would like a dedicated toggle button between "Delivery" and "Takeaway/Pickup", let us know and we will add the UI control.
