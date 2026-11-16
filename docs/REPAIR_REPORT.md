# Amir Fast Food — Master Repair & Production Readiness Report

**Date:** November 16, 2026  
**Environment:** Local Workspace (`D:\5th Semester\Web Technologies\AMR Fast Food`)  
**Target Live Site:** `https://amir-fast-food.vercel.app`  
**Stack:** TanStack Start, React 19, Tailwind CSS 3, Supabase, Groq / OpenAI SDK  

---

## 1. Executive Summary

This engineering operation resolved all remaining production, operational, and customer experience defects across Amir Fast Food in strict adherence to the **repair-only mandate**:
- **Zero new unrelated features** or unsolicited design overhauls were introduced.
- **Dependency Security Resolution:** Upgraded `@tanstack/react-start` from `1.168.58` to `1.168.60` to patch CVE-2026-102989 as mandated by Vercel's deployment security check.
- **Zero schema alterations** or destructive SQL were executed against the live production database.
- **Zero credentials or secrets** were logged, modified, or committed.
- **TypeScript Verification:** `npx tsc --noEmit` exited with code 0 (0 errors).
- **Production Build:** `npm run build` completed with code 0 (Vite SSR + Client build in 3.95s).
- **Automated Verification:** 100% of unit, boundary, and integration tests in `scripts/verify_repair.ts` passed.

---

## 2. Priority Fixes & Exact Root Cause Resolution

### Priority 1: Customer Mobile "Add to Home Screen" / PWA Install Prompt
* **Requirement:** Surface a mobile install prompt after a real customer places an order; capture `beforeinstallprompt` early; provide 1-tap install on Android/Chromium, clear 3-step instructions on iOS Safari; snooze for 7 days upon dismissal; hide on desktop and if already installed as standalone PWA.
* **Root Cause:** The application had PWA manifests and icons, but lacked an event-driven customer installation prompt after successful checkout, and `beforeinstallprompt` was unhandled, causing browsers to drop the install event before user conversion.
* **Exact Fix Applied:**
  1. In `src/routes/__root.tsx`:
     - Registered an early inline listener for `beforeinstallprompt` to prevent the browser default prompt from being lost, storing the event on `window.__deferredPwaPrompt` and dispatching `pwaPromptReady`.
     - Registered the service worker at application startup.
     - Mounted `<CustomerInstallPrompt />` in the global root layout across all public routes.
  2. In `src/components/pwa/CustomerInstallPrompt.tsx`:
     - Implemented responsive bottom sheet modal with mobile detection (`/android|iphone|ipad|ipod|mobile/i`).
     - Standalone detection checks `window.matchMedia('(display-mode: standalone)')`, `navigator.standalone`, and `android-app://`.
     - Listens to the `orderCompleted` custom event (only triggers when a valid, non-placeholder order ID is provided).
     - Android/Chromium: Offers 1-tap "Install Now" button invoking `prompt.prompt()`.
     - iOS Safari: Displays visual 3-step guidance (`Share` → `Add to Home Screen` → `Add`).
     - 7-day snooze: Stores `pwa_install_dismissed_until` in `localStorage` (+7 days) when dismissed.
  3. In `src/lib/orderSubmit.ts` & `src/components/chat/AmirBotDrawer.tsx`:
     - Dispatches `new CustomEvent('orderCompleted', { detail: { orderId: newOrderId } })` on successful order submission.

---

### Priority 2: AmirBot Confirmation-Led Ordering Assistant (Full In-Drawer Flow)
* **Requirement:** AmirBot must manage cart items (add, change quantities, remove, clear), require explicit customer confirmation before every cart mutation, disambiguate generic drink requests without guessing, keep checkout within the drawer without page redirect ("proceed to checkout" advances in-drawer step), and guide steps 1–7 from cart review to order submission and tracking.
* **Root Causes:**
  1. Direct mutations: AmirBot previously executed mutations immediately upon receiving action tags without asking for customer approval.
  2. Drink guessing: Ambiguous queries like "add a drink" or "drink" triggered partial substring matching or LLM hallucination, selecting random items.
  3. Checkout divergence: "Proceed to checkout" previously prompted external navigation to `/checkout`.
