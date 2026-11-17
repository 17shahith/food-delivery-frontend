import { supabase } from './supabase';
import type { Order } from '@/types';

/**
 * Subscribes to changes on the `orders` table matching `filter`
 * (e.g. `id=eq.<id>`, `vendor_id=eq.<id>`, `customer_id=eq.<id>`).
 * Payload rows are partial (no joins), so callers usually refetch on change.
 */
export function subscribeToOrders(
  filter: string | undefined,
  onChange: (row: Partial<Order>, event: 'INSERT' | 'UPDATE' | 'DELETE') => void,
): (() => void) | null {
  if (!supabase) return null;
  const client = supabase;
  const channel = client
    .channel(`orders:${filter ?? 'all'}:${Math.random().toString(36).slice(2, 8)}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders', ...(filter ? { filter } : {}) },
      (payload) => {
        const row = (payload.new && Object.keys(payload.new).length ? payload.new : payload.old) as Partial<Order>;
        onChange(row, payload.eventType);
      },
    )
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}
