import { Clock, Navigation, Radio } from 'lucide-react';
import type { LatLng, OrderStatus } from '@/types';
import { estimateEtaMinutes, haversineKm, isValidCoord } from '@/utils/geo';
import { formatDistance, formatMinutes, timeAgo } from '@/utils/format';
import { StatusBadge } from '@/components/ui';
import { cn } from '@/utils/cn';

/** Distance / ETA / live indicator strip shown above tracking maps. */
export function TrackingStats({
  status,
  rider,
  target,
  targetLabel,
  live,
  lastUpdate,
}: {
  status: OrderStatus;
  rider: LatLng | null;
  target: LatLng | null;
  targetLabel: string;
  live: boolean;
  lastUpdate: string | null;
}) {
  const distance = isValidCoord(rider) && isValidCoord(target) ? haversineKm(rider, target) : null;
  const eta = distance != null ? estimateEtaMinutes(distance) : null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="rounded-xl bg-slate-50 px-3 py-2.5">
        <p className="text-xs text-slate-500">Status</p>
        <div className="mt-1">
          <StatusBadge status={status} />
        </div>
      </div>
      <div className="rounded-xl bg-slate-50 px-3 py-2.5">
        <p className="flex items-center gap-1 text-xs text-slate-500">
          <Navigation className="h-3 w-3" aria-hidden /> Distance {targetLabel}
        </p>
        <p className="mt-0.5 font-semibold tabular-nums text-slate-900">{formatDistance(distance)}</p>
      </div>
      <div className="rounded-xl bg-slate-50 px-3 py-2.5">
        <p className="flex items-center gap-1 text-xs text-slate-500">
          <Clock className="h-3 w-3" aria-hidden /> Est. arrival
        </p>
        <p className="mt-0.5 font-semibold tabular-nums text-slate-900">{eta != null ? formatMinutes(eta) : '—'}</p>
      </div>
      <div className="rounded-xl bg-slate-50 px-3 py-2.5">
        <p className="flex items-center gap-1 text-xs text-slate-500">
          <Radio className="h-3 w-3" aria-hidden /> Live feed
        </p>
        <p className={cn('mt-0.5 flex items-center gap-1.5 text-sm font-semibold', live ? 'text-emerald-700' : 'text-slate-600')}>
          <span className={cn('h-2 w-2 rounded-full', live ? 'bg-emerald-500' : 'bg-slate-400')} aria-hidden />
          {live ? 'Connected' : 'Polling'}
        </p>
        {lastUpdate && <p className="text-[11px] text-slate-500">Updated {timeAgo(lastUpdate)}</p>}
      </div>
    </div>
  );
}