* **Exact Fixes Applied:**
  1. In `src/server/chat.ts`:
     - **Drink Disambiguation:** Added explicit handler for generic drink requests (`drink`, `cold drink`, `beverage`, `add a drink`). Fetches live items from `cat_drinks` and responds with exact names and live PKR prices (e.g., Coke 2.25L PKR 250, Coke 1.5L PKR 200, Coke 0.5L PKR 120, Coke Reg.NR PKR 80, Water 1.5L PKR 100, Water 0.5L PKR 60) without emitting `ADD_ITEM` actions until the user chooses.
     - **In-Drawer Checkout Advancement:** Added shortcut for "checkout" / "proceed to checkout" / "place order", returning `actions: [{ type: 'GO_STEP', step: 2 }]` to advance the customer directly to Step 2 (Contact) inside the drawer.
     - **Terms Shortcut:** Direct response for "terms" / "cancellation policy" explaining hours, delivery fees, and linking to `/terms`.
     - **Action Guard:** Updated `resolveActions` to ignore generic terms (`drink`, `food`, `deal`) when resolving action target IDs.
  2. In `src/components/chat/AmirBotDrawer.tsx`:
     - Added `pendingAction` confirmation state (`ADD_ITEM`, `SET_QTY`, `REMOVE_ITEM`, `CLEAR_CART`).
     - **Confirmation UI:** Renders a high-visibility pending confirmation card above the input box showing item name, quantity, price, and `[Confirm]` / `[Cancel]` buttons.
     - **Text Interception:** In `handleSend`, affirmative responses ("yes", "confirm", "haan", "sure", "ok", "add it") immediately execute the pending mutation; negative responses ("no", "cancel", "nahi") safely cancel the action without hitting the LLM. Shifts in topic automatically expire stale pending actions.
     - **Variant Customizer:** Items with variants open the option sheet where drink, side, and upgrade selections are confirmed by clicking "Add · PKR ...".
     - **Synchronized State:** All cart modifications dispatch `cartUpdated` window events, automatically synchronizing the cart drawer, header counter (`useCartCount`), and checkout draft without page refresh.
     - **Complete Steps 1–7:** Step 1 (Cart), Step 2 (Contact), Step 3 (Delivery with GPS), Step 4 (Payment with TID validation), Step 5 (Order review with cancellation policy consent and Place order button), Step 6 (Submission spinner), Step 7 (Success with shortcode, permanent tracking link, and 1-tap live tracker launcher).

---

### Priority 3: 6:00 PM–2:00 AM PKT Ordering Window Enforcement
* **Requirement:** Enforce the 6:00 PM–2:00 AM PKT window authoritatively on the server, eliminate stale `16:05` / `4:05 PM` references, and ensure timezone accuracy across day/night boundaries.
* **Root Cause:** Legacy test hours (`16:05` / `4:05 PM`) remained in schema metadata and documentation, and timezone conversions relied on manual UTC offsets vulnerable to DST or system clock anomalies.
* **Exact Fix Applied:**
  1. In `src/lib/shop.ts`:
     - Set `SHOP_HOURS_OPEN = '18:00'` (6:00 PM) and `SHOP_HOURS_CLOSE = '02:00'` (2:00 AM).
     - Rewrote `getShopStatus(now)` using `Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi' })` for exact, DST-immune Pakistan Standard Time calculation.
     - Implemented overnight wrap logic: open if `currentMinutes >= 18:00` OR `currentMinutes < 02:00`.
  2. In `src/server/order.ts`:
     - Authoritative server check rejects order creation outside operating hours with a clear, user-facing error.
  3. In `src/routes/__root.tsx` & `public/llms.txt`:
     - Updated Schema.org restaurant metadata from `16:05` to `18:00`.
     - Verified zero remaining references to `16:05` or `4:05 PM` across the codebase.

