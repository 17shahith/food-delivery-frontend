import type { RealtimeChannel } from '@supabase/supabase-js';
import { api, unwrapList } from './api';
import { supabase } from './supabase';
import type { LocationUpdate, RiderLocation } from '@/types';

export const RIDER_LOCATIONS_TABLE = 'rider_locations';

export const trackingService = {
  /** Rider pushes their current GPS position. */
  async sendLocation(payload: LocationUpdate): Promise<void> {
    await api.post('/tracking/location', payload);
  },
  /** Latest known rider position for an order (initial load / polling fallback). */
  async orderLocation(orderId: string): Promise<RiderLocation | null> {
    const { data } = await api.get<RiderLocation | null>(`/tracking/orders/${orderId}`);
    return data ?? null;
  },
  /** Admin: latest positions of all riders currently on a delivery or online. */
  async activeLocations(): Promise<RiderLocation[]> {
    const { data } = await api.get('/tracking/active');
    return unwrapList<RiderLocation>(data);
  },

  /**
   * Subscribes to rider location changes via Supabase Realtime (postgres_changes on
   * the `rider_locations` table). Pass a filter such as `order_id=eq.<id>` or
   * `rider_id=eq.<id>`; omit it (admin) to receive all rows allowed by RLS.
   * Returns an unsubscribe function. Returns null if Supabase isn't configured.
   */
  subscribeToLocations(
    onChange: (loc: RiderLocation) => void,
    filter?: string,
    onStatus?: (connected: boolean) => void,
  ): (() => void) | null {
    if (!supabase) return null;
    const client = supabase;
    const channel: RealtimeChannel = client
      .channel(`rider-locations:${filter ?? 'all'}:${Math.random().toString(36).slice(2, 8)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: RIDER_LOCATIONS_TABLE, ...(filter ? { filter } : {}) },
        (payload) => {
          const row = payload.new as RiderLocation | undefined;
          if (row && typeof row.latitude === 'number') onChange(row);
        },
      )
      .subscribe((status) => onStatus?.(status === 'SUBSCRIBED'));
    return () => {
      void client.removeChannel(channel);
    };
  },
};
