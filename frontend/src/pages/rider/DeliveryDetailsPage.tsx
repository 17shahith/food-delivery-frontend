import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, PartyPopper } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { useOrderRealtime } from '@/hooks/useOrderRealtime';
import { useLocationSharing } from '@/contexts/LocationSharingContext';
import { orderService } from '@/services/orderService';
import { Alert, Button, Card, CardBody, CardHeader, ErrorState, PageHeader, Skeleton, StatusBadge } from '@/components/ui';
import { DeliveryMap, MapLegend } from '@/components/maps/DeliveryMap';
import { OrderTimeline } from '@/components/orders/OrderTimeline';
import { OrderItemsList, OrderParties } from '@/components/orders/OrderSummary';
import { TrackingStats } from '@/components/orders/TrackingStats';
import { RiderProgressButton } from '@/components/rider/RiderProgressButton';
import { LocationSharingCard } from '@/components/rider/LocationSharingCard';
import { directionsUrl, isValidCoord } from '@/utils/geo';
import { formatCurrency, orderLabel } from '@/utils/format';
import { isTrackable } from '@/utils/orderStatus';

export default function DeliveryDetailsPage() {
  const { orderId = '' } = useParams();
  const order = useAsync(() => orderService.get(orderId), [orderId]);
  const { position, sharing, setActiveOrderId, lastSentAt } = useLocationSharing();
  useOrderRealtime(orderId ? `id=eq.${orderId}` : undefined, () => void order.reload(true));

  const o = order.data;
  const active = !!o && isTrackable(o.status);

  // Tag outgoing GPS updates with this order while it's in progress.
  useEffect(() => {
    if (active) setActiveOrderId(orderId);
    return () => setActiveOrderId(null);
  }, [active, orderId, setActiveOrderId]);

  if (order.loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[420px] w-full rounded-2xl" />
      </div>
    );
  }
  if (order.error || !o) {
    return <ErrorState title="Could not load delivery" message={order.error} onRetry={() => void order.reload()} />;
  }

  const toVendor = o.status === 'rider_assigned';
  const target = toVendor ? o.vendor ?? null : o.delivery_address;
  const me = position && isValidCoord(position) ? position : null;

  return (
    <div>
      <PageHeader
        back={
          <Link to="/rider/deliveries" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
            <ArrowLeft className="h-4 w-4" /> My deliveries
          </Link>
        }
        title={
          <span className="flex flex-wrap items-center gap-3">
            Delivery {orderLabel(o)} <StatusBadge status={o.status} />
          </span>
        }
        description={
          o.payment_method === 'cod' ? `Collect ${formatCurrency(o.total)} in cash on delivery` : 'Prepaid — no cash to collect'
        }
        actions={<RiderProgressButton order={o} onUpdated={order.setData} />}
      />

      {o.status === 'delivered' && (
        <div className="mb-6">
          <Alert tone="success" icon={<PartyPopper className="h-5 w-5" />} title="Delivery complete">
            Great job! {o.rider_earning != null && `You earned ${formatCurrency(o.rider_earning)}.`}
          </Alert>
        </div>
      )}
      {active && !sharing && (
        <div className="mb-6">
          <LocationSharingCard />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader
              title={toVendor ? 'Head to pickup' : active ? 'Deliver to customer' : 'Route'}
              action={
                target &&
                isValidCoord(target) && (
                  <a href={directionsUrl(target, me)} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="outline" rightIcon={<ExternalLink className="h-3.5 w-3.5" />}>
                      Directions
                    </Button>
                  </a>
                )
              }
            />
            <CardBody className="space-y-4">
              {active && (
                <TrackingStats
                  status={o.status}
                  rider={me}
                  target={target}
                  targetLabel={toVendor ? 'to shop' : 'to customer'}
                  live={sharing}
                  lastUpdate={lastSentAt ? new Date(lastSentAt).toISOString() : null}
                />
              )}
              <DeliveryMap
                vendor={o.vendor ?? null}
                destination={{ ...o.delivery_address, label: o.delivery_address.line1 }}
                rider={active && me ? { ...me, name: 'You' } : null}
                leg={toVendor ? 'to_vendor' : active ? 'to_customer' : 'none'}
                className="h-[360px] sm:h-[440px]"
              />
              <MapLegend items={active && me ? ['rider', 'vendor', 'destination'] : ['vendor', 'destination']} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Order items" description="Check these at pickup." />
            <CardBody>
              <OrderItemsList order={o} />
            </CardBody>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Contacts" />
            <CardBody>
              <OrderParties order={o} show={['vendor', 'customer']} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Progress" />
            <CardBody>
              <OrderTimeline status={o.status} history={o.status_history} compact />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
