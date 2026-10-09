export class UserFacingError extends Error {
  public isUserFacing = true;
  constructor(message: string) {
    super(message);
    this.name = 'UserFacingError';
  }
}

export const GENERIC_ERROR = 'Something went wrong on our end. Please try again or call 0301-4265785.';

export function toSafeError(err: unknown, fallback = GENERIC_ERROR): string {
  if (err instanceof UserFacingError) {
    return err.message;
  }
  if (err instanceof Error) {
    if ((err as any).isUserFacing) return err.message;

    // Sane user-friendly validation phrases allowed through
    const safePhrases = [
      'PIN is required',
      'Incorrect PIN',
      'Too many failed attempts',
      'Too many attempts',
      'Unauthorized',
      'Cart is empty',
      'Too many items',
      'Invalid name',
      'Invalid phone',
      'Delivery address must be',
      'Invalid payment method',
      'Transaction ID is required',
      'One or more items are unavailable',
      'no longer available',
      'beyond our 15 KM delivery area',
      'locate your address',
      'Cancellation reason must be',
      'Invalid rider phone number',
      'already updated',
      'Order is not active',
      'Max subscriptions reached',
      'Invalid quantity',
      'Failed to verify menu items',
      'Rate limit exceeded'
    ];

    for (const phrase of safePhrases) {
      if (err.message.includes(phrase)) return err.message;
    }

    console.error('[Server Error Hidden]:', err.message, err.stack);
    return fallback;
  }
  console.error('[Server Non-Error Hidden]:', err);
  return fallback;
}
