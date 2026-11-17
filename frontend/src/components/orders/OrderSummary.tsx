import { MapPin, Phone, Store, User as UserIcon, Bike } from 'lucide-react';
import type { Order } from '@/types';
import { formatCurrency } from '@/utils/format';
import { ImageWithFallback } from '@/components/ui';

export function OrderItemsList({ order }: { order: Order }) {
  return (
    <div>
      <ul className="divide-y divide-slate-100">
        {order.items.map((it) => (
          <li key={it.product_id} className="flex items-center gap-3 py-3">
            <ImageWithFallback src={it.image_url} alt={it.product_name} className="h-11 w-11 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{it.product_name}</p>
              <p className="text-xs text-slate-500">
                {it.quantity} × {formatCurrency(it.unit_price)}
              </p>
            </div>
            <p className="text-sm font-medium tabular-nums text-slate-900">{formatCurrency(it.subtotal)}</p>
          </li>
        ))}
      </ul>
      <dl className="mt-2 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
        <div className="flex justify-between text-slate-600">
          <dt>Subtotal</dt>
          <dd className="tabular-nums">{formatCurrency(order.subtotal)}</dd>
        </div>
        <div className="flex justify-between text-slate-600">
          <dt>Delivery fee</dt>
          <dd className="tabular-nums">{formatCurrency(order.delivery_fee)}</dd>
        </div>
        <div className="flex justify-between pt-1 text-base font-semibold text-slate-900">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatCurrency(order.total)}</dd>
        </div>
        <div className="flex justify-between text-xs text-slate-500">
          <dt>Payment</dt>
          <dd>{order.payment_method === 'cod' ? 'Cash on delivery' : 'Paid online'}</dd>
        </div>
      </dl>
      {order.notes && (
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <span className="font-medium">Note:</span> {order.notes}
        </p>
      )}
    </div>
  );
}

function ContactRow({
  icon,
  title,
  subtitle,
  phone,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string | null;
  phone?: string | null;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900">{title}</p>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
      {phone && (
        <a
          href={`tel:${phone}`}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
          aria-label={`Call ${title}`}
        >
          <Phone className="h-4 w-4" />
        </a>
      )}
    </div>
  );
}

export function OrderParties({ order, show = ['vendor', 'customer', 'rider'] }: { order: Order; show?: ('vendor' | 'customer' | 'rider')[] }) {
  const addr = order.delivery_address;
  return (
    <div className="space-y-4">
      {show.includes('vendor') && order.vendor && (
        <ContactRow icon={<Store className="h-4 w-4" />} title={order.vendor.name} subtitle={order.vendor.address} phone={order.vendor.phone} />
      )}
      {show.includes('customer') && (
        <ContactRow
          icon={<UserIcon className="h-4 w-4" />}
          title={order.customer?.full_name ?? 'Customer'}
          subtitle={order.customer?.phone}
          phone={order.customer?.phone}
        />
      )}
      {addr && (
        <ContactRow
          icon={<MapPin className="h-4 w-4" />}
          title={addr.label ? `Deliver to ${addr.label}` : 'Delivery address'}
          subtitle={[addr.line1, addr.line2, addr.city, addr.postal_code].filter(Boolean).join(', ')}
        />
      )}
      {show.includes('rider') && (
        <ContactRow
          icon={<Bike className="h-4 w-4" />}
          title={order.rider?.full_name ?? 'Rider not assigned yet'}
          subtitle={
            order.rider
              ? [order.rider.vehicle_type, order.rider.vehicle_number].filter(Boolean).join(' · ') || undefined
              : 'We will assign a rider when your order is ready.'
          }
          phone={order.rider?.phone}
        />
      )}
    </div>
  );
}
