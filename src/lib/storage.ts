export function getLocal<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const item = localStorage.getItem(key);
  if (!item) return fallback;
  try { return JSON.parse(item) as T; } catch { return fallback; }
}

export function setLocal<T>(key: string, value: T): void {
  if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(value));
}

export function getSession<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const item = sessionStorage.getItem(key);
  if (!item) return fallback;
  try { return JSON.parse(item) as T; } catch { return fallback; }
}

export function setSession<T>(key: string, value: T): void {
  if (typeof window !== 'undefined') sessionStorage.setItem(key, JSON.stringify(value));
}

export function getRawLocal(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(key);
}

export function setRawLocal(key: string, value: string): void {
  if (typeof window !== 'undefined') localStorage.setItem(key, value);
}

export function getRawSession(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(key);
}

export function setRawSession(key: string, value: string): void {
  if (typeof window !== 'undefined') sessionStorage.setItem(key, value);
}

export function removeLocal(key: string): void {
  if (typeof window !== 'undefined') localStorage.removeItem(key);
}

export function removeSession(key: string): void {
  if (typeof window !== 'undefined') sessionStorage.removeItem(key);
}
export function safeJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const item = localStorage.getItem(key) || sessionStorage.getItem(key);
  if (!item) return fallback;
  try { return JSON.parse(item) as T; } catch { return fallback; }
}
