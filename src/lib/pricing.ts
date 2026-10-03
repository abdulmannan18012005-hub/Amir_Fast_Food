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
