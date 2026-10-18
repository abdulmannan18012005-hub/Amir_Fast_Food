/**
 * Single source of truth for order field validation and normalization.
 * Used by createOrder (server), checkout page (client), and AmirBot (client/assistant).
 */

export function normalizeName(name: string): string {
  return (name || '').replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, 60);
}

export function validateName(name: string): { valid: boolean; normalized: string; error?: string } {
  const normalized = normalizeName(name);
  if (normalized.length >= 2) {
    return { valid: true, normalized };
  }
  return {
    valid: false,
    normalized,
    error: 'Please enter a valid name (at least 2 characters).'
  };
}

export function normalizePhone(raw: string): string {
  if (!raw) return '';
  // Remove spaces, hyphens, and non-digit characters except leading plus
  let cleaned = raw.trim().replace(/[\s-]/g, '');
  if (cleaned.startsWith('+92')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('92') && cleaned.length === 12) {
    cleaned = '0' + cleaned.slice(2);
  } else if (cleaned.startsWith('3') && cleaned.length === 10) {
    cleaned = '0' + cleaned;
  }
  return cleaned.replace(/\D/g, '');
}

export function validatePhone(phone: string): { valid: boolean; normalized: string; error?: string } {
  const normalized = normalizePhone(phone);
  // Must be Pakistani mobile: 03 followed by 9 digits (total 11 digits)
  if (/^03\d{9}$/.test(normalized)) {
    return { valid: true, normalized };
  }
  return {
    valid: false,
    normalized,
    error: 'Please enter a valid Pakistani phone number (e.g. 03001234567).'
  };
}

export function normalizeAddress(address: string): string {
  return (address || '').replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, 300);
}

export function validateAddress(address: string): { valid: boolean; normalized: string; error?: string } {
  const normalized = normalizeAddress(address);
  if (normalized.length >= 10 && normalized.length <= 300) {
    return { valid: true, normalized };
  }
  return {
    valid: false,
    normalized,
    error: 'Delivery address must be between 10 and 300 characters.'
  };
}

export function normalizeTid(raw: string): string {
  return (raw || '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/\s+/g, '')
    .toUpperCase();
}

export function validateTid(raw: string): { valid: boolean; normalized: string; error?: string } {
  const normalized = normalizeTid(raw);
  // letters, digits, hyphen, underscore, 6 to 40 characters
  if (/^[A-Z0-9_-]{6,40}$/.test(normalized)) {
    return { valid: true, normalized };
  }
  return {
    valid: false,
    normalized,
    error: 'Please enter the Transaction ID exactly as shown in your EasyPaisa/JazzCash payment confirmation.'
  };
}
