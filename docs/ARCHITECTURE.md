# Architecture

## Overview
Amir Fast Food uses a strictly serverless architecture built on TanStack Start and Supabase.

1. **Frontend**: React 19 components hydrated on the client.
2. **Server Functions**: TanStack Start `createServerFn` handles all secure backend operations (pricing, Supabase mutation, email dispatch).
3. **Database**: Supabase PostgreSQL with strict Row Level Security (RLS). Order data is strictly read via authenticated Service Role on the server; public tables (menu) are read directly.

## Subsystems
- **Push Notifications**: Handled natively using Web Push API. Server stores VAPID keys securely. Subscriptions stored in `push_subscriptions`.
- **Pricing & Delivery**: Distance calculated via Haversine formula against shop coordinates. Coordinates fetched from OSM Nominatim API on the server to prevent client spoofing.
- **Realtime**: Kitchen relies on 5-second polling (fallback on visibility) rather than Postgres Changes to protect PII.
