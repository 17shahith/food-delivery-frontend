import { useMemo, useState } from 'react';
import { Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Crosshair, Maximize2 } from 'lucide-react';
import type { LatLng } from '@/types';
import { isValidCoord } from '@/utils/geo';
import { formatTime } from '@/utils/format';
import { BaseMap, FitToPoints, FollowPoint, MapControl, toLatLngTuple } from './BaseMap';
import { destinationIcon, riderIcon, vendorIcon, customerIcon } from './mapIcons';

export interface DeliveryMapProps {
  vendor?: (LatLng & { name?: string | null; address?: string | null }) | null;
  destination?: (LatLng & { label?: string | null }) | null;
  rider?: (LatLng & { name?: string | null; updated_at?: string | null }) | null;
  /** The viewer's own position (e.g. rider device or customer). */
  self?: (LatLng & { label?: string | null }) | null;
  trail?: LatLng[];
  /** Which leg the rider is on, controls the guide line. */
  leg?: 'to_vendor' | 'to_customer' | 'none';
  className?: string;
}

function RecenterButton({ points }: { points: LatLng[] }) {
  const map = useMap();
  return (
    <button
      type="button"
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow hover:bg-slate-50"
      onClick={() => {
        if (points.length === 1) map.setView(toLatLngTuple(points[0]!), 15);
        else if (points.length > 1) map.fitBounds(L.latLngBounds(points.map(toLatLngTuple)), { padding: [48, 48] });
      }}
      aria-label="Show all points"
      title="Show all points"
    >
      <Maximize2 className="h-4 w-4" />
    </button>
  );
}

export function DeliveryMap({ vendor, destination, rider, self, trail = [], leg = 'none', className }: DeliveryMapProps) {
  const [follow, setFollow] = useState(false);
  const v = isValidCoord(vendor) ? vendor : null;
  const d = isValidCoord(destination) ? destination : null;
  const r = isValidCoord(rider) ? rider : null;
  const s = isValidCoord(self) ? self : null;

  const points = useMemo(() => [v, d, r, s].filter(Boolean) as LatLng[], [v, d, r, s]);
  const center = points[0] ?? { latitude: 0, longitude: 0 };
  // Re-fit when a marker first appears, not on every movement.
  const fitKey = `${!!v}-${!!d}-${!!r}-${!!s}`;

  const guide: LatLng[] | null = r
    ? leg === 'to_vendor' && v
      ? [r, v]
      : leg === 'to_customer' && d
        ? [r, d]
        : null
    : v && d
      ? [v, d]
      : null;

  if (!points.length) {
    return (
      <div className={`flex items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500 ${className ?? ''}`}>
        Location data is not available yet.
      </div>
    );
  }

  return (
    <BaseMap center={center} className={className}>
      <FitToPoints points={points} fitKey={fitKey} />
      <FollowPoint point={r} enabled={follow} />

      {guide && (
        <Polyline
          positions={guide.map(toLatLngTuple)}
          pathOptions={{ color: '#64748b', weight: 3, dashArray: '6 8', opacity: 0.8 }}
        />
      )}
      {trail.length > 1 && (
        <Polyline positions={trail.map(toLatLngTuple)} pathOptions={{ color: '#059669', weight: 4, opacity: 0.85 }} />
      )}

      {v && (
        <Marker position={toLatLngTuple(v)} icon={vendorIcon}>
          <Popup>
            <strong>{v.name ?? 'Pickup'}</strong>
            {v.address && <div>{v.address}</div>}
          </Popup>
        </Marker>
      )}
      {d && (
        <Marker position={toLatLngTuple(d)} icon={destinationIcon}>
          <Popup>
            <strong>Delivery location</strong>
            {d.label && <div>{d.label}</div>}
          </Popup>
        </Marker>
      )}
      {s && (
        <Marker position={toLatLngTuple(s)} icon={customerIcon}>
          <Popup>{s.label ?? 'You'}</Popup>
        </Marker>
      )}
      {r && (
        <Marker position={toLatLngTuple(r)} icon={riderIcon} zIndexOffset={1000}>
          <Popup>
            <strong>{r.name ?? 'Rider'}</strong>
            {r.updated_at && <div>Updated {formatTime(r.updated_at)}</div>}
          </Popup>
        </Marker>
      )}

      <MapControl>
        <RecenterButton points={points} />
        {r && (
          <button
            type="button"
            onClick={() => setFollow((f) => !f)}
            aria-pressed={follow}
            title={follow ? 'Stop following rider' : 'Follow rider'}
            aria-label={follow ? 'Stop following rider' : 'Follow rider'}
            className={`flex h-9 w-9 items-center justify-center rounded-lg border shadow ${
              follow ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Crosshair className="h-4 w-4" />
          </button>
        )}
      </MapControl>
    </BaseMap>
  );
}

export function MapLegend({ items }: { items: ('vendor' | 'destination' | 'rider' | 'you')[] }) {
  const meta = {
    vendor: { color: 'bg-violet-600', label: 'Pickup (shop)' },
    destination: { color: 'bg-blue-600', label: 'Delivery location' },
    rider: { color: 'bg-emerald-600', label: 'Rider (live)' },
    you: { color: 'bg-sky-500', label: 'You' },
  };
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
      {items.map((k) => (
        <li key={k} className="flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-full ${meta[k].color}`} aria-hidden />
          {meta[k].label}
        </li>
      ))}
    </ul>
  );
}
