export type ErrorCode =
  | 'auth'
  | 'rate_limited'
  | 'shop_closed'
  | 'tid_duplicate'
  | 'payment_unverified'
  | 'validation'
  | 'db_migration_needed';

export class UserFacingError extends Error {
  public isUserFacing = true;
  public code: ErrorCode;
  constructor(message: string, code: ErrorCode = 'validation') {
    super(message);
    this.name = 'UserFacingError';
    this.code = code;
  }
}

export const GENERIC_ERROR = 'We could not complete that right now. Please try again in a moment, or call us on 0301 4265785.';

export function getErrorCode(err: unknown): ErrorCode {
  if (err instanceof UserFacingError) return err.code;
  if (err && typeof err === 'object' && 'code' in err && typeof (err as any).code === 'string') {
    return (err as any).code as ErrorCode;
  }
  return 'validation';
}

export function friendlyMessage(err: unknown, fallback = GENERIC_ERROR): string {
  if (!err) return fallback;
  if (typeof err === 'string') {
    const trimmed = err.trim();
    if (!trimmed) return fallback;
    if (trimmed.includes('Database') || trimmed.includes('syntax') || trimmed.includes('violates') || trimmed.includes('column') || trimmed.includes('relation') || trimmed.includes('SQL')) {
      return fallback;
    }
    return trimmed;
  }
  if (err instanceof UserFacingError || (err as any)?.isUserFacing) {
    return (err as Error).message;
  }
  if (err instanceof Error) {
    const msg = err.message || '';
    if (msg.includes('fetch') || msg.includes('NetworkError') || msg.includes('Failed to load') || msg.includes('Failed to fetch')) {
      return 'Network connection issue. Please check your internet connection or try again.';
    }
    if (msg.includes('Database') || msg.includes('syntax') || msg.includes('violates') || msg.includes('column') || msg.includes('relation') || msg.includes('SQL')) {
      return fallback;
    }
    return msg || fallback;
  }
  if (typeof err === 'object' && 'message' in (err as any)) {
    const msg = String((err as any).message);
    return friendlyMessage(msg, fallback);
  }
  return fallback;
}
