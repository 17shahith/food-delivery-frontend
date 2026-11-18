import type { Role } from '@/types';

const raw = import.meta.env;
const DEFAULT_PASSWORD = 'demo1234';

/**
 * Account each module signs in with automatically (there is no login page).
 * Override per role with VITE_<ROLE>_EMAIL / VITE_<ROLE>_PASSWORD; defaults are the demo accounts.
 */
export function autoLoginCredentials(role: Role): { email: string; password: string } {
  const key = role.toUpperCase();
  return {
    email: (raw[`VITE_${key}_EMAIL`] as string | undefined) || `${role}@demo.com`,
    password: (raw[`VITE_${key}_PASSWORD`] as string | undefined) || DEFAULT_PASSWORD,
  };
}
