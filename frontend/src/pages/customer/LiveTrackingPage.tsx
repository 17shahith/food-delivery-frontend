import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, PartyPopper, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAsync } from '@/hooks/useAsync';
import { useOrderRealtime } from '@/hooks/useOrderRealtime';
import { useOrderTracking } from '@/hooks/useOrderTracking';
import { orderService } from '@/services/orderService';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  ErrorState,
  PageHeader,
  Skeleton,
  StatusBadge,
} from '@/components/ui';
import { DeliveryMap, MapLegend } from '@/components/maps/DeliveryMap';
import { OrderTimeline } from '@/components/orders/OrderTimeline';
import { OrderItemsList, OrderParties } from '@/components/orders/OrderSummary';
import { TrackingStats } from '@/components/orders/TrackingStats';
import { STATUS_META, isTrackable } from '@/utils/orderStatus';
import { getErrorMessage } from '@/utils/errors';
import { formatDateTime, orderLabel } from '@/utils/format';
import type { OrderStatus } from '@/types';

export default function LiveTrackingPage() {
  const { orderId = '' } = useParams();
  const order = useAsync(() => orderService.get(orderId), [orderId]);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const lastStatus = useRef<OrderStatus | null>(null);

  const o = order.data;
  useEffect(() => {
    if (!o) return;
    if (lastStatus.current && lastStatus.current !== o.status) {
      toast.success(`Order update: ${STATUS_META[o.status].label}`, { id: `status-${o.id}` });
    }
    lastStatus.current = o.status;
  }, [o?.id, o?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  useOrderRealtime(orderId ? `id=eq.${orderId}` : undefined, () => void order.reload(true));
  const trackable = !!o && isTrackable(o.status);
  const tracking = useOrderTracking(orderId, trackable);

  const cancel = async (reason?: string) => {
    setCancelling(true);
    try {
      const updated = await orderService.cancel(orderId, reason);
      order.setData(updated);
      toast.success('Order cancelled');
      setConfirmCancel(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  };

  if (order.loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[420px] w-full rounded-2xl" />
      </div>
    );
  }
  if (order.error || !o) {
    return <ErrorState title="Could not load this order" message={order.error} onRetry={() => void order.reload()} />;
  }

  const leg = o.status === 'rider_assigned' ? 'to_vendor' : trackable ? 'to_customer' : 'none';
  const target = leg === 'to_vendor' ? o.vendor ?? null : o.delivery_address;
  const rider = tracking.riderLocation
    ? { ...tracking.riderLocation, name: o.rider?.full_name ?? 'Your rider' }
    : null;

  return (
    <div>
      <PageHeader
        back={
          <Link to="/orders" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
            <ArrowLeft className="h-4 w-4" /> My orders
          </Link>
        }
        title={
          <span className="flex flex-wrap items-center gap-3">
            Order {orderLabel(o)} <StatusBadge status={o.status} />
          </span>
        }
        description={`Placed ${formatDateTime(o.created_at)} · ${o.vendor?.name ?? ''}`}
        actions={
          o.status === 'placed' && (
            <Button variant="outline" leftIcon={<XCircle className="h-4 w-4" />} onClick={() => setConfirmCancel(true)}>
              Cancel order
            </Button>
          )
        }
      />

      {o.status === 'delivered' && (
        <div className="mb-6">
          <Alert tone="success" icon={<PartyPopper className="h-5 w-5" />} title="Delivered!">
            Your order was delivered. Thanks for shopping local.
          </Alert>
        </div>
      )}
      {o.status === 'rejected' && (
        <div className="mb-6">
          <Alert tone="error" title="The shop couldn't accept this order">
            {o.rejection_reason || 'No reason was given.'} Any online payment will be refunded.
          </Alert>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader
              title="Live tracking"
              description={
                trackable
                  ? leg === 'to_vendor'
                    ? 'Your rider is heading to the shop.'
                    : 'Your rider is on the way to you.'
                  : STATUS_META[o.status].description
              }
            />
            <CardBody className="space-y-4">
              {trackable && (
                <TrackingStats
                  status={o.status}
                  rider={tracking.riderLocation}
                  target={target}
                  targetLabel={leg === 'to_vendor' ? 'to shop' : 'to you'}
                  live={tracking.live}
                  lastUpdate={tracking.lastUpdate}
                />
              )}
              <DeliveryMap
                vendor={o.vendor ? { ...o.vendor, name: o.vendor.name } : null}
                destination={{ ...o.delivery_address, label: o.delivery_address.line1 }}
                rider={rider}
                trail={tracking.trail}
                leg={leg}
                className="h-[360px] sm:h-[440px]"
              />
              <MapLegend items={trackable ? ['vendor', 'destination', 'rider'] : ['vendor', 'destination']} />
              {trackable && !tracking.riderLocation && (
                <p className="text-sm text-slate-500">Waiting for the rider's first location update…</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Items" />
            <CardBody>
              <OrderItemsList order={o} />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Order status" />
            <CardBody>
              <OrderTimeline status={o.status} history={o.status_history} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Delivery details" />
            <CardBody>
              <OrderParties order={o} show={['vendor', 'rider']} />
            </CardBody>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={cancel}
        loading={cancelling}
        title="Cancel this order?"
        message="You can only cancel before the shop accepts your order."
        confirmLabel="Cancel order"
        cancelLabel="Keep order"
        tone="danger"
        withReason
        reasonLabel="Reason (optional)"
      />
    </div>
  );
}
