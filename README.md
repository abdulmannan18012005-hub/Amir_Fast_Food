# Amir Fast Food
A real-time, serverless food ordering application for Amir Fast Food in Lahore, Pakistan.

## Tech Stack
- **Framework**: React 19 + TanStack Start (SSR + Server Functions)
- **Styling**: Tailwind CSS v3
- **Database**: Supabase (PostgreSQL) + Realtime
- **Hosting**: Vercel (Edge/Node Serverless)
- **Maps**: Nominatim OpenStreetMap (Reverse & Forward Geocoding)
- **Push**: Web Push API with VAPID
- **AI**: OpenAI / Groq (AmirBot)

## Features
- **Client App**: PWA, Offline support, Geofenced delivery calculation, Push notifications for order status, Real-time tracking polling.
- **Admin App**: PIN-gated (`/admin/*`), Live kitchen board (auto-refreshes every 5s), Menu editor with availability toggles, Order history with PKT day bounds.

## Limitations
- No true virtual wallet (payment is COD or generic Online Transfer via TID).
- No CSV export or multi-branch features.
- No image upload (images are linked via URL in the menu editor).

## Development
```bash
npm install
npm run dev
```