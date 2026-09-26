# Product Requirements Document (PRD) — Amir Fast Food AI

## 1. What to Build
A production-grade, autonomous web application for Amir Fast Food that replaces static menus with an interactive 3D digital ordering experience, a live Kitchen Display System (KDS), an in-app virtual wallet with a PKR 10,000 sign-up grant, and an automated FoodPanda-style delivery tracking pipeline.

## 2. Targeted Users
- **End Customers:** Fast food lovers seeking rapid ordering, menu customization, and real-time delivery tracking without phone call delays.
- **Kitchen & Admin Staff:** Short-order cooks and restaurant managers needing an automated, paperless ticket display screen to manage preparation times and track delivery volume.

## 3. Core Features
- Interactive 3D storefront with cursor-tracking cards and Three.js hero elements.
- In-app virtual wallet initialized with PKR 10,000 credit for frictionless checkout.
- Automated delivery fee calculation: PKR 100 for orders under PKR 1,000; Free (PKR 0) above.
- Support for Fast Food items, drink size variations (250ml, 500ml, 1.5L), and add-on modifiers.
- Dual payment support: In-App Wallet, Cash on Delivery (COD), and Mobile Transfer (Easypaisa/JazzCash).
- Real-time Kitchen Display System (KDS) powered by Supabase Realtime WebSockets.
- 4-stage FoodPanda-style pseudo-live delivery simulator with interactive visual route map.
- Dual-channel order notifications dispatched to customer Email and WhatsApp.
- RAG conversational assistant ("AmirBot") powered by Supabase pgvector.