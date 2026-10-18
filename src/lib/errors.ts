export class UserFacingError extends Error {
  public isUserFacing = true;
  constructor(message: string) {
    super(message);
    this.name = 'UserFacingError';
  }
}

export const GENERIC_ERROR = 'We could not complete that right now. Please try again in a moment, or call us on 0301 4265785.';

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
