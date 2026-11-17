import { api, unwrapList } from './api';
import { supabase } from './supabase';
import type { AppNotification, NotificationType } from '@/types';

const KNOWN_TYPES: NotificationType[] = ['order', 'delivery', 'system', 'approval', 'promo'];

/**
 * Realtime rows come straight from the `notifications` table, whose `type` holds the backend's
 * detailed event name (e.g. `order_picked_up`). The REST API already maps these; do the same here.
 */
export function normalizeNotificationType(raw: string): NotificationType {
  if ((KNOWN_TYPES as string[]).includes(raw)) return raw as NotificationType;
  if (['vendor_pending', 'rider_pending', 'vendor_status', 'rider_status'].includes(raw)) return 'approval';
  if (raw.startsWith('assignment') || ['order_rider_assigned', 'order_picked_up', 'order_out_for_delivery'].includes(raw)) {
    return 'delivery';
  }
  if (raw.startsWith('order')) return 'order';
  if (raw === 'announcement') return 'promo';
  return 'system';
}

export const notificationService = {
  async list(): Promise<AppNotification[]> {
    const { data } = await api.get('/notifications');
    return unwrapList<AppNotification>(data);
  },
  async markRead(id: string): Promise<void> {
    await api.patch(`/notifications/${id}/read`);
  },
  async markAllRead(): Promise<void> {
    await api.post('/notifications/read-all');
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/notifications/${id}`);
  },

  /** Realtime INSERTs into `notifications` for the given user. */
  subscribe(userId: string, onInsert: (n: AppNotification) => void): (() => void) | null {
    if (!supabase) return null;
    const client = supabase;
    const channel = client
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as AppNotification;
          onInsert({ ...row, type: normalizeNotificationType(String(row.type)) });
        },
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  },
};
