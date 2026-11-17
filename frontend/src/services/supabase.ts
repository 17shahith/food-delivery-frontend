import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/utils/env';

/**
 * Supabase is used ONLY for:
 *  - authorised Realtime subscriptions (rider locations, order updates, notifications)
 *  - supported auth operations that must happen in the browser (password recovery session)
 *
 * Only the public anon key is used. The service-role key must never be shipped to the client.
 */
export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: true,
      },
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : null;

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.warn(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set. Realtime updates fall back to polling.',
  );
}

/** Authorises the realtime socket with the user's JWT so Row Level Security applies. */
export async function authorizeRealtime(accessToken: string | null, refreshToken?: string | null): Promise<void> {
  if (!supabase) return;
  try {
    if (accessToken && refreshToken) {
      await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    }
    supabase.realtime.setAuth(accessToken ?? env.supabaseAnonKey);
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[supabase] could not authorise realtime', err);
  }
}

export async function clearRealtimeAuth(): Promise<void> {
  if (!supabase) return;
  try {
    supabase.removeAllChannels();
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    /* ignore */
  }
}
