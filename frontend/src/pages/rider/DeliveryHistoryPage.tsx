import { useMemo, useState } from 'react';
import { History } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { riderService } from '@/services/riderService';
import { EmptyState, ErrorState, PageHeader, Select, SkeletonList, StatCard } from '@/components/ui';
import { OrderCard } from '@/components/orders/OrderCard';
import { formatCurrency, formatDateTime, orderLabel } from '@/utils/format';

type Range = '7' | '30' | 'all';

export default function DeliveryHistoryPage() {
  const history = useAsync(() => riderService.deliveries(['delivered', 'cancelled']), []);
  const [range, setRange] = useState<Range>('30');

  const list = useMemo(() => {
    const cutoff = range === 'all' ? 0 : Date.now() - Number(range) * 86400000;
    return [...(history.data ?? [])]
      .filter((o) => +new Date(o.created_at) >= cutoff)
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  }, [history.data, range]);

  const delivered = list.filter((o) => o.status === 'delivered');
  const earnings = delivered.reduce((s, o) => s + Number(o.rider_earning ?? o.delivery_fee ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Delivery history"
        description="Your completed deliveries and earnings."
        actions={
          <Select
            aria-label="Date range"
            value={range}
            onChange={(e) => setRange(e.target.value as Range)}
            options={[
              { value: '7', label: 'Last 7 days' },
              { value: '30', label: 'Last 30 days' },
              { value: 'all', label: 'All time' },
            ]}
            wrapperClassName="w-40"
          />
        }
      />
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Completed" value={delivered.length} loading={history.loading} />
        <StatCard label="Earnings" value={formatCurrency(earnings)} tone="blue" loading={history.loading} />
      </div>
      {history.loading ? (
        <SkeletonList rows={5} />
      ) : history.error ? (
        <ErrorState message={history.error} onRetry={() => void history.reload()} />
      ) : !list.length ? (
        <EmptyState icon={<History className="h-6 w-6" />} title="No deliveries in this period" description="Completed deliveries will show up here." />
      ) : (
        <div className="space-y-3">
          {list.map((o) => (
            <OrderCard
              key={o.id}
              order={{ ...o, total: Number(o.rider_earning ?? o.delivery_fee ?? 0) }}
              to={`/rider/deliveries/${o.id}`}
              title={`${o.vendor?.name ?? 'Pickup'} → ${o.delivery_address.city}`}
              subtitle={`${orderLabel(o)} · ${formatDateTime(o.status_history.find((h) => h.status === 'delivered')?.created_at ?? o.created_at)}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
