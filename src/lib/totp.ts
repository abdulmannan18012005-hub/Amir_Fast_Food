export function generateTOTP(secret: string, period = 300): string {
  // Simple deterministic 4-digit PIN based on UTC epoch 5-minute windows
  const timeWindow = Math.floor(Date.now() / 1000 / period);
  const data = secret + timeWindow;
  
  // Simple string hash
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Return positive 4-digit string
  const positive = Math.abs(hash);
  const str = positive.toString();
  return str.substring(str.length - 4).padStart(4, '0');
}
