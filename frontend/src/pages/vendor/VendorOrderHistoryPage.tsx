import { useMemo, useState } from 'react';
import { History } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { vendorService } from '@/services/vendorService';
import { EmptyState, ErrorState, PageHeader, SearchInput, SkeletonList, Tabs } from '@/components/ui';
import { OrderCard } from '@/components/orders/OrderCard';
import { formatCurrency, formatDateTime, orderLabel } from '@/utils/format';
import type { OrderStatus } from '@/types';

type Tab = 'all' | 'delivered' | 'rejected' | 'cancelled';
const HISTORY: OrderStatus[] = ['delivered', 'rejected', 'cancelled', 'picked_up', 'out_for_delivery'];

export default function VendorOrderHistoryPage() {
  const orders = useAsync(() => vendorService.orders(HISTORY), []);
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');

  const list = useMemo(() => {
    const s = search.trim().toLowerCase();
    return [...(orders.data ?? [])]
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
      .filter((o) => tab === 'all' || o.status === tab)
      .filter(
        (o) =>
          !s ||
          orderLabel(o).toLowerCase().includes(s) ||
          o.customer?.full_name?.toLowerCase().includes(s) ||
          o.items.some((i) => i.product_name.toLowerCase().includes(s)),
      );
  }, [orders.data, tab, search]);

  const delivered = (orders.data ?? []).filter((o) => o.status === 'delivered');
  const revenue = delivered.reduce((s, o) => s + Number(o.subtotal), 0);

  return (
    <div>
      <PageHeader
        title="Order history"
        description={
          orders.data ? `${delivered.length} delivered · ${formatCurrency(revenue)} in item sales` : 'Completed, rejected and cancelled orders.'
        }
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs<Tab>
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'all', label: 'All' },
            { value: 'delivered', label: 'Delivered' },
            { value: 'rejected', label: 'Rejected' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
        />
        <SearchInput value={search} onChange={setSearch} placeholder="Search order, customer, item…" className="sm:w-72" />
      </div>
      {orders.loading ? (
        <SkeletonList rows={5} />
      ) : orders.error ? (
        <ErrorState message={orders.error} onRetry={() => void orders.reload()} />
      ) : !list.length ? (
        <EmptyState icon={<History className="h-6 w-6" />} title="No orders here yet" description="Finished orders will be listed here." />
      ) : (
        <div className="space-y-3">
          {list.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              to={`/vendor/orders/${o.id}`}
              title={o.customer?.full_name ?? 'Customer'}
              subtitle={`${orderLabel(o)} · ${formatDateTime(o.created_at)}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
