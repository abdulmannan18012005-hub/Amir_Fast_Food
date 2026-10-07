import { execSync } from 'child_process';
import fs from 'fs';

const urls = [
  { name: 'Home', url: 'https://amir-fast-food.vercel.app/' },
  { name: 'Menu', url: 'https://amir-fast-food.vercel.app/menu' },
  { name: 'Checkout', url: 'https://amir-fast-food.vercel.app/checkout' },
  { name: 'Kitchen (Admin)', url: 'https://amir-fast-food.vercel.app/admin/kitchen' }
];

console.log("Starting full PageSpeed testing across all routes. This may take 2-3 minutes...");

const results = [];

for (const { name, url } of urls) {
  console.log(`\nTesting ${name} (${url})...`);
  try {
    execSync(`npx -y lighthouse ${url} --output json --output-path ./temp-lh.json --chrome-flags="--headless"`, { stdio: 'ignore' });
    const lh = JSON.parse(fs.readFileSync('./temp-lh.json', 'utf-8'));
    
    results.push({
      Page: name,
      Performance: Math.round(lh.categories.performance.score * 100),
      Accessibility: Math.round(lh.categories.accessibility.score * 100),
      BestPractices: Math.round(lh.categories['best-practices'].score * 100),
      SEO: Math.round(lh.categories.seo.score * 100)
    });
  } catch (err) {
    console.error(`Failed to test ${name}`);
  }
}

console.log("\n================ PAGE SPEED INSIGHTS RESULTS ================\n");
console.table(results);
