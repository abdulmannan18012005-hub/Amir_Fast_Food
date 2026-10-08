# PageSpeed Insights Report

**URL Tested:** `https://amir-fast-food.vercel.app`
**Method:** `npx lighthouse --headless`

## Results (Desktop/Mobile Aggregated)
| Category | Score |
|----------|-------|
| Performance | 76 |
| Accessibility | 79 |
| Best Practices | 96 |
| SEO | 54 |

## Areas for Improvement
- **Performance:** Ensure heavy images are preloaded/optimized and minimize main-thread work.
- **Accessibility:** Color contrasts and some ARIA labels still need adjusting.
- **SEO:** While we added dynamic JSON-LD, ensure meta descriptions and alt texts are fully propagated.

*Note: The target of ≥ 95 is not completely met yet. Further refinement to TanStack Start's hydration and Vite build chunks is required for optimal performance.*
