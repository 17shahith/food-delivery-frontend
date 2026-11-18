import { useEffect, useRef, type ReactNode } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { LatLng } from '@/types';
import { cn } from '@/utils/cn';

export const toLatLngTuple = (p: LatLng): [number, number] => [p.latitude, p.longitude];

export function BaseMap({
  center,
  zoom = 14,
  className,
  children,
  scrollWheelZoom = true,
}: {
  center: LatLng;
  zoom?: number;
  className?: string;
  children?: ReactNode;
  scrollWheelZoom?: boolean;
}) {
  return (
    <div className={cn('relative isolate overflow-hidden rounded-2xl border border-slate-200 bg-slate-50', className)}>
      <MapContainer
        center={toLatLngTuple(center)}
        zoom={zoom}
        scrollWheelZoom={scrollWheelZoom}
        className="h-full w-full"
        attributionControl
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={20}
        />
        <InvalidateOnResize />
        {children}
      </MapContainer>
    </div>
  );
}

/** Leaflet needs a size recalculation when its container is resized (e.g. sidebar toggles). */
function InvalidateOnResize() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [map]);
  return null;
}

/**
 * Fits the view to the given points whenever `fitKey` changes
 * (not on every point update — that would fight the user's panning).
 */
export function FitToPoints({ points, fitKey, maxZoom = 16 }: { points: LatLng[]; fitKey: string; maxZoom?: number }) {
  const map = useMap();
  const pointsRef = useRef(points);
  pointsRef.current = points;
  useEffect(() => {
    const pts = pointsRef.current;
    if (!pts.length) return;
    if (pts.length === 1) {
      map.setView(toLatLngTuple(pts[0]!), Math.min(maxZoom, 15));
      return;
    }
    map.fitBounds(L.latLngBounds(pts.map(toLatLngTuple)), { padding: [48, 48], maxZoom });
  }, [fitKey, map, maxZoom]);
  return null;
}

/** Keeps the map centred on a moving point. */
export function FollowPoint({ point, enabled }: { point: LatLng | null; enabled: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (enabled && point) map.panTo(toLatLngTuple(point), { animate: true });
  }, [enabled, point?.latitude, point?.longitude, map]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** Imperative map access for overlay buttons rendered inside the MapContainer. */
export function MapControl({ children, position = 'topright' }: { children: ReactNode; position?: 'topright' | 'bottomright' | 'topleft' }) {
  const pos = {
    topright: 'right-3 top-3',
    bottomright: 'bottom-6 right-3',
    topleft: 'left-14 top-3',
  }[position];
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Leaflet listens natively on the container, so React's stopPropagation is too late.
    if (ref.current) {
      L.DomEvent.disableClickPropagation(ref.current);
      L.DomEvent.disableScrollPropagation(ref.current);
    }
  }, []);
  return (
    <div ref={ref} className={cn('absolute z-[500] flex flex-col gap-2', pos)}>
      {children}
    </div>
  );
}
