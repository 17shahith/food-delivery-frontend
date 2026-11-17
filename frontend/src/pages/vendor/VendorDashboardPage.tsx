import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ClipboardList, Package, PackagePlus, Timer, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAsync } from '@/hooks/useAsync';
import { useOrderRealtime } from '@/hooks/useOrderRealtime';
import { vendorService } from '@/services/vendorService';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ErrorState,
  PageHeader,
  SkeletonList,
  StatCard,
  Toggle,
} from '@/components/ui';
import { OrderCard } from '@/components/orders/OrderCard';
import { ApprovalNotice } from '@/components/ApprovalNotice';
import { VendorOrderActions } from '@/components/vendor/VendorOrderActions';
import { getErrorMessage } from '@/utils/errors';
import { formatCurrency } from '@/utils/format';
import type { Order } from '@/types';

const OPEN_STATUSES = ['placed', 'accepted', 'preparing', 'ready_for_pickup'] as const;

export default function VendorDashboardPage() {
  const store = useAsync(() => vendorService.me(), []);
  const stats = useAsync(() => vendorService.stats(), []);
  const orders = useAsync(() => vendorService.orders([...OPEN_STATUSES]), []);
  const [toggling, setToggling] = useState(false);

  useOrderRealtime(store.data ? `vendor_id=eq.${store.data.id}` : undefined, (_row, ev) => {
    if (ev === 'INSERT') toast('New order received!', { icon: '🛒' });
    void orders.reload(true);
    void stats.reload(true);
  });

  const toggleOpen = async (is_open: boolean) => {
    setToggling(true);
    try {
      const updated = await vendorService.updateMe({ is_open });
      store.setData(updated);
      toast.success(is_open ? 'Store is now open' : 'Store is now closed');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setToggling(false);
    }
  };

  const onUpdated = (o: Order) =>
    orders.setData((prev) =>
      prev?.map((x) => (x.id === o.id ? o : x)).filter((x) => (OPEN_STATUSES as readonly string[]).includes(x.status)),
    );

  const s = stats.data;
  const pending = (orders.data ?? []).filter((o) => o.status === 'placed');

  return (
    <div className="space-y-6">
      <PageHeader
        title={store.data?.name ?? 'Dashboard'}
        description="Today's activity at your store."
        actions={
          store.data && (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2">
              <span className="text-sm font-medium text-slate-700">{store.data.is_open ? 'Open for orders' : 'Closed'}</span>
              <Toggle checked={store.data.is_open} onChange={(v) => void toggleOpen(v)} disabled={toggling} label="Store open" />
            </div>
          )
        }
      />
      <ApprovalNotice status={store.data?.approval_status} />

      {stats.error ? (
        <ErrorState message={stats.error} onRetry={() => void stats.reload()} />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Orders today" value={s?.orders_today ?? 0} icon={<ClipboardList className="h-5 w-5" />} loading={stats.loading} />
          <StatCard
            label="Revenue today"
            value={formatCurrency(s?.revenue_today)}
            icon={<Wallet className="h-5 w-5" />}
            tone="blue"
            loading={stats.loading}
          />
          <StatCard
            label="Awaiting action"
            value={s?.pending_orders ?? 0}
            icon={<Timer className="h-5 w-5" />}
            tone="amber"
            loading={stats.loading}
            hint={`${s?.active_orders ?? 0} in progress`}
          />
          <StatCard
            label="Products"
            value={s?.total_products ?? 0}
            icon={<Package className="h-5 w-5" />}
            tone="violet"
            loading={stats.loading}
            hint={`${s?.completed_orders ?? 0} orders completed`}
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader
            title="New orders"
            description="Accept or reject quickly — customers are waiting."
            action={
              <Link to="/vendor/orders" className="text-sm font-medium text-brand-700 hover:text-brand-800">
                All incoming
              </Link>
            }
          />
          <CardBody>
            {orders.loading ? (
              <SkeletonList rows={3} />
            ) : orders.error ? (
              <ErrorState message={orders.error} onRetry={() => void orders.reload()} />
            ) : !pending.length ? (
              <EmptyState
                icon={<CheckCircle2 className="h-6 w-6" />}
                title="No new orders"
                description="New orders will pop up here instantly."
              />
            ) : (
              <div className="space-y-3">
                {pending.slice(0, 5).map((o) => (
                  <OrderCard
                    key={o.id}
                    order={o}
                    to={`/vendor/orders/${o.id}`}
                    title={o.customer?.full_name ?? 'Customer'}
                    actions={<VendorOrderActions order={o} onUpdated={onUpdated} />}
                  />
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="h-fit">
          <CardHeader title="Quick actions" />
          <CardBody className="space-y-2">
            <Link to="/vendor/products/new" className="block">
              <Button fullWidth variant="outline" leftIcon={<PackagePlus className="h-4 w-4" />}>
                Add a product
              </Button>
            </Link>
            <Link to="/vendor/products" className="block">
              <Button fullWidth variant="outline" leftIcon={<Package className="h-4 w-4" />}>
                Manage availability
              </Button>
            </Link>
            <Link to="/vendor/orders/history" className="block">
              <Button fullWidth variant="outline" leftIcon={<ClipboardList className="h-4 w-4" />}>
                Order history
              </Button>
            </Link>
            {(orders.data?.length ?? 0) > pending.length && (
              <p className="pt-2 text-sm text-slate-500">
                {(orders.data?.length ?? 0) - pending.length} order(s) are being prepared or awaiting pickup.
              </p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
