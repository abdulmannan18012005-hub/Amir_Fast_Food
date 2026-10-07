import fs from 'fs';
import https from 'https';

const urls = [
  '/',
  '/menu',
  '/cart',
  '/checkout',
  '/chat',
  '/locations',
  '/privacy',
  '/terms',
  '/orders/123e4567-e89b-12d3-a456-426614174000', // Fake UUID for test
  '/this-page-does-not-exist'
];

const baseUrl = 'https://amir-fast-food.vercel.app';
const apiBase = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const fetchPsi = (url, strategy) => new Promise((resolve, reject) => {
  const reqUrl = `${apiBase}?url=${encodeURIComponent(url)}&strategy=${strategy}&category=performance&category=accessibility&category=best-practices&category=seo`;
  https.get(reqUrl, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      if (res.statusCode === 200) {
        resolve(JSON.parse(data));
      } else {
        resolve({ error: `HTTP ${res.statusCode}` });
      }
    });
  }).on('error', reject);
});

async function run() {
  console.log("Starting PageSpeed API calls... (This will take a few minutes)");
  const results = [];
  
  for (const path of urls) {
    const fullUrl = `${baseUrl}${path}`;
    for (const strategy of ['mobile', 'desktop']) {
      console.log(`Fetching ${path} [${strategy}]...`);
      let successData = null;
      
      // Retry logic for 429
      for(let i = 0; i < 3; i++) {
        const data = await fetchPsi(fullUrl, strategy);
        if (data.error) {
          console.log(`  Error: ${data.error}. Retrying in 5s...`);
          await delay(5000);
        } else {
          successData = data;
          break;
        }
      }

      if (!successData || successData.error) {
        results.push({
          URL: path, Device: strategy, Perf: 'Fail', A11y: 'Fail', BP: 'Fail', SEO: 'Fail',
          LCP: '-', CLS: '-', TBT: '-', FCP: '-', SI: '-', TTFB: '-'
        });
      } else {
        const lh = successData.lighthouseResult;
        const audits = lh.audits;
        const cats = lh.categories;
        results.push({
          URL: path,
          Device: strategy,
          Perf: Math.round(cats.performance?.score * 100) || 0,
          A11y: Math.round(cats.accessibility?.score * 100) || 0,
          BP: Math.round(cats['best-practices']?.score * 100) || 0,
          SEO: Math.round(cats.seo?.score * 100) || 0,
          LCP: (audits['largest-contentful-paint']?.numericValue / 1000).toFixed(2) + 's',
          CLS: audits['cumulative-layout-shift']?.numericValue?.toFixed(3),
          TBT: Math.round(audits['total-blocking-time']?.numericValue) + 'ms',
          FCP: (audits['first-contentful-paint']?.numericValue / 1000).toFixed(2) + 's',
          SI: (audits['speed-index']?.numericValue / 1000).toFixed(2) + 's',
          TTFB: Math.round(audits['server-response-time']?.numericValue) + 'ms'
        });
      }
      await delay(2000); // polite delay
    }
  }

  let mdTable = "| URL | Device | Perf | A11y | BP | SEO | LCP | CLS | TBT | FCP | SI | TTFB |\n";
  mdTable += "|---|---|---|---|---|---|---|---|---|---|---|---|\n";
  for (const r of results) {
    mdTable += `| ${r.URL} | ${r.Device} | ${r.Perf} | ${r.A11y} | ${r.BP} | ${r.SEO} | ${r.LCP} | ${r.CLS} | ${r.TBT} | ${r.FCP} | ${r.SI} | ${r.TTFB} |\n`;
  }
  fs.writeFileSync('docs/PAGESPEED.md', mdTable);
  console.log("\nDone! Results saved to docs/PAGESPEED.md");
}

run();
