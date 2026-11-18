import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Map as MapIcon, MapPin, Radar, RefreshCw, Store, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAsync } from '@/hooks/useAsync';
import { useInterval } from '@/hooks/useInterval';
import { useOrderRealtime } from '@/hooks/useOrderRealtime';
import { useLocationSharing } from '@/contexts/LocationSharingContext';
import { riderService } from '@/services/riderService';
import { Alert, Button, Card, EmptyState, ErrorState, Modal, PageHeader, SkeletonList } from '@/components/ui';
import { DeliveryMap, MapLegend } from '@/components/maps/DeliveryMap';
import { getErrorMessage } from '@/utils/errors';
import { formatCurrency, formatDistance, orderLabel, timeAgo } from '@/utils/format';
import { haversineKm, isValidCoord } from '@/utils/geo';
import type { Order } from '@/types';
import { pollMs } from '@/utils/env';

const POLL_MS = pollMs(15000, 4000);

export default function AvailableDeliveriesPage() {
  const navigate = useNavigate();
  const profile = useAsync(() => riderService.me(), []);
  const online = !!profile.data?.is_online;
  const list = useAsync(() => riderService.available(), [online], online);
  const { position, sharing, start, setActiveOrderId } = useLocationSharing();
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<Order | null>(null);

  useInterval(() => void list.reload(true), online ? POLL_MS : null);
  // Realtime filters match raw DB columns: the backend stores the status as `order_status` = 'READY_FOR_PICKUP'.
  useOrderRealtime(online ? 'order_status=eq.READY_FOR_PICKUP' : undefined, () => void list.reload(true));

  const accept = async (o: Order) => {
    setBusy(o.id);
    try {
      await riderService.accept(o.id);
      toast.success('Delivery accepted — head to the shop.');
      if (!sharing) start();
      setActiveOrderId(o.id);
      navigate(`/rider/deliveries/${o.id}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
      void list.reload(true);
    } finally {
      setBusy(null);
    }
  };

  const reject = async (o: Order) => {
    setBusy(o.id);
    try {
      await riderService.reject(o.id);
      list.setData((prev) => prev?.filter((x) => x.id !== o.id));
      toast('Delivery skipped');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const distanceFromMe = (o: Order) =>
    position && o.vendor && isValidCoord(o.vendor) ? haversineKm(position, o.vendor) : null;
  const tripKm = (o: Order) =>
    o.distance_km ?? (o.vendor && isValidCoord(o.vendor) ? haversineKm(o.vendor, o.delivery_address) : null);

  return (
    <div>
      <PageHeader
        title="Available deliveries"
        description="Orders ready for pickup near you. The list refreshes automatically."
        actions={
          online && (
            <Button variant="outline" size="sm" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => void list.reload()}>
              Refresh
            </Button>
          )
        }
      />

      {profile.loading ? (
        <SkeletonList rows={3} />
      ) : profile.error ? (
        <ErrorState message={profile.error} onRetry={() => void profile.reload()} />
      ) : !online ? (
        <EmptyState
          icon={<Radar className="h-6 w-6" />}
          title="You're offline"
          description="Go online from your dashboard to see delivery requests."
          action={
            <Link to="/rider">
              <Button>Go to dashboard</Button>
            </Link>
          }
        />
      ) : list.loading ? (
        <SkeletonList rows={3} />
      ) : list.error ? (
        <ErrorState message={list.error} onRetry={() => void list.reload()} />
      ) : !list.data?.length ? (
        <EmptyState
          icon={<Radar className="h-6 w-6" />}
          title="No deliveries right now"
          description="Stay online — new requests show up here as soon as shops mark orders ready."
        />
      ) : (
        <div className="space-y-4">
          {!sharing && (
            <Alert tone="warning" action={<Button size="sm" onClick={start}>Enable</Button>}>
              Turn on live location so we can show distances and customers can track you.
            </Alert>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {list.data.map((o) => {
              const fromMe = distanceFromMe(o);
              const trip = tripKm(o);
              return (
                <Card key={o.id} className="flex flex-col">
                  <div className="flex-1 space-y-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-slate-500">
                          {orderLabel(o)} · ready {timeAgo(o.status_history.find((h) => h.status === 'ready_for_pickup')?.created_at ?? o.updated_at ?? o.created_at)}
                        </p>
                        <p className="mt-0.5 text-lg font-semibold text-slate-900">
                          {o.rider_earning != null ? formatCurrency(o.rider_earning) : formatCurrency(o.delivery_fee)}
                          <span className="ml-1 text-sm font-normal text-slate-500">earning</span>
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-medium text-slate-900">{formatDistance(trip)}</p>
                        <p className="text-xs text-slate-500">trip</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p className="flex items-start gap-2">
                        <Store className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" aria-hidden />
                        <span>
                          <span className="font-medium text-slate-900">{o.vendor?.name}</span>
                          <span className="block text-slate-500">
                            {o.vendor?.address}
                            {fromMe != null && ` · ${formatDistance(fromMe)} from you`}
                          </span>
                        </span>
                      </p>
                      <p className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden />
                        <span className="text-slate-600">
                          {[o.delivery_address.line1, o.delivery_address.city].filter(Boolean).join(', ')}
                        </span>
                      </p>
                    </div>
                    <p className="text-xs text-slate-500">
                      {o.items.reduce((s, i) => s + i.quantity, 0)} items ·{' '}
                      {o.payment_method === 'cod' ? `Collect ${formatCurrency(o.total)} cash` : 'Prepaid'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-3">
                    <Button variant="ghost" size="sm" leftIcon={<MapIcon className="h-4 w-4" />} onClick={() => setPreview(o)}>
                      Map
                    </Button>
                    <div className="flex-1" />
                    <Button variant="outline" size="sm" leftIcon={<X className="h-4 w-4" />} disabled={!!busy} onClick={() => void reject(o)}>
                      Skip
                    </Button>
                    <Button size="sm" leftIcon={<Check className="h-4 w-4" />} loading={busy === o.id} disabled={!!busy} onClick={() => void accept(o)}>
                      Accept
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview ? `Route for ${orderLabel(preview)}` : ''} size="lg">
        {preview && (
          <div className="space-y-3">
            <DeliveryMap
              vendor={preview.vendor ?? null}
              destination={preview.delivery_address}
              self={position ? { ...position, label: 'You' } : null}
              className="h-80"
            />
            <MapLegend items={position ? ['you', 'vendor', 'destination'] : ['vendor', 'destination']} />
          </div>
        )}
      </Modal>
    </div>
  );
}
