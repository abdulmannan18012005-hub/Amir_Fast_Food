import { getErrorCode } from './errors';

export function getAdminToken(): string {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem('admin_session') || '';
}

export function setAdminToken(token: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('admin_session', token);
}

export function clearAdminSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('admin_session');
  window.dispatchEvent(new CustomEvent('adminSessionExpired', {
    detail: { message: 'Your session has expired. Please enter the PIN again.' }
  }));
}

export async function adminCall<TInput, TOutput>(
  fn: (opts: { data: any }) => Promise<TOutput>,
  data: TInput = {} as TInput
): Promise<TOutput> {
  const token = getAdminToken();
  try {
    const payload = {
      ...(data as any),
      token,
      pin: token, // backward compatibility
    };
    return await fn({ data: payload });
  } catch (err: any) {
    const code = getErrorCode(err);
    if (code === 'auth') {
      clearAdminSession();
    }
    throw err;
  }
}
