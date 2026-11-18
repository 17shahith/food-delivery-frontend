import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { BellOff, CheckCheck } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { NotificationItem } from './NotificationItem';

export function NotificationMenu({ onClose, viewAllTo }: { onClose: () => void; viewAllTo: string }) {
  const { notifications, unreadCount, markAllRead, markRead, loading } = useNotifications();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.parentElement?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const recent = notifications.slice(0, 6);

  return (
    <div
      ref={ref}
      className="absolute right-0 z-50 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-surface shadow-lg"
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">
          Notifications {unreadCount > 0 && <span className="text-slate-500">({unreadCount} new)</span>}
        </p>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => void markAllRead()}
            className="flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-800"
          >
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </button>
        )}
      </div>
      <div className="max-h-96 overflow-y-auto">
        {loading && !recent.length ? (
          <p className="px-4 py-6 text-center text-sm text-slate-500">Loading…</p>
        ) : recent.length === 0 ? (
          <div className="flex flex-col items-center px-4 py-8 text-center text-sm text-slate-500">
            <BellOff className="mb-2 h-6 w-6 text-slate-400" aria-hidden />
            You're all caught up.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recent.map((n) => (
              <NotificationItem key={n.id} notification={n} onRead={markRead} compact onNavigate={onClose} />
            ))}
          </ul>
        )}
      </div>
      <Link
        to={viewAllTo}
        onClick={onClose}
        className="block border-t border-slate-100 px-4 py-2.5 text-center text-sm font-medium text-brand-700 hover:bg-slate-50"
      >
        View all notifications
      </Link>
    </div>
  );
}
