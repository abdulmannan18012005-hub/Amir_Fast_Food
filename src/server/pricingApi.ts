import { createServerFn } from '@tanstack/react-start';
import { calculateDeliveryFee, calculateDistanceKm } from '../lib/pricing';

export const quoteDeliveryFn = createServerFn({ method: "POST" })
  .validator((d: { lat?: number | null, lng?: number | null, subtotal: number, paymentMethod: 'cod' | 'online_transfer' }) => d)
  .handler(async ({ data }) => {
    let distanceKm = 0;
    if (typeof data.lat === 'number' && Number.isFinite(data.lat) && typeof data.lng === 'number' && Number.isFinite(data.lng)) {
      distanceKm = calculateDistanceKm(data.lat, data.lng);
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
