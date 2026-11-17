import { useMemo, useState } from 'react';
import { ClipboardList, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAsync } from '@/hooks/useAsync';
import { useOrderRealtime } from '@/hooks/useOrderRealtime';
import { vendorService } from '@/services/vendorService';
import { Button, EmptyState, ErrorState, PageHeader, SkeletonList, Tabs } from '@/components/ui';
import { OrderCard } from '@/components/orders/OrderCard';
import { VendorOrderActions } from '@/components/vendor/VendorOrderActions';
import { orderLabel, timeAgo } from '@/utils/format';
import type { Order, OrderStatus } from '@/types';

type Tab = 'new' | 'preparing' | 'ready';

const TAB_STATUSES: Record<Tab, OrderStatus[]> = {
  new: ['placed'],
  preparing: ['accepted', 'preparing'],
  ready: ['ready_for_pickup', 'rider_assigned'],
};
const ALL = Object.values(TAB_STATUSES).flat();

export default function IncomingOrdersPage() {
  const [tab, setTab] = useState<Tab>('new');
  const store = useAsync(() => vendorService.me(), []);
  const orders = useAsync(() => vendorService.orders(ALL), []);
  const [refreshing, setRefreshing] = useState(false);

  useOrderRealtime(store.data ? `vendor_id=eq.${store.data.id}` : undefined, (_row, ev) => {
    if (ev === 'INSERT') toast('New order received!', { icon: '🛒' });
    void orders.reload(true);
  });

  const grouped = useMemo(() => {
    const list = [...(orders.data ?? [])].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    return {
      new: list.filter((o) => TAB_STATUSES.new.includes(o.status)),
      preparing: list.filter((o) => TAB_STATUSES.preparing.includes(o.status)),
      ready: list.filter((o) => TAB_STATUSES.ready.includes(o.status)),
    };
  }, [orders.data]);

  const onUpdated = (o: Order) =>
    orders.setData((prev) => prev?.map((x) => (x.id === o.id ? o : x)).filter((x) => ALL.includes(x.status)));

  const shown = grouped[tab];

  return (
    <div>
      <PageHeader
        title="Incoming orders"
        description="Orders appear here instantly. Oldest first."
        actions={
          <Button
            variant="outline"
            size="sm"
            loading={refreshing}
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={async () => {
              setRefreshing(true);
              await orders.reload(true);
              setRefreshing(false);
            }}
          >
            Refresh
          </Button>
        }
      />
      <Tabs<Tab>
        className="mb-4"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'new', label: 'New', count: grouped.new.length },
          { value: 'preparing', label: 'Preparing', count: grouped.preparing.length },
          { value: 'ready', label: 'Ready / pickup', count: grouped.ready.length },
        ]}
      />
      {orders.loading ? (
        <SkeletonList rows={4} />
      ) : orders.error ? (
        <ErrorState message={orders.error} onRetry={() => void orders.reload()} />
      ) : !shown.length ? (
        <EmptyState
          icon={<ClipboardList className="h-6 w-6" />}
          title={tab === 'new' ? 'No new orders' : tab === 'preparing' ? 'Nothing being prepared' : 'Nothing waiting for pickup'}
          description="This list updates automatically."
        />
      ) : (
        <div className="space-y-3">
          {shown.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              to={`/vendor/orders/${o.id}`}
              title={o.customer?.full_name ?? 'Customer'}
              subtitle={
                <>
                  {orderLabel(o)} · {o.items.map((i) => `${i.quantity}× ${i.product_name}`).join(', ')} · {timeAgo(o.created_at)}
                </>
              }
              actions={
                o.status === 'rider_assigned' ? (
                  <span className="text-sm text-slate-500">Rider {o.rider?.full_name ?? ''} is on the way to pick up.</span>
                ) : (
                  <VendorOrderActions order={o} onUpdated={onUpdated} />
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
