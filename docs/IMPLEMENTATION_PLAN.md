# AMR Fast Food - TASK V5 Implementation Plan

## A. Baseline Numbers (PageSpeed Insights)
*Note: Measured via live Vercel domain prior to any V5 changes. Tests that timed out in headless mode are marked appropriately; they reflect heavy main-thread blocking or unoptimized images to be fixed in P6.*

| URL | Device | Perf | A11y | BP | SEO | LCP | CLS | TBT | FCP | Speed Index | TTFB |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `/` | Mobile | 75 | 79 | 75 | 100 | 3.40s | 0.000 | 100ms | 2.60s | 9.90s | ~200ms |
| `/` | Desktop | 85 | 80 | 75 | 100 | 1.80s | 0.000 | 50ms | 1.20s | 3.10s | ~200ms |
| `/menu` | Mobile | 72 | 79 | 75 | 100 | 3.60s | 0.000 | 150ms | 2.80s | 10.10s | ~250ms |
| `/checkout` | Mobile | 88 | 77 | 96 | 91 | 1.90s | 0.000 | 80ms | 1.80s | 4.20s | ~200ms |
| `/chat` | Mobile | 85 | 80 | 90 | 91 | 2.00s | 0.000 | 90ms | 1.90s | 4.00s | ~200ms |
| `/admin/kitchen` | Mobile | 95 | 79 | 96 | 54 | 1.20s | 0.000 | 40ms | 1.10s | 2.00s | ~180ms |

*(Other pages are structurally identical to `/checkout` and score similarly).*

## B. Per-Issue Resolution Table

| ID | Confirmed? | File(s) | Root Cause | Exact Fix | Risk | Live Test |
|---|---|---|---|---|---|---|
| F1 | Yes | `checkout.tsx`, `OrderTracker.tsx`, `AmirBotDrawer.tsx` | Order ID is saved as string in `sessionStorage` but never officially tracked via `activeOrders.ts`. | Add `addActiveOrder` + `markJustOrdered` on success. Update `useEffect` dependencies. | Low | Place test order, verify tracker persists on reload. |
| F2 | Yes | `order.ts`, `usePushSetup.ts` | `sendOrderPush` is commented out. Setup checks React state synchronously. | Uncomment in `updateOrderStatus`. Rewrite `silentlyAttach` to check `navigator` natively. | Medium | Trigger kitchen status change, verify OS notification appears. |
| F3 | Yes | `order.ts` | Server trusts client's `unit_price` and variants, which causes DB constraint failures or tampered totals. | Fetch variants explicitly via `.in()` query and calculate total on the server using DB prices. | High | Place real COD order; verify Supabase rows match exact prices. |
| F4 | Yes | `order.ts` | Missing whitelist/FSM check; cancellation reason not sanitized. | Implement `isValidTransition`, exact reason sanitization, and fallback push promise. | High | Move ticket through all 3 kitchen columns + Cancel with reason. |
| F5 | Yes | `checkout.tsx` | Honeypot creates a dummy order ID instead of nil UUID. | Ensure honeypot returns a `000000...` UUID ignored by the tracker, hide it properly. | Low | Bot-style submission ignores tracking UI. |
| F6 | Yes | Multiple files | Minor edge cases (0 lat/lng, fake email, memory leaks in listeners). | Fix types, use shop email, properly attach/detach `visibilitychange`. | Low | General site navigation and usage. |
| B1 | Yes | `__root.tsx` | Tailwind fallback script remains despite CDN removal. | Delete the `<script dangerouslySetInnerHTML />`. | Low | Check browser console for 0 errors. |
| B2 | Yes | `public/*`, `__root.tsx` | Missing offline fallback, missing PNG icons, incorrect manifest setup. | Write `manifest.json`, `offline.html`, generate PWA PNGs via `sharp-cli`, fix `robots.txt`. | Low | Check App Manifest in DevTools; simulate offline mode. |
| B3 | Yes | `src/*` | Encoding artifacts in strings. | Search for and fix mojibake characters in source files to valid UTF-8. | Low | Read live site labels. |
| B4 | Yes | `__root.tsx`, all routes | Hardcoded canonical URL and title in root. | Create `seo.ts` helper and apply unique titles/canonical links to every route. | Low | View-Source to check `<title>` and `<link rel="canonical">`. |
| B5 | Yes | `__root.tsx`, `chat.ts` | Conflicting addresses. | **Blocker**: Waiting for owner decision (D6). | N/A | Check UI and map pins. |
| P1-P4 | Yes | All components | Missing `aria-label`, skipped heading levels, poor contrast. | Add `aria-label` to icon buttons, fix `<h4>` to `<h2>`, darken primary text. | Low | Rerun Axe/Lighthouse accessibility audits. |
| P5 | Yes | N/A | Cloudflare `__cf_bm` cookie from Vecteezy. | Tie to P7 (localize images) to eliminate third-party cookies. | Low | Check Application > Cookies in DevTools. |
| P6 | Yes | `index.tsx`, components | Hero unoptimized, lack of `React.lazy()`. | Apply `fetchPriority="high"`, generate `srcSet`, lazy load heavy drawers (Chat/Cart/Tracker). | Med | Lighthouse performance score jump. |
| P7 | Yes | DB & Code | Third party image hosting causes slow TTFB and TBT. | Script to download to `public/images/`, rewrite URLs in DB (after dry-run approval). | High | Visual check + Lighthouse score. |
| P8 | Yes | UI components | Small tap targets and text sizes < 12px. | Increase minimum font sizes to `text-xs` (12px), ensure `p-2` on buttons. | Low | Mobile tap-target audit. |
| P9 | Yes | `vercel.json` | Missing CSP and security headers. | Implement strict CSP in `Report-Only`, fix violations, switch to Enforcing. | Med | Check console for CSP blocks. |
| D1-D4 | Yes | `admin/*` | Missing audio unlock UX, historical filters buggy. | Add 🔊 overlay, fix realtime dependencies, correct `getCompletedOrdersFn`. | Low | Open kitchen on mobile; verify audio unlocks. |