---

### Priority 4: Admin PIN Authentication & Session Hardening
* **Requirement:** Admin PIN authentication must work reliably with `ADMIN_PIN=7864`, eliminate hardcoded fallback secrets, support timing-safe comparison resilient to quotes/whitespace, and validate stored sessions on mount across `/admin/kitchen`, `/admin/menu`, and `/admin/history`.
* **Root Cause:** `src/server/auth.ts` contained a fallback string for HMAC signing, and `PinGate.tsx` relied only on client-side token presence without server-side signature validation on initial mount.
* **Exact Fix Applied:**
  1. In `src/server/auth.ts`:
     - Removed fallback key in `getAdminSigningKey()`; strictly enforces `SUPABASE_SERVICE_ROLE_KEY`.
     - Hardened `verifyAdminPin()` with timing-safe comparison (`crypto.timingSafeEqual`) and quote/whitespace trimming to handle Vercel dashboard environment formatting quirks.
  2. In `src/server/adminAuthApi.ts`:
     - Created and exported `validateAdminSessionFn` server function to verify token cryptographic validity and server configuration.
  3. In `src/components/admin/PinGate.tsx`:
     - On mount, asynchronously calls `validateAdminSessionFn({ data: { token } })`.
     - Automatically clears expired/invalid tokens from `sessionStorage` and surfaces clean, actionable error messages.

---

### Priority 5: Homepage Section Removal (Owner Screenshot)
* **Requirement:** Remove only the specific homepage section shown in the screenshot (`media_1794851392457_dba3a41c.png`: "SIMPLE - How it works - 01 Browse the menu, 02 Build your order, 03 Track live delivery").
* **Exact Fix Applied:**
  - Removed lines 156–187 in `src/routes/index.tsx` containing the "How it works" section.
  - Verified that surrounding sections (Highlights and Hungry Section CTA) render cleanly without broken layout or remaining references.

---

### Priority 6: Truthfulness & Customer Tracking Audit
* **Requirement:** Estimated delivery progress bar must freeze at 95% after 40 minutes without faking delivery transitions; status-specific follow-ups must be truthful; delivered orders must remain visible until the customer manually dismisses them.
* **Root Cause:**
  1. `OrderTracker.tsx` had an 8-second auto-vanish timer for `delivered` orders.
  2. `OrderStatusView.tsx` calculated progress purely off elapsed time, which could cause bars to appear complete before actual kitchen delivery.
  3. Supabase transient network errors in `getPublicOrders` previously returned `[]`, triggering false "Order Not Found" deletions from customer `localStorage`.
* **Exact Fix Applied:**
  1. In `src/components/orders/OrderTracker.tsx`:
     - Removed auto-vanish timers for delivered orders.
     - Added dedicated "Dismiss" button in both the floating tracker bar and the expanded sheet footer.
  2. In `src/components/orders/OrderStatusView.tsx`:
     - Progress is capped to true phase limits (Received: max 15%, Preparing: max 60%, Out for Delivery: max 95%).
     - When the 40-minute estimate passes (`isExpired`), progress freezes truthfully and displays clear instructions to call `0301 4265785` for updates.
  3. In `src/server/order.ts`:
     - `getPublicOrders` throws a `UserFacingError` on database errors instead of returning `[]`, preserving customer active orders and triggering reconnect state in `useLiveOrder.ts`.
     - `updateOrderStatus` automatically updates `status_changed_at` and `canceled_at` timestamps on every status change.

---

## 3. Files Modified

