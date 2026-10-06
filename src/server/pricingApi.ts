import { createServerFn } from '@tanstack/react-start';
import { calculateDeliveryFee, calculateDistanceKm } from '../lib/pricing';

export const quoteDeliveryFn = createServerFn({ method: "POST" })
  .validator((d: { lat?: number | null, lng?: number | null, address?: string, subtotal: number, paymentMethod: 'cod' | 'online_transfer' }) => d)
  .handler(async ({ data }) => {
    let distanceKm = 0;
    
    let lat = data.lat;
    let lng = data.lng;

    if ((lat === undefined || lat === null || !Number.isFinite(lat)) && data.address && data.address.trim().length > 5) {
      const { forwardGeocode } = await import('./location');
      const coords = await forwardGeocode(data.address);
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
      }
    }

    if (typeof lat === 'number' && Number.isFinite(lat) && typeof lng === 'number' && Number.isFinite(lng)) {
      distanceKm = calculateDistanceKm(lat, lng);
    }
    
    if (distanceKm > 15) {
      return { ok: false, error: "Sorry, your address is beyond our 15 KM delivery area." };
    }
    
    const pricing = calculateDeliveryFee(data.subtotal, distanceKm, data.paymentMethod);
    
    return {
      ok: true,
      distanceKm,
      codFee: pricing.codFee,
      distanceFee: pricing.distanceFee,
      totalDeliveryFee: pricing.totalDeliveryFee,
      total: data.subtotal + pricing.totalDeliveryFee
    };
  });