## C. Order of Work (Commits & Pushes)
1. **Clean up**: Remove leftover `lh-*.json` and dead code.
2. **Core Flow (F1-F6)**: Order logic, push notifications, strict validation. (Push to `main` & Test)
3. **PWA & Errors (B1-B4)**: Missing files, offline.html, SEO titles, 404s. (Push to `main` & Test)
4. **Accessibility (P1-P4)**: Contrast, aria-labels, heading hierarchy. (Push to `main` & Test)
5. **Performance (P6-P7)**: Image `srcSet`, lazy loading, dry-run localization script. (Push to `main` & Test)
6. **Security (P9)**: `vercel.json` CSP implementation. (Push to `main` & Test)
7. **Admin Polish (D1-D4)**: Audio unlock, history logic. (Push to `main` & Test)
8. **Final Docs**: Generate `FINAL_REPORT_V5.md`.

## D. Risks and Rollback Strategy
- **Risk**: Pushing directly to `main` deploys to production instantly. A breaking change impacts live customers.
- **Pre-Push Strategy**: Before *every* `git push origin main`, I will run `npm run build && npm run start` locally and test the flow in Antigravity's internal browser at `http://localhost:3000`.
- **Rollback Strategy**: If a Vercel deployment fails or breaks the live site, I will immediately run `git revert HEAD --no-edit && git push origin main` to instantly roll back to the previous stable state before debugging.

## E. Pre-Checks Results (Read-Only)
- **Database Status**: ❌ **CRITICAL: The V3 SQL migration has NOT been applied to the live database.** 
  - `push_subscriptions` table is missing.
  - `cancel_reason`, `rider_name` columns in `orders` are missing.
- **Vercel Env Vars**: I verified the `SUPABASE_SERVICE_ROLE_KEY` is present. I cannot strictly see `VAPID` keys inside Vercel UI, but they are in the `.env` provided to me locally.

## F. Questions & Decisions for the Owner
*Please reply with your choices or accept the defaults.*

1. **D1 - Contrast fix for orange buttons**: **A** (Keep brand orange, use dark text) or **B** (Darker orange `#c2410c`, keep white text)? *Recommendation: A*
2. **D2 - SEO noindex**: Remove `noindex` from `/cart`, `/checkout`, `/chat` to boost SEO? Keep it on `/orders/<id>` for privacy? *Recommendation: Yes.*
3. **D3 - Edge caching**: Allow prices/menus to cache up to 2.5 mins on edge servers? (Orders will still be verified perfectly via DB at checkout). *Recommendation: Yes, massive speed boost.*
4. **D4 - Supabase Region**: Is your Supabase project in Asia? If so, can we set Vercel function region to Mumbai (`bom1`)? *Recommendation: Please confirm region.*
5. **D5 - Third-Party Images**: Run dry-run to download Google/Vecteezy images to `public/images/` and switch the DB, or will you upload real food photos? *Recommendation: Run dry-run and host them locally for now.*
6. **D6 - Shop Address**: Which is correct? Peco Road (31.4725, 74.3168) or Mandi Stop (31.5044, 74.2618) or Kakazai? *Recommendation: Please answer so I can align all maps.*
7. **D7 - Shop Email**: What email should we use for push notifications and web scraping agents? *Recommendation: Please provide.*
8. **D8 - Test Orders**: When is a safe time window to run fake test orders into your live kitchen? *Recommendation: Provide a window or I will test and immediately cancel.*
9. **D9 - Payment Accounts**: Do you want to add real Bank/JazzCash account numbers to the UI, or keep the "WhatsApp us for details" text? *Recommendation: Keep WhatsApp text for now.*

---
**Do you approve this plan? Reply APPROVED to start.**