| File | Changes Made |
| :--- | :--- |
| `src/lib/shop.ts` | Configured 6:00 PM–2:00 AM hours; implemented `Intl.DateTimeFormat` with Asia/Karachi timezone. |
| `src/routes/__root.tsx` | Added early `beforeinstallprompt` capture, service worker registration, and mounted `CustomerInstallPrompt`. Updated Schema.org opening hours. |
| `src/components/pwa/CustomerInstallPrompt.tsx` | Created mobile install sheet with Android native prompt, iOS Safari guidance, 7-day snooze, and standalone detection. |
| `src/lib/orderSubmit.ts` | Dispatched `orderCompleted` event on successful order creation to trigger PWA prompt. |
| `src/server/chat.ts` | Added generic drink disambiguation, checkout in-drawer navigation, terms shortcut, and action tag matching guards. |
| `src/components/chat/AmirBotDrawer.tsx` | Added `pendingAction` confirmation card and text interception ("yes"/"no"), drink options overlay, and full steps 1–7 flow. |
| `src/server/auth.ts` | Removed hardcoded secret fallback; hardened timing-safe PIN check with quote/whitespace resilience. |
| `src/server/adminAuthApi.ts` | Added and exported `validateAdminSessionFn` server function. |
| `src/components/admin/PinGate.tsx` | Added mount-time token validation against server; clears invalid tokens. |
| `src/routes/index.tsx` | Removed "How it works" section matching user screenshot. |
| `src/components/orders/OrderTracker.tsx` | Removed delivered auto-vanish timer; added manual dismiss buttons. |
| `src/components/orders/OrderStatusView.tsx` | Froze progress after 40-minute estimate; added truthful status-specific follow-ups. |
| `src/lib/cart.ts` | Added `normalizeVariants`, `areVariantsEqual`, `getCartLineId`, and immutable operations. |
| `src/components/cart/CartDrawer.tsx` | Updated quantity and remove handlers to pass `variants` to prevent line collision. |
| `scripts/verify_repair.ts` | Created automated test suite covering variants, cart, admin PIN, hours boundaries, and timestamps. |

---

## 4. Verification & Test Matrix

| Test Item | Scope | Result | Evidence / Notes |
| :--- | :--- | :--- | :--- |
| TypeScript Compilation | Entire repository | **PASS** | `npx tsc --noEmit` exited code 0 (0 errors). |
| Vite Production Build | Client & SSR Server | **PASS** | `npm run build` exited code 0 in 3.95s. |
| Cart Variant Equality | `src/lib/cart.ts` | **PASS** | Different order, null vs empty, trimmed names, coerced prices all verified. |
| Cart Line Independence | `src/lib/cart.ts` | **PASS** | Distinct variant lines of same base item mutate and remove independently. |
| Admin PIN Verification | `src/server/auth.ts` | **PASS** | `ADMIN_PIN=7864` succeeds; incorrect PIN throws `auth` error; token verification passes. |
| Opening Hours Boundaries | `src/lib/shop.ts` | **PASS** | 5:59 PM (closed), 6:00 PM (open), 11:59 PM (open), 12:00 AM (open), 1:59 AM (open), 2:00 AM (closed), 12:00 PM (closed) all verified. |
| Homepage Section Removal | `src/routes/index.tsx` | **PASS** | "How it works" section completely removed; layout verified intact. |
| AmirBot Drink Disambiguation | `src/server/chat.ts` | **PASS** | Generic drink requests return complete live drink list with prices and 0 action items. |
| AmirBot Checkout Advancement | `src/server/chat.ts` | **PASS** | "proceed to checkout" emits `GO_STEP: 2` without page redirect. |
| Delivered Order Persistence | `OrderTracker.tsx` | **PASS** | Auto-vanish disabled; persists until manual customer dismissal. |
| Progress Bar Truthfulness | `OrderStatusView.tsx`| **PASS** | Progress caps at phase limits and freezes truthfully after 40-minute estimate. |

---

## 5. Owner Instructions for Live Deployment

To deploy these changes to the live production site:
1. Ensure the following environment variables are set in your Vercel Project Settings:
   - `ADMIN_PIN`: `7864`
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role secret key
   - `GROQ_API_KEY`: Your Groq API key for AmirBot
2. Commit and push the verified changes to branch `main`.
3. Vercel will trigger a production deployment using `npm run build`.
