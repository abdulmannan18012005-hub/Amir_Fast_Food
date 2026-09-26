# Implementation Phases & Development Timeline

## Phase 1: Environment & Database Foundations (Days 1–3)
- Run `schema.sql` on Supabase to initialize profiles, wallets, menu items, orders, and `pgvector`.
- Set up auto-credit trigger provisioning PKR 10,000 on user registration.
- Seed database with full menu taxonomy (Burgers, Broast, Loaded Fries, Drinks in all sizes).

## Phase 2: Frontend Scaffolding, Auth & 3D Storefront (Days 4–6)
- Scaffold React 19 + TanStack Start project with Tailwind CSS.
- Build Auth modal: Email (min 8 chars), Password (min 6 chars), displaying live wallet balance in header.
- Implement 3D hero canvas using Three.js and cursor-tracking 3D parallax menu cards.

## Phase 3: Ordering Engine, Ledger Checkout & Delivery Tracker (Days 7–9)
- Build item customization modal (drink sizes, extra toppings).
- Build atomic checkout RPC function (handling Wallet, COD, and Mobile Transfer).
- Implement delivery fee logic (PKR 100 if < PKR 1,000; Free if >= PKR 1,000).
- Build FoodPanda-style live order tracking simulator with moving bike route canvas.

## Phase 4: Admin KDS, Realtime WebSockets & Automated Notifications (Days 10–12)
- Build `/admin/kitchen` subscribing to Supabase Realtime for instant card updates and audio chime alerts.
- Connect Resend API for HTML order receipts and WhatsApp confirmation webhook.
- Implement AmirBot RAG assistant powered by `pgvector` similarity search.

## Phase 5: Verification, SEO Optimization & Vercel Deployment (Days 13–14)
- Audit WCAG 2.1 accessibility, OpenGraph meta tags, and mobile responsive viewports.
- Connect GitHub repo to Vercel and deploy live with custom domain.