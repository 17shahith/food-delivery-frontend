import { Link } from 'react-router-dom';
import { ListChecks } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { riderService } from '@/services/riderService';
import { Button, EmptyState, ErrorState, PageHeader, SkeletonList } from '@/components/ui';
import { OrderCard } from '@/components/orders/OrderCard';
import { RiderProgressButton } from '@/components/rider/RiderProgressButton';
import { LocationSharingCard } from '@/components/rider/LocationSharingCard';
import { TRACKABLE_STATUSES } from '@/utils/orderStatus';
import { orderLabel } from '@/utils/format';
import type { Order } from '@/types';

export default function AssignedDeliveriesPage() {
  const deliveries = useAsync(() => riderService.deliveries(TRACKABLE_STATUSES), []);
  const onUpdated = (o: Order) =>
    deliveries.setData((prev) => prev?.map((x) => (x.id === o.id ? o : x)).filter((x) => TRACKABLE_STATUSES.includes(x.status)));

  return (
    <div className="space-y-6">
      <PageHeader title="My deliveries" description="Deliveries you've accepted and are working on." />
      <LocationSharingCard />
      {deliveries.loading ? (
        <SkeletonList rows={3} />
      ) : deliveries.error ? (
        <ErrorState message={deliveries.error} onRetry={() => void deliveries.reload()} />
      ) : !deliveries.data?.length ? (
        <EmptyState
          icon={<ListChecks className="h-6 w-6" />}
          title="No assigned deliveries"
          description="Accept a delivery request and it will appear here."
          action={
            <Link to="/rider/available">
              <Button>Find deliveries</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {deliveries.data.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              to={`/rider/deliveries/${o.id}`}
              title={`${o.vendor?.name ?? 'Pickup'} → ${o.customer?.full_name ?? 'Customer'}`}
              subtitle={`${orderLabel(o)} · ${o.delivery_address.line1}, ${o.delivery_address.city}`}
              actions={
                <>
                  <Link to={`/rider/deliveries/${o.id}`}>
                    <Button variant="outline" size="sm">
                      Open map
                    </Button>
                  </Link>
                  <RiderProgressButton order={o} onUpdated={onUpdated} size="sm" />
                </>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
