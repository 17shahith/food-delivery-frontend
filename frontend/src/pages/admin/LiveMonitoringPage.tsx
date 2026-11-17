import { useEffect, useMemo, useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
import { Bike, Radio } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { useInterval } from '@/hooks/useInterval';
import { useOrderRealtime } from '@/hooks/useOrderRealtime';
import { trackingService } from '@/services/trackingService';
import { adminService } from '@/services/adminService';
import { isSupabaseConfigured } from '@/services/supabase';
import { Badge, Card, CardBody, CardHeader, EmptyState, ErrorState, PageHeader, Skeleton, StatusBadge } from '@/components/ui';
import { BaseMap, FitToPoints, toLatLngTuple } from '@/components/maps/BaseMap';
import { riderIcon, riderIdleIcon, vendorIcon, destinationIcon } from '@/components/maps/mapIcons';
import { env, pollMs } from '@/utils/env';
import { isValidCoord } from '@/utils/geo';
import { orderLabel, shortId, timeAgo } from '@/utils/format';
import { TRACKABLE_STATUSES } from '@/utils/orderStatus';
import { cn } from '@/utils/cn';
import type { RiderLocation } from '@/types';

const STALE_MS = 2 * 60 * 1000;
const POLL_MS = pollMs(10000, 2000);

export default function LiveMonitoringPage() {
  const initial = useAsync(() => trackingService.activeLocations(), []);
  const orders = useAsync(() => adminService.orders(), []);
  const [locations, setLocations] = useState<Record<string, RiderLocation>>({});
  const [live, setLive] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (initial.data) setLocations(Object.fromEntries(initial.data.map((l) => [l.rider_id, l])));
  }, [initial.data]);

  useEffect(() => {
    const unsubscribe = trackingService.subscribeToLocations(
      (loc) => setLocations((prev) => ({ ...prev, [loc.rider_id]: { ...prev[loc.rider_id], ...loc } })),
      undefined,
      setLive,
    );
    return () => unsubscribe?.();
  }, []);

  useOrderRealtime('*', () => void orders.reload(true), 20000);
  useInterval(() => void initial.reload(true), !isSupabaseConfigured || !live ? POLL_MS : null);
  // Re-render periodically so "updated x ago" and staleness stay current.
  useInterval(() => setTick((t) => t + 1), 15000);

  const active = useMemo(
    () => (orders.data ?? []).filter((o) => TRACKABLE_STATUSES.includes(o.status)),
    [orders.data],
  );
  const riders = Object.values(locations).filter((l) => isValidCoord(l));
  const isStale = (l: RiderLocation) => Date.now() - +new Date(l.updated_at) > STALE_MS;
  const selectedOrder = active.find((o) => o.id === selected);
  const points = riders.length ? riders : [{ latitude: env.defaultLat, longitude: env.defaultLng }];

  const orderFor = (riderId: string) => active.find((o) => o.rider_id === riderId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live delivery monitoring"
        description="Every rider on the platform, updating in real time."
        actions={
          <span className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium', live ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
            <Radio className="h-4 w-4" aria-hidden /> {live ? 'Realtime connected' : `Polling every ${POLL_MS / 1000}s`}
          </span>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardBody>
            {initial.loading ? (
              <Skeleton className="h-[520px] w-full rounded-2xl" />
            ) : initial.error ? (
              <ErrorState message={initial.error} onRetry={() => void initial.reload()} />
            ) : (
              <BaseMap center={points[0]!} zoom={13} className="h-[520px]">
                <FitToPoints points={points} fitKey={`riders-${riders.length > 0}`} />
                {riders.map((l) => {
                  const o = orderFor(l.rider_id);
                  return (
                    <Marker
                      key={l.rider_id}
                      position={toLatLngTuple(l)}
                      icon={isStale(l) ? riderIdleIcon : riderIcon}
                      eventHandlers={{ click: () => setSelected(o?.id ?? null) }}
                    >
                      <Popup>
                        <strong>{l.rider_name ?? o?.rider?.full_name ?? `Rider ${shortId(l.rider_id)}`}</strong>
                        <div>{o ? `On ${orderLabel(o)}` : 'No active delivery'}</div>
                        <div>Updated {timeAgo(l.updated_at)}</div>
                      </Popup>
                    </Marker>
                  );
                })}
                {selectedOrder?.vendor && isValidCoord(selectedOrder.vendor) && (
                  <Marker position={toLatLngTuple(selectedOrder.vendor)} icon={vendorIcon}>
                    <Popup>{selectedOrder.vendor.name}</Popup>
                  </Marker>
                )}
                {selectedOrder && isValidCoord(selectedOrder.delivery_address) && (
                  <Marker position={toLatLngTuple(selectedOrder.delivery_address)} icon={destinationIcon}>
                    <Popup>{selectedOrder.delivery_address.line1}</Popup>
                  </Marker>
                )}
              </BaseMap>
            )}
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" aria-hidden /> Live rider
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-500" aria-hidden /> No update for 2+ min
              </span>
              <span>{riders.length} rider(s) on map</span>
            </div>
          </CardBody>
        </Card>

        <Card className="h-fit">
          <CardHeader title="Deliveries in progress" description={`${active.length} active`} />
          <CardBody className="p-0">
            {orders.loading ? (
              <div className="p-5">
                <Skeleton className="h-40 w-full" />
              </div>
            ) : orders.error ? (
              <div className="p-5">
                <ErrorState message={orders.error} onRetry={() => void orders.reload()} />
              </div>
            ) : !active.length ? (
              <div className="p-5">
                <EmptyState icon={<Bike className="h-6 w-6" />} title="No deliveries on the road" />
              </div>
            ) : (
              <ul className="max-h-[520px] divide-y divide-slate-100 overflow-y-auto">
                {active.map((o) => {
                  const loc = o.rider_id ? locations[o.rider_id] : undefined;
                  return (
                    <li key={o.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(o.id === selected ? null : o.id)}
                        className={cn('w-full px-5 py-3 text-left hover:bg-slate-50', selected === o.id && 'bg-brand-50/60')}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-slate-900">{orderLabel(o)}</span>
                          <StatusBadge status={o.status} />
                        </div>
                        <p className="mt-0.5 truncate text-sm text-slate-500">
                          {o.rider?.full_name ?? 'Rider'} · {o.vendor?.name} → {o.delivery_address.city}
                        </p>
                        <p className="mt-1 text-xs">
                          {loc ? (
                            <Badge tone={isStale(loc) ? 'amber' : 'green'}>GPS {timeAgo(loc.updated_at)}</Badge>
                          ) : (
                            <Badge tone="gray">No GPS yet</Badge>
                          )}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
