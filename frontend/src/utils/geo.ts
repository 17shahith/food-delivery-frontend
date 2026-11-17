import type { LatLng } from '@/types';

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in kilometres between two coordinates. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Rough road-distance factor applied on top of straight-line distance. */
export const ROAD_FACTOR = 1.3;
/** Average urban two-wheeler speed in km/h, used for ETA estimates. */
export const AVG_SPEED_KMH = 22;

export function estimateEtaMinutes(distanceKm: number, speedKmh = AVG_SPEED_KMH): number {
  if (distanceKm <= 0) return 0;
  return ((distanceKm * ROAD_FACTOR) / speedKmh) * 60;
}

export function isValidCoord(p: Partial<LatLng> | null | undefined): p is LatLng {
  return (
    !!p &&
    typeof p.latitude === 'number' &&
    typeof p.longitude === 'number' &&
    Number.isFinite(p.latitude) &&
    Number.isFinite(p.longitude) &&
    Math.abs(p.latitude) <= 90 &&
    Math.abs(p.longitude) <= 180
  );
}

export function directionsUrl(to: LatLng, from?: LatLng | null): string {
  const dest = `${to.latitude},${to.longitude}`;
  if (from) {
    return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${from.latitude},${from.longitude};${dest}`;
  }
  return `https://www.openstreetmap.org/?mlat=${to.latitude}&mlon=${to.longitude}#map=16/${dest.replace(',', '/')}`;
}
