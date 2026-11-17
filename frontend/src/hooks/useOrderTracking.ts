import { useCallback, useEffect, useRef, useState } from 'react';
import type { LatLng, RiderLocation } from '@/types';
import { trackingService } from '@/services/trackingService';
import { isSupabaseConfigured } from '@/services/supabase';
import { useInterval } from './useInterval';
import { pollMs } from '@/utils/env';

const MAX_TRAIL = 200;
const POLL_MS = pollMs(10000, 2000);

export interface OrderTracking {
  riderLocation: RiderLocation | null;
  trail: LatLng[];
  /** true while the realtime channel is subscribed. */
  live: boolean;
  lastUpdate: string | null;
}

/**
 * Live rider position for an order. Loads the last known position via the API,
 * then subscribes to Supabase Realtime. Falls back to polling when realtime
 * isn't available or the channel drops.
 */
export function useOrderTracking(orderId: string | undefined, enabled: boolean): OrderTracking {
  const [riderLocation, setRiderLocation] = useState<RiderLocation | null>(null);
  const [trail, setTrail] = useState<LatLng[]>([]);
  const [live, setLive] = useState(false);
  const lastKey = useRef<string>('');

  const push = useCallback((loc: RiderLocation) => {
    const key = `${loc.latitude.toFixed(6)},${loc.longitude.toFixed(6)}`;
    setRiderLocation(loc);
    if (key === lastKey.current) return;
    lastKey.current = key;
    setTrail((t) => [...t.slice(-(MAX_TRAIL - 1)), { latitude: loc.latitude, longitude: loc.longitude }]);
  }, []);

  const fetchLatest = useCallback(async () => {
    if (!orderId) return;
    try {
      const loc = await trackingService.orderLocation(orderId);
      if (loc) push(loc);
    } catch {
      /* keep last known */
    }
  }, [orderId, push]);

  useEffect(() => {
    if (!orderId || !enabled) return;
    void fetchLatest();
    const unsubscribe = trackingService.subscribeToLocations(push, `order_id=eq.${orderId}`, setLive);
    return () => {
      unsubscribe?.();
      setLive(false);
    };
  }, [orderId, enabled, fetchLatest, push]);

  useInterval(() => void fetchLatest(), enabled && (!isSupabaseConfigured || !live) ? POLL_MS : null);

  return { riderLocation, trail, live, lastUpdate: riderLocation?.updated_at ?? null };
}
