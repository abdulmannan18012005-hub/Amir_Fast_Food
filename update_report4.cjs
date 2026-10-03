const fs = require('fs');

let code = fs.readFileSync('docs/FOLLOW_UP_REPORT.md', 'utf8');

code = code.replace(
  '4. Order tracking page — NOT DONE — file(s) changed — how I tested it — result (NOT TESTED)',
  '4. Order tracking page — DONE — `src/routes/orders/$orderId.tsx` — Fixed server-side crash by guarding Notification API with window checks. Removed fake time-based status logic (now relies strictly on DB status). Replaced placeholder canvas with a pure CSS animated bike progress bar. Added opt-in button for notifications. Verified build — PASS'
);

fs.writeFileSync('docs/FOLLOW_UP_REPORT.md', code);
