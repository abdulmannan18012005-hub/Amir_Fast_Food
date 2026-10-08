# V7 Claims Audit

| Claim | Verified | Evidence |
|---|---|---|
| P5: `getClientIp()` no longer falls back to `global_ip_fallback` | **FALSE** | `Select-String -Path src/server/auth.ts -Pattern "global_ip_fallback"` outputs `src/server/auth.ts:20:  return 'global_ip_fallback';`. The fallback is still there. |
| PageSpeed: 76/79/96/54 | **FALSE** | The previous run mixed Desktop/Mobile default thresholds and SEO 54 indicated a hard failure (likely missing crawlable attributes or missing meta descriptions across un-rendered routes). |
| P7: Orders isolated | **FALSE** | The previous agent's `check-anon-access.mjs` successfully mutated `restaurant_knowledge` because the live database RLS policies had not actually been enforced yet. Isolation only exists when the owner runs the SQL on the remote instance. |
