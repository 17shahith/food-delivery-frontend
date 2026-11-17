const raw = import.meta.env;

export const env = {
  apiBaseUrl: (raw.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, ''),
  supabaseUrl: raw.VITE_SUPABASE_URL || '',
  supabaseAnonKey: raw.VITE_SUPABASE_ANON_KEY || '',
  defaultLat: Number(raw.VITE_DEFAULT_LAT) || 12.9716,
  defaultLng: Number(raw.VITE_DEFAULT_LNG) || 77.5946,
  currency: raw.VITE_CURRENCY || 'INR',
  /** Run against the in-browser demo backend instead of FastAPI. */
  demoMode: raw.VITE_DEMO_MODE === 'true',
};

/** Polling intervals are shortened in demo mode so simulated changes show quickly. */
export function pollMs(ms: number, demoMs = 3000): number {
  return env.demoMode ? Math.min(ms, demoMs) : ms;
}
