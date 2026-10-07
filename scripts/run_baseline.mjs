import { execSync } from 'child_process';
import fs from 'fs';

const urls = [
  '/',
  '/menu',
  '/checkout',
  '/cart',
  '/chat',
  '/locations',
  '/privacy',
  '/terms',
  '/orders/test-id-not-found',
  '/404-not-found'
];

const baseUrl = 'https://amir-fast-food.vercel.app';

console.log("Starting Baseline PageSpeed testing (Mobile & Desktop). This will take ~5-10 minutes...");

const results = [];

for (const path of urls) {
  const url = `${baseUrl}${path}`;
  for (const device of ['mobile', 'desktop']) {
    console.log(`\nTesting ${path} on ${device}...`);
    try {
      const formFactor = device === 'mobile' ? 'mobile' : 'desktop';
      const screenEmulation = device === 'mobile' ? '' : '--screenEmulation.disabled';
      
      const cmd = `npx -y lighthouse ${url} --output json --output-path ./temp-lh.json --chrome-flags="--headless" --form-factor=${formFactor} ${screenEmulation}`;
      execSync(cmd, { stdio: 'ignore' });
      
      const lh = JSON.parse(fs.readFileSync('./temp-lh.json', 'utf-8'));
      
      const audits = lh.audits;
      
      results.push({
        URL: path,
        Device: device,
        Perf: Math.round(lh.categories.performance?.score * 100) || 0,
        A11y: Math.round(lh.categories.accessibility?.score * 100) || 0,
        BP: Math.round(lh.categories['best-practices']?.score * 100) || 0,
        SEO: Math.round(lh.categories.seo?.score * 100) || 0,
        LCP: (audits['largest-contentful-paint']?.numericValue / 1000).toFixed(2) + 's',
        CLS: audits['cumulative-layout-shift']?.numericValue?.toFixed(3),
        TBT: Math.round(audits['total-blocking-time']?.numericValue) + 'ms',
        FCP: (audits['first-contentful-paint']?.numericValue / 1000).toFixed(2) + 's',
        SI: (audits['speed-index']?.numericValue / 1000).toFixed(2) + 's',
        TTFB: Math.round(audits['server-response-time']?.numericValue) + 'ms'
      });
    } catch (err) {
      console.error(`Failed to test ${path} on ${device}:`, err.message);
    }
  }
}

console.log("\n================ BASELINE PAGESPEED INSIGHTS ================\n");
let mdTable = "| URL | Device | Perf | A11y | BP | SEO | LCP | CLS | TBT | FCP | SI | TTFB |\n";
mdTable += "|---|---|---|---|---|---|---|---|---|---|---|---|\n";
for (const r of results) {
  mdTable += `| ${r.URL} | ${r.Device} | ${r.Perf} | ${r.A11y} | ${r.BP} | ${r.SEO} | ${r.LCP} | ${r.CLS} | ${r.TBT} | ${r.FCP} | ${r.SI} | ${r.TTFB} |\n`;
}
console.log(mdTable);
fs.writeFileSync('docs/BASELINE_V5.md', mdTable);
