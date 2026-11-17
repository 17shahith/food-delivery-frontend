import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Package } from 'lucide-react';
import type { Order } from '@/types';
import { StatusBadge } from '@/components/ui';
import { formatCurrency, orderLabel, timeAgo } from '@/utils/format';

/** Compact order row used in lists across all roles. */
export function OrderCard({
  order,
  to,
  title,
  subtitle,
  actions,
}: {
  order: Order;
  to?: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  const itemCount = order.items?.reduce((s, i) => s + i.quantity, 0) ?? 0;
  const body = (
    <div className="flex items-start gap-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
        <Package className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium text-slate-900">{title ?? order.vendor?.name ?? 'Order'}</p>
          <StatusBadge status={order.status} />
        </div>
        <p className="mt-0.5 text-sm text-slate-500">
          {subtitle ?? (
            <>
              {orderLabel(order)} · {itemCount} item{itemCount === 1 ? '' : 's'} · {timeAgo(order.created_at)}
            </>
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-sm font-semibold tabular-nums text-slate-900">{formatCurrency(order.total)}</span>
        {to && <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden />}
      </div>
    </div>
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-card transition-colors hover:border-slate-300">
      {to ? (
        <Link to={to} className="block rounded-2xl p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
          {body}
        </Link>
      ) : (
        <div className="p-4">{body}</div>
      )}
      {actions && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-4 py-3">{actions}</div>}
    </div>
  );
}
