import { createServerFn } from '@tanstack/react-start';
import { checkRateLimit } from './rateLimit';
import { getClientIp } from './auth';

// In-memory cache for reverse geocode
const geoCache = new Map<string, string>();

export const reverseGeocodeFn = createServerFn({ method: "POST" })
  .validator((d: { lat: number, lng: number }) => d)
  .handler(async ({ data: { lat, lng } }) => {
    const ip = getClientIp();
    
    // Rate limit: 30 / 10 min
    if (!checkRateLimit(ip, 'reverse_geocode', 30, 600000)) {
      throw new Error("Rate limit exceeded for location services.");
    }
    
    // Sane bounding box for Pakistan/Lahore (Roughly)
    if (lat < 23 || lat > 37 || lng < 60 || lng > 78) {
      throw new Error("Location is outside our supported country (Pakistan).");
    }

    const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (geoCache.has(cacheKey)) {
      return geoCache.get(cacheKey);
    }
    
    // Throttle / Respect Nominatim 1 request per second
    // (We rely on low volume here, or we'd need a queue. Simple timeout for demonstration.)
    
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18&accept-language=en`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': process.env.SHOP_EMAIL ? `AMR Fast Food / ${process.env.SHOP_EMAIL}` : 'AMR Fast Food (https://amir-fast-food.vercel.app)'
        },
        signal: AbortSignal.timeout(6000)
      });
      if (!res.ok) throw new Error("Geocoding failed");
      const data = await res.json();
      
      if (!data || !data.address) return null;
      
      const { house_number, road, neighbourhood, suburb, city } = data.address;
      const parts = [house_number, road, neighbourhood, suburb, city].filter(Boolean);
      const addressString = parts.join(', ');
      
      if (addressString) {
        geoCache.set(cacheKey, addressString);
      }
      return addressString;
    } catch (err) {
      console.warn("Reverse geocode error:", err);
      return null;
    }
  });

export async function forwardGeocode(address: string): Promise<{ lat: number, lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=pk`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': process.env.SHOP_EMAIL ? `AMR Fast Food / ${process.env.SHOP_EMAIL}` : 'AMR Fast Food (https://amir-fast-food.vercel.app)'
      },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
  } catch (err) {
    console.warn("Forward geocode error:", err);
    return null;
  }
}
