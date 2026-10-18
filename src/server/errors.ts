export { UserFacingError, GENERIC_ERROR, friendlyMessage, getErrorCode, type ErrorCode } from '../lib/errors';
import { UserFacingError, GENERIC_ERROR } from '../lib/errors';

export function toSafeError(err: unknown, fallback = GENERIC_ERROR): string {
  if (err instanceof UserFacingError || (err as any)?.isUserFacing) {
    return (err as Error).message;
  }
  console.error('[Server Error Hidden]:', err instanceof Error ? err.stack : err);
  return fallback;
}

export function safeHandler<TArgs, TResult>(
  handler: (args: TArgs) => Promise<TResult>
): (args: TArgs) => Promise<TResult> {
  return async (args: TArgs): Promise<TResult> => {
    try {
      return await handler(args);
    } catch (err: unknown) {
      if (err instanceof UserFacingError || (err as any)?.isUserFacing) {
        throw err;
      }
      console.error('[Server Error Hidden in safeHandler]:', err instanceof Error ? err.stack : err);
      throw new UserFacingError(GENERIC_ERROR);
    }
  };
}
