export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PHONE_RE = /^\+?[0-9\s-]{7,15}$/;

export function validateEmail(v: string): string | null {
  if (!v.trim()) return 'Email is required.';
  return EMAIL_RE.test(v.trim()) ? null : 'Enter a valid email address.';
}

export function validatePassword(v: string): string | null {
  if (!v) return 'Password is required.';
  if (v.length < 8) return 'Use at least 8 characters.';
  if (!/[A-Za-z]/.test(v) || !/[0-9]/.test(v)) return 'Include at least one letter and one number.';
  return null;
}

export function validatePhone(v: string, required = false): string | null {
  if (!v.trim()) return required ? 'Phone number is required.' : null;
  return PHONE_RE.test(v.trim()) ? null : 'Enter a valid phone number.';
}

export function required(v: string | null | undefined, label: string): string | null {
  return v && String(v).trim() ? null : `${label} is required.`;
}

export function validatePrice(v: string): string | null {
  if (!v.trim()) return 'Price is required.';
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 'Enter a price greater than 0.';
  if (n > 1_000_000) return 'Price looks too high.';
  return null;
}

/** Returns true when every value in the map is null (no errors). */
export function isValid(errors: Record<string, string | null | undefined>): boolean {
  return Object.values(errors).every((e) => !e);
}
