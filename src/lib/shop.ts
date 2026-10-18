export const SHOP_NAME = 'Amir Fast Food';
export const SHOP_ADDRESS = 'Post Office Mansoora, Anwar Market, Peco Road, Kakazai, Lahore, 54000';
export const SHOP_LAT = 31.499767;
export const SHOP_LNG = 74.259939;
export const SHOP_PHONE_DISPLAY = '+92 301 4265785';
export const SHOP_PHONE_LOCAL = '0301 4265785';
export const SHOP_WHATSAPP = '923014265785';
export const SHOP_HOURS_DISPLAY = 'Every day, 4:05 PM – 2:00 AM';
export const SHOP_HOURS_OPEN = '16:05';
export const SHOP_HOURS_CLOSE = '02:00';
export const SHOP_DELIVERY_RADIUS_FREE_KM = 5;
export const SHOP_DELIVERY_FEE_PER_KM = 100;
export const SHOP_DELIVERY_MAX_KM = 15;
export const SHOP_COD_THRESHOLD = 1000;
export const SHOP_COD_FEE = 100;
export const SHOP_ESTIMATED_DELIVERY_TIME = 'Estimated delivery 30–40 minutes, depending on distance and order volume';
export const SHOP_CANCELLATION_POLICY = 'Orders cannot be cancelled on the website once placed as kitchen preparation begins immediately. Please call 0301 4265785 immediately if you need assistance.';
export const SHOP_PAYMENT_METHODS = 'Cash on Delivery (COD), EasyPaisa, and JazzCash manual transfer';
export const SHOP_PAYMENT_VERIFICATION_NOTE = "Online transfer orders are confirmed once we verify the Transaction ID in our EasyPaisa/JazzCash app.";

export interface ShopStatus {
  open: boolean;
  opensAtLabel: string;
  closesAtLabel: string;
}

export function getShopStatus(now: Date = new Date()): ShopStatus {
  // Compute time in Pakistan Time (Asia/Karachi, UTC+5, no DST)
  const pktTime = new Date(now.getTime() + (5 * 60 * 60 * 1000));
  const hours = pktTime.getUTCHours();
  const minutes = pktTime.getUTCMinutes();
  const currentMinutes = hours * 60 + minutes;

  const [openH, openM] = SHOP_HOURS_OPEN.split(':').map(Number);
  const [closeH, closeM] = SHOP_HOURS_CLOSE.split(':').map(Number);
  const openMinutes = openH * 60 + openM;    // 16:05 -> 965
  const closeMinutes = closeH * 60 + closeM;  // 02:00 -> 120

  // Overnight wrap: open 16:05 to 02:00 next day (closing time exclusive)
  // Shift is active if currentMinutes >= 16:05 OR currentMinutes < 02:00
  const isOpen = currentMinutes >= openMinutes || currentMinutes < closeMinutes;

  return {
    open: isOpen,
    opensAtLabel: '4:05 PM',
    closesAtLabel: '2:00 AM'
  };
}
