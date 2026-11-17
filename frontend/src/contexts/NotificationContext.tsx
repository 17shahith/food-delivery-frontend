import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { notificationService } from '@/services/notificationService';
import { isSupabaseConfigured } from '@/services/supabase';
import { useInterval } from '@/hooks/useInterval';
import { getErrorMessage } from '@/utils/errors';
import { pollMs } from '@/utils/env';
import type { AppNotification } from '@/types';
import { useAuth } from './AuthContext';

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  remove: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);
const POLL_MS = pollMs(30000, 4000);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** IDs already shown, so notifications arriving via polling can be toasted once. */
  const seen = useRef<Set<string> | null>(null);

  const reload = useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      const list = await notificationService.list();
      if (seen.current) {
        for (const n of list) {
          if (!seen.current.has(n.id) && !n.is_read) {
            toast(n.message ? `${n.title}: ${n.message}` : n.title, { icon: '🔔', duration: 5000, id: `notif-${n.id}` });
          }
        }
      }
      seen.current = new Set(list.map((n) => n.id));
      setNotifications(list.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      seen.current = null;
      return;
    }
    setLoading(true);
    void reload().finally(() => setLoading(false));
    const unsubscribe = notificationService.subscribe(user.id, (n) => {
      seen.current?.add(n.id);
      setNotifications((prev) => (prev.some((p) => p.id === n.id) ? prev : [n, ...prev]));
      toast(n.message ? `${n.title}: ${n.message}` : n.title, { icon: '🔔', duration: 5000 });
    });
    return () => unsubscribe?.();
  }, [user, reload]);

  useInterval(() => void reload(), user && !isSupabaseConfigured ? POLL_MS : null);

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    try {
      await notificationService.markRead(id);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }, []);

  const markAllRead = useCallback(async () => {
    const snapshot = notifications;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await notificationService.markAllRead();
    } catch (err) {
      setNotifications(snapshot);
      toast.error(getErrorMessage(err));
    }
  }, [notifications]);

  const remove = useCallback(async (id: string) => {
    try {
      await notificationService.remove(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }, []);

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount: notifications.filter((n) => !n.is_read).length,
      loading,
      error,
      reload,
      markRead,
      markAllRead,
      remove,
    }),
    [notifications, loading, error, reload, markRead, markAllRead, remove],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
