import { logoutAdminFn } from '../server/adminAuthApi';

export function getAdminToken(): string | null {
  // Admin sessions now live exclusively in HttpOnly server cookies; never expose tokens in JS storage.
  return null;
}

export function setAdminToken(_token: string): void {
  // Intentionally a no-op: HttpOnly cookie is set directly by loginAdminFn.
}

export async function clearAdminSession(): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem('admin_session');
    } catch {}
  }
  try {
    await logoutAdminFn({ data: {} });
  } catch {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('adminSessionExpired'));
  }
}

export async function adminCall<TInput extends Record<string, any>, TOutput>(
  serverFn: (opts: { data: TInput }) => Promise<TOutput>,
  payload?: Omit<TInput, 'token' | 'pin'>
): Promise<TOutput> {
  try {
    return await serverFn({
      data: { ...(payload || {}) } as TInput,
    });
  } catch (err: any) {
    const msg = String(err?.message || '').toLowerCase();
    if (msg.includes('unauthorized') || msg.includes('admin session') || msg.includes('expired')) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('adminSessionExpired'));
      }
    }
    throw err;
  }
}
