const fs = require('fs');
let c = fs.readFileSync('src/server/auth.ts', 'utf8');

c = c.replace(/export function getClientIp\(\): string \{[\s\S]*?return 'global_ip_fallback';\n\}/, `export function getClientIp(): string {
  try {
    const headers = getRequestHeaders() as any;
    const xForwarded = headers['x-forwarded-for'];
    if (xForwarded) {
      const parts = String(xForwarded).split(',');
      if (parts[0]) return parts[0].trim();
    }
    const xReal = headers['x-real-ip'];
    if (xReal) return String(xReal).trim();
    const ip = getRequestIP();
    if (ip) return ip;
    const ua = headers['user-agent'];
    if (ua) {
      return require('crypto').createHash('sha256').update(String(ua)).digest('hex').substring(0, 16);
    }
  } catch (e) {}
  return 'global_ip_fallback';
}`);

fs.writeFileSync('src/server/auth.ts', c);
console.log('Fixed auth.ts');
