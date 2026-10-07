import fs from 'fs';

try {
  const lh = JSON.parse(fs.readFileSync('./lh-live-new.json', 'utf-8'));
  const scores = {
    Performance: Math.round(lh.categories.performance.score * 100),
    Accessibility: Math.round(lh.categories.accessibility.score * 100),
    BestPractices: Math.round(lh.categories['best-practices'].score * 100),
    SEO: Math.round(lh.categories.seo.score * 100)
  };
  console.log("--- LIVE VERCEL LIGHTHOUSE SCORES ---");
  console.log(`Performance: ${scores.Performance}`);
  console.log(`Accessibility: ${scores.Accessibility}`);
  console.log(`Best Practices: ${scores.BestPractices}`);
  console.log(`SEO: ${scores.SEO}`);
} catch (e) {
  console.error("Not ready or failed", e.message);
}
