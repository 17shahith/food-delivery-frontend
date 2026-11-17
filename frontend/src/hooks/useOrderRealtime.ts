import { useEffect, useRef } from 'react';
import { subscribeToOrders } from '@/services/realtimeService';
import { isSupabaseConfigured } from '@/services/supabase';
import type { Order } from '@/types';
import { useInterval } from './useInterval';
import { pollMs } from '@/utils/env';

/**
 * Calls `onChange` whenever an order matching `filter` changes in realtime.
 * `filter` is a postgres_changes filter (e.g. `vendor_id=eq.<id>`), `'*'` for every
 * row RLS allows (admin), or undefined to disable.
 * Without Supabase it polls `onChange` every `fallbackMs` instead.
 */
export function useOrderRealtime(
  filter: string | undefined,
  onChange: (row: Partial<Order>, event: 'INSERT' | 'UPDATE' | 'DELETE' | 'POLL') => void,
  fallbackMs = 15000,
): void {
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    if (!filter) return;
    const unsubscribe = subscribeToOrders(filter === '*' ? undefined : filter, (row, ev) => cb.current(row, ev));
    return () => unsubscribe?.();
  }, [filter]);

  useInterval(() => cb.current({}, 'POLL'), filter && !isSupabaseConfigured ? pollMs(fallbackMs) : null);
}
