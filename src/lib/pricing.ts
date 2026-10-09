import { SHOP_LAT, SHOP_LNG } from './shop';

export function calculateDeliveryFee(
  subtotal: number,
  distanceKm: number = 0,
  method: 'cod' | 'online_transfer' = 'cod'
): { baseFee: number; distanceFee: number; codFee: number; totalDeliveryFee: number } {
  // COD fee rule: PKR 100 only if COD and subtotal < 1000
  const codFee = (method === 'cod' && subtotal < 1000) ? 100 : 0;
  
  // 5 km free radius, then +100 PKR per extra km
  const distanceFee = distanceKm > 5 ? Math.ceil(distanceKm - 5) * 100 : 0;
  const totalDeliveryFee = codFee + distanceFee;
  
  return {
    baseFee: 0,
    distanceFee,
    codFee,
    totalDeliveryFee
  };
}

export function calculateDistanceKm(lat: number, lng: number): number {
  if (typeof lat !== 'number' || typeof lng !== 'number' || !isFinite(lat) || !isFinite(lng)) {
    return 0;
  }
  const R = 6371; // Earth's radius in km
  const dLat = (lat - SHOP_LAT) * Math.PI / 180;
  const dLng = (lng - SHOP_LNG) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(SHOP_LAT * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const straightLineKm = R * c;
  
  // Road factor to estimate actual driving distance
  return straightLineKm * 1.3;
}
