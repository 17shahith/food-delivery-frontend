import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { useOrderRealtime } from '@/hooks/useOrderRealtime';
import { useOrderTracking } from '@/hooks/useOrderTracking';
import { orderService } from '@/services/orderService';
import { Alert, Card, CardBody, CardHeader, ErrorState, PageHeader, Skeleton, StatusBadge } from '@/components/ui';
import { OrderTimeline } from '@/components/orders/OrderTimeline';
import { OrderItemsList, OrderParties } from '@/components/orders/OrderSummary';
import { VendorOrderActions } from '@/components/vendor/VendorOrderActions';
import { DeliveryMap, MapLegend } from '@/components/maps/DeliveryMap';
import { formatDateTime, orderLabel } from '@/utils/format';

export default function VendorOrderDetailsPage() {
  const { orderId = '' } = useParams();
  const order = useAsync(() => orderService.get(orderId), [orderId]);
  useOrderRealtime(orderId ? `id=eq.${orderId}` : undefined, () => void order.reload(true));
  // Vendors see the rider approaching for pickup.
  const tracking = useOrderTracking(orderId, order.data?.status === 'rider_assigned');

  if (order.loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }
  if (order.error || !order.data) {
    return <ErrorState title="Could not load order" message={order.error} onRetry={() => void order.reload()} />;
  }
  const o = order.data;

  return (
    <div>
      <PageHeader
        back={
          <Link to="/vendor/orders" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
            <ArrowLeft className="h-4 w-4" /> Incoming orders
          </Link>
        }
        title={
          <span className="flex flex-wrap items-center gap-3">
            Order {orderLabel(o)} <StatusBadge status={o.status} />
          </span>
        }
        description={`Placed ${formatDateTime(o.created_at)}`}
        actions={<VendorOrderActions order={o} onUpdated={order.setData} size="md" />}
      />
      {o.status === 'rejected' && o.rejection_reason && (
        <div className="mb-6">
          <Alert tone="error" title="Rejected">
            {o.rejection_reason}
          </Alert>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Items to prepare" />
            <CardBody>
              <OrderItemsList order={o} />
            </CardBody>
          </Card>
          {(o.status === 'rider_assigned' || o.status === 'ready_for_pickup') && (
            <Card>
              <CardHeader title="Pickup" description={o.rider ? `${o.rider.full_name} is coming to collect this order.` : 'Waiting for a rider.'} />
              <CardBody className="space-y-3">
                <DeliveryMap
                  vendor={o.vendor ?? null}
                  destination={o.delivery_address}
                  rider={tracking.riderLocation ? { ...tracking.riderLocation, name: o.rider?.full_name } : null}
                  trail={tracking.trail}
                  leg="to_vendor"
                  className="h-72"
                />
                <MapLegend items={['vendor', 'destination', 'rider']} />
              </CardBody>
            </Card>
          )}
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Progress" />
            <CardBody>
              <OrderTimeline status={o.status} history={o.status_history} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Customer & delivery" />
            <CardBody>
              <OrderParties order={o} show={['customer', 'rider']} />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
