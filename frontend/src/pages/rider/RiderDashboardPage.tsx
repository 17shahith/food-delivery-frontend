import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bike, CheckCircle2, Radar, Star, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAsync } from '@/hooks/useAsync';
import { useLocationSharing } from '@/contexts/LocationSharingContext';
import { riderService } from '@/services/riderService';
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
import { LocationSharingCard } from '@/components/rider/LocationSharingCard';
import { RiderProgressButton } from '@/components/rider/RiderProgressButton';
import { getErrorMessage } from '@/utils/errors';
import { formatCurrency } from '@/utils/format';
import { TRACKABLE_STATUSES } from '@/utils/orderStatus';
import { cn } from '@/utils/cn';
import type { Order } from '@/types';

export default function RiderDashboardPage() {
  const profile = useAsync(() => riderService.me(), []);
  const stats = useAsync(() => riderService.stats(), []);
  const active = useAsync(() => riderService.deliveries(TRACKABLE_STATUSES), []);
  const sharing = useLocationSharing();
  const [toggling, setToggling] = useState(false);

  const approved = profile.data?.approval_status === 'approved';

  const setOnline = async (online: boolean) => {
    setToggling(true);
    try {
      const updated = await riderService.setAvailability(online);
      profile.setData(updated);
      if (online) sharing.start();
      else if (!active.data?.length) sharing.stop();
      toast.success(online ? "You're online — new deliveries will appear." : "You're offline.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setToggling(false);
    }
  };

  const onUpdated = (o: Order) =>
    active.setData((prev) => prev?.map((x) => (x.id === o.id ? o : x)).filter((x) => TRACKABLE_STATUSES.includes(x.status)));

  const online = !!profile.data?.is_online;
  const s = stats.data;

  return (
    <div className="space-y-6">
      <PageHeader title="Rider dashboard" description="Go online to start receiving delivery requests." />
      <ApprovalNotice status={profile.data?.approval_status} />

      {profile.error ? (
        <ErrorState message={profile.error} onRetry={() => void profile.reload()} />
      ) : (
        <Card className={cn(online ? 'border-emerald-200 bg-emerald-50/40' : '')}>
          <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-2xl',
                  online ? 'bg-emerald-600 text-slate-900' : 'bg-slate-200 text-slate-500',
                )}
              >
                <Bike className="h-6 w-6" aria-hidden />
              </span>
              <div>
                <p className="text-lg font-semibold text-slate-900">{online ? 'You are online' : 'You are offline'}</p>
                <p className="text-sm text-slate-500">
                  {online ? 'Nearby ready orders will be offered to you.' : 'Toggle on when you are ready to ride.'}
                </p>
              </div>
            </div>
            <Toggle
              size="lg"
              checked={online}
              onChange={(v) => void setOnline(v)}
              disabled={toggling || profile.loading || !approved}
              label="Online availability"
            />
          </CardBody>
        </Card>
      )}

      {(online || sharing.sharing) && <LocationSharingCard compact />}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Deliveries today" value={s?.deliveries_today ?? 0} icon={<CheckCircle2 className="h-5 w-5" />} loading={stats.loading} />
        <StatCard label="Earnings today" value={formatCurrency(s?.earnings_today)} icon={<Wallet className="h-5 w-5" />} tone="blue" loading={stats.loading} />
        <StatCard label="Total deliveries" value={s?.total_deliveries ?? 0} icon={<Bike className="h-5 w-5" />} tone="violet" loading={stats.loading} />
        <StatCard
          label="Rating"
          value={s?.rating != null ? s.rating.toFixed(1) : '—'}
          icon={<Star className="h-5 w-5" />}
          tone="amber"
          loading={stats.loading}
        />
      </div>

      <Card>
        <CardHeader
          title="Current deliveries"
          action={
            <Link to="/rider/deliveries" className="text-sm font-medium text-brand-700 hover:text-brand-800">
              View all
            </Link>
          }
        />
        <CardBody>
          {active.loading ? (
            <SkeletonList rows={2} />
          ) : active.error ? (
            <ErrorState message={active.error} onRetry={() => void active.reload()} />
          ) : !active.data?.length ? (
            <EmptyState
              icon={<Radar className="h-6 w-6" />}
              title="No active deliveries"
              description={online ? 'Check available deliveries to pick one up.' : 'Go online to receive delivery requests.'}
              action={
                online && (
                  <Link to="/rider/available">
                    <Button>Find deliveries</Button>
                  </Link>
                )
              }
            />
          ) : (
            <div className="space-y-3">
              {active.data.map((o) => (
                <OrderCard
                  key={o.id}
                  order={o}
                  to={`/rider/deliveries/${o.id}`}
                  title={`${o.vendor?.name ?? 'Pickup'} → ${o.delivery_address.line1}`}
                  actions={<RiderProgressButton order={o} onUpdated={onUpdated} size="sm" />}
                />
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
