# System Architecture & Directory Structure — Amir Fast Food AI

## 1. App Flow
Client Interaction (3D Menu) -> Cart Configuration -> Atomic Server Function (`createServerFn`) -> PostgreSQL Transaction (Wallet Debit / Order Row Created) -> Supabase Realtime (CDC WebSocket) -> Admin KDS Screen Chimes -> Async Background Webhook (Email Receipt + WhatsApp Dispatch) -> Client Delivery Simulator.

## 2. Directory Structure
amir-fast-food/
├── app/
│   ├── components/
│   │   ├── 3d/               # Three.js Canvas & Burger Model Components
│   │   ├── cart/             # Slide-Out Drawer & Modifier Selectors
│   │   ├── common/           # Header, Footer, Modals, Buttons
│   │   ├── kds/              # Kitchen Display Kanban Tickets
│   │   ├── menu/             # 3D Tilt Cards & Filter Bars
│   │   └── tracking/         # Delivery Road Map & Progress Steppers
│   ├── routes/
│   │   ├── index.tsx         # Landing Page with 3D Hero
│   │   ├── menu.tsx          # Catalog & Filtering
│   │   ├── checkout.tsx      # Multi-Step Checkout Form
│   │   ├── profile.tsx       # Wallet Ledger & Past Orders
│   │   ├── orders/
│   │   │   └── $orderId.tsx  # FoodPanda Delivery Tracker
│   │   └── admin/
│   │       ├── kitchen.tsx   # Real-Time KDS Screen
│   │       └── menu.tsx      # Menu & Inventory Admin Panel
│   ├── server/               # Server-side Functions (`createServerFn`)
│   │   ├── auth.ts           # Login/Signup Handlers
│   │   ├── order.ts          # Atomic Checkout Logic
│   │   ├── notify.ts         # WhatsApp & Email Senders
│   │   └── chat.ts           # AmirBot pgvector Semantic Search
│   └── styles/
│       └── globals.css       # Tailwind Directives & 3D CSS Perspectives
├── public/                   # 3D GLTF Assets, Audio Chimes, Icons
├── schema.sql                # Complete Supabase PostgreSQL DDL
└── package.json