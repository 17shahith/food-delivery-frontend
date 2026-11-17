import { useNavigate } from 'react-router-dom';
import { Bell, Bike, CheckCircle2, Megaphone, Package, Trash2 } from 'lucide-react';
import type { AppNotification, Role } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { timeAgo } from '@/utils/format';
import { cn } from '@/utils/cn';

const icons = {
  order: Package,
  delivery: Bike,
  approval: CheckCircle2,
  promo: Megaphone,
  system: Bell,
};

export function orderLinkFor(role: Role | undefined, orderId: string): string {
  switch (role) {
    case 'vendor':
      return `/vendor/orders/${orderId}`;
    case 'rider':
      return `/rider/deliveries/${orderId}`;
    case 'admin':
      return `/admin/orders?focus=${orderId}`;
    default:
      return `/orders/${orderId}`;
  }
}

export function NotificationItem({
  notification: n,
  onRead,
  onRemove,
  compact,
  onNavigate,
}: {
  notification: AppNotification;
  onRead: (id: string) => void;
  onRemove?: (id: string) => void;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const Icon = icons[n.type] ?? Bell;

  const open = () => {
    if (!n.is_read) onRead(n.id);
    if (n.order_id) {
      onNavigate?.();
      navigate(orderLinkFor(user?.role, n.order_id));
    }
  };

  return (
    <li className={cn('group relative flex gap-3 px-4 py-3', !n.is_read && 'bg-brand-50/50')}>
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
          n.is_read ? 'bg-slate-100 text-slate-500' : 'bg-brand-100 text-brand-700',
        )}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <button type="button" onClick={open} className="min-w-0 flex-1 text-left focus-visible:outline-none">
        <p className={cn('text-sm', n.is_read ? 'text-slate-700' : 'font-medium text-slate-900')}>{n.title}</p>
        {n.message && <p className={cn('text-sm text-slate-500', compact && 'line-clamp-2')}>{n.message}</p>}
        <p className="mt-1 text-xs text-slate-400">{timeAgo(n.created_at)}</p>
      </button>
      {!n.is_read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-600" aria-label="Unread" />}
      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(n.id)}
          className="shrink-0 self-start rounded-lg p-1.5 text-slate-400 opacity-100 hover:bg-red-50 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
          aria-label="Delete notification"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </li>
  );
}
