# Development Rules & Coding Boundaries

## 1. What We Use
- Framework: React 19 + TanStack Start (TypeScript, Vite, Nitro server engine).
- UI & Styling: Tailwind CSS, Lucide Icons, Vanilla CSS 3D Transforms (`perspective`, `translateZ`).
- 3D Graphics: Three.js (@react-three/fiber or pure WebGL canvas).
- Backend & Database: Supabase PostgreSQL (`pgvector`, Realtime CDC, Auth).
- Server Functions: Strictly use `createServerFn` for mutations, auth, and database operations.

## 2. What to Avoid
- DO NOT use Next.js or pages router.
- DO NOT write "div-soup". Always use semantic HTML5 elements (`<main>`, `<article>`, `<header>`).
- DO NOT execute non-atomic financial writes. All wallet balance debits MUST run inside PostgreSQL RPC transactions.
- DO NOT commit secrets, service role keys, or API tokens to the client bundle.

## 3. Boundaries of AI Agent (Antigravity Pro)
- Strictly follow types defined in `types.ts`.
- Never invent imaginary database columns. Reference `schema.sql` exclusively.
- Implement comprehensive try/catch blocks with user-friendly toast alerts on failure.