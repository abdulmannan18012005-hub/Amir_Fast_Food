const fs = require('fs');
let code = fs.readFileSync('src/server/auth.ts', 'utf8');

code = code.replace(/export function getClientIp\(\): string \{[\s\S]*?return 'global_ip_fallback';\n\}/, `export function getClientIp(): string {
  try {
    const h = getRequestHeaders() as Record<string, string | undefined>;
    const xff = h['x-vercel-forwarded-for'] || h['x-forwarded-for'] || h['x-real-ip'];
    if (xff) { const first = String(xff).split(',')[0].trim(); if (first) return first; }
    const ip = getRequestIP(); if (ip) return ip;
    const fp = \`\${h['user-agent'] || ''}|\${h['accept-language'] || ''}\`;
    return 'fp_' + require('crypto').createHash('sha256').update(fp).digest('hex').slice(0, 16);
  } catch { return 'fp_unknown'; }
}`);

fs.writeFileSync('src/server/auth.ts', code);
