export const SHOP_NAME = 'Amir Fast Food';
export const SHOP_ADDRESS = 'Post Office Mansoora, Anwar Market, Peco Road, Kakazai, Lahore, 54000';
export const SHOP_LAT = 31.499767;
export const SHOP_LNG = 74.259939;
export const SHOP_PHONE_DISPLAY = '+92 301 4265785';
export const SHOP_PHONE_LOCAL = '0301 4265785';
export const SHOP_WHATSAPP = '923014265785';
export const SHOP_HOURS_DISPLAY = 'Every day, 6:00 PM – 2:00 AM';
export const SHOP_HOURS_OPEN = '18:00';
export const SHOP_HOURS_CLOSE = '02:00';
export const SHOP_DELIVERY_RADIUS_FREE_KM = 5;
export const SHOP_DELIVERY_FEE_PER_KM = 100;
export const SHOP_DELIVERY_MAX_KM = 15;
export const SHOP_COD_THRESHOLD = 1000;
export const SHOP_COD_FEE = 100;
export const SHOP_ESTIMATED_DELIVERY_TIME = 'Estimated delivery 30–40 minutes, depending on distance and order volume';
export const SHOP_CANCELLATION_POLICY = 'You can cancel an order online on the tracking page only while its status is "Order Received" (before kitchen preparation begins). Once preparation starts, online cancellation closes — please call 0301 4265785 for assistance.';
export const SHOP_PAYMENT_METHODS = 'Cash on Delivery (COD), EasyPaisa, and JazzCash manual transfer';
export const SHOP_PAYMENT_VERIFICATION_NOTE = "Online-transfer orders start preparation after we verify the Transaction ID in our EasyPaisa/JazzCash app.";
export const MAX_ORDERS_PER_DEVICE_PER_DAY = 20;

export interface PktDayWindow {
  dayKey: string;
  secondsUntilMidnight: number;
  resetLabel: string;
}

export function getPktDayWindow(now: Date = new Date()): PktDayWindow {
  // Pakistan Standard Time is fixed UTC+5 (no DST)
  const pktMs = now.getTime() + 5 * 60 * 60 * 1000;
  const pktDate = new Date(pktMs);
  const dayKey = pktDate.toISOString().slice(0, 10);
  const elapsedSeconds =
    pktDate.getUTCHours() * 3600 +
    pktDate.getUTCMinutes() * 60 +
    pktDate.getUTCSeconds();
  const secondsUntilMidnight = Math.max(1, 86400 - elapsedSeconds);
  const hoursLeft = Math.floor(secondsUntilMidnight / 3600);
  const minsLeft = Math.max(1, Math.ceil((secondsUntilMidnight % 3600) / 60));
  const resetLabel = hoursLeft > 0
    ? `${hoursLeft}h ${minsLeft === 60 ? 0 : minsLeft}m (12:00 AM PKT)`
    : `${minsLeft} minute${minsLeft === 1 ? '' : 's'} (12:00 AM PKT)`;
  return { dayKey, secondsUntilMidnight, resetLabel };
}

export interface ShopStatus {
  open: boolean;
  opensAtLabel: string;
  closesAtLabel: string;
}

export function getShopStatus(now: Date = new Date()): ShopStatus {
  // Compute time in Pakistan Time (Asia/Karachi, UTC+5, no DST) using h23 so midnight is 0, never 24
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Karachi',
    hourCycle: 'h23',
    hour: 'numeric',
    minute: 'numeric',
  });
  const parts = formatter.formatToParts(now);
  const hour = Number(parts.find(p => p.type === 'hour')?.value || 0) % 24;
  const minute = Number(parts.find(p => p.type === 'minute')?.value || 0);
  const currentMinutes = hour * 60 + minute;

  const [openH, openM] = SHOP_HOURS_OPEN.split(':').map(Number);    // 18:00 -> 1080
  const [closeH, closeM] = SHOP_HOURS_CLOSE.split(':').map(Number);  // 02:00 -> 120
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  // Overnight wrap: open 18:00 to 02:00 next day (closing time exclusive: at or after 02:00 is closed)
  // Shift is active if currentMinutes >= 18:00 OR currentMinutes < 02:00
  const isOpen = currentMinutes >= openMinutes || currentMinutes < closeMinutes;

  return {
    open: isOpen,
    opensAtLabel: '6:00 PM',
    closesAtLabel: '2:00 AM'
  };
}
