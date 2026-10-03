export function calculateDeliveryFee(
  subtotal: number,
  distanceKm: number = 0,
  method: 'cod' | 'online_transfer' = 'cod'
): { baseFee: number; distanceFee: number; codFee: number; totalDeliveryFee: number } {
  // COD fee rule
  const codFee = (method === 'cod' && subtotal < 1000) ? 100 : 0;
  
  // Base delivery fee (free under 5km?) Wait, the prompt says "Distance fee is 0 up to 5km, then +100 PKR per extra km"
  // Let's assume base delivery fee is 0. If there was a base fee, we'd add it.
  const distanceFee = distanceKm > 5 ? Math.ceil(distanceKm - 5) * 100 : 0;
  
  const totalDeliveryFee = codFee + distanceFee;
  
  return {
    baseFee: 0,
    distanceFee,
    codFee,
    totalDeliveryFee
  };
}

// Restaurant Coordinates (Anwar Market, Peco Road, Lahore)
export const RESTAURANT_LAT = 31.4725;
export const RESTAURANT_LNG = 74.3168;

export function calculateDistanceKm(lat: number, lng: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat - RESTAURANT_LAT) * Math.PI / 180;
  const dLng = (lng - RESTAURANT_LNG) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(RESTAURANT_LAT * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const straightLineKm = R * c;
  
  // Road factor to estimate actual driving distance
  return straightLineKm * 1.3;
}
