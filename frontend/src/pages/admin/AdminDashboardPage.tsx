import { Link } from 'react-router-dom';
import { Activity, Bike, ClipboardList, ShieldCheck, Store, Users, Wallet, Wifi } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { useInterval } from '@/hooks/useInterval';
import { adminService } from '@/services/adminService';
import { Button, Card, CardBody, CardHeader, EmptyState, ErrorState, PageHeader, SkeletonList, StatCard } from '@/components/ui';
import { BarChart } from '@/components/charts/Charts';
import { OrderCard } from '@/components/orders/OrderCard';
import { ACTIVE_STATUSES } from '@/utils/orderStatus';
import { formatCurrency } from '@/utils/format';

const REFRESH_MS = 30000;

export default function AdminDashboardPage() {
  const stats = useAsync(() => adminService.stats(), []);
  const analytics = useAsync(() => adminService.analytics(14), []);
  const orders = useAsync(() => adminService.orders(), []);

  useInterval(() => {
    void stats.reload(true);
    void orders.reload(true);
  }, REFRESH_MS);

  const s = stats.data;
  const active = (orders.data ?? []).filter((o) => ACTIVE_STATUSES.includes(o.status)).slice(0, 6);
  const daily = (analytics.data?.daily ?? []).map((d) => {
    const date = new Date(d.date);
    return {
      label: date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
      title: date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }),
      value: d.orders,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Platform overview" description="Live snapshot of customers, vendors, riders and orders." />

      {stats.error ? (
        <ErrorState message={stats.error} onRetry={() => void stats.reload()} />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Customers" value={s?.total_customers ?? 0} icon={<Users className="h-5 w-5" />} loading={stats.loading} />
          <StatCard label="Vendors" value={s?.total_vendors ?? 0} icon={<Store className="h-5 w-5" />} tone="violet" loading={stats.loading} />
          <StatCard
            label="Riders"
            value={s?.total_riders ?? 0}
            icon={<Bike className="h-5 w-5" />}
            tone="blue"
            loading={stats.loading}
            hint={
              <span className="inline-flex items-center gap-1">
                <Wifi className="h-3 w-3" aria-hidden /> {s?.online_riders ?? 0} online now
              </span>
            }
          />
          <StatCard
            label="Active orders"
            value={s?.active_orders ?? 0}
            icon={<Activity className="h-5 w-5" />}
            tone="amber"
            loading={stats.loading}
            hint={`${s?.orders_today ?? 0} orders today`}
          />
          <StatCard
            label="Revenue today"
            value={formatCurrency(s?.revenue_today)}
            icon={<Wallet className="h-5 w-5" />}
            loading={stats.loading}
          />
          <StatCard
            label="Pending approvals"
            value={s?.pending_approvals ?? 0}
            icon={<ShieldCheck className="h-5 w-5" />}
            tone="rose"
            loading={stats.loading}
            hint={
              (s?.pending_approvals ?? 0) > 0 ? (
                <span className="flex gap-2">
                  <Link to="/admin/vendors?status=pending" className="font-medium text-brand-700 hover:underline">
                    Vendors
                  </Link>
                  <Link to="/admin/riders?status=pending" className="font-medium text-brand-700 hover:underline">
                    Riders
                  </Link>
                </span>
              ) : (
                'All caught up'
              )
            }
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Orders per day"
            description="Last 14 days"
            action={
              <Link to="/admin/analytics" className="text-sm font-medium text-brand-700 hover:text-brand-800">
                Analytics
              </Link>
            }
          />
          <CardBody>
            {analytics.loading ? (
              <div className="h-[220px] animate-pulse rounded-xl bg-slate-100" />
            ) : analytics.error ? (
              <ErrorState message={analytics.error} onRetry={() => void analytics.reload()} />
            ) : !daily.length ? (
              <EmptyState title="No order data yet" />
            ) : (
              <BarChart data={daily} ariaLabel="Orders per day over the last 14 days" formatValue={(v) => `${v} orders`} />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Active orders"
            action={
              <Link to="/admin/monitoring">
                <Button size="sm" variant="outline">
                  Live map
                </Button>
              </Link>
            }
          />
          <CardBody>
            {orders.loading ? (
              <SkeletonList rows={3} />
            ) : orders.error ? (
              <ErrorState message={orders.error} onRetry={() => void orders.reload()} />
            ) : !active.length ? (
              <EmptyState icon={<ClipboardList className="h-6 w-6" />} title="No active orders" description="New orders will show up here." />
            ) : (
              <div className="space-y-3">
                {active.map((o) => (
                  <OrderCard key={o.id} order={o} to={`/admin/orders?focus=${o.id}`} />
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
