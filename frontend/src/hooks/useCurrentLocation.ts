import { useCallback, useState } from 'react';
import type { LatLng } from '@/types';
import { env } from '@/utils/env';
import { storage, STORAGE_KEYS } from '@/utils/storage';

export interface CurrentLocation {
  location: LatLng;
  /** true when the location came from the browser (vs. default / saved). */
  isPrecise: boolean;
  locating: boolean;
  error: string | null;
  locate: () => Promise<LatLng | null>;
  setLocation: (loc: LatLng) => void;
}

export function geolocationErrorMessage(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return 'Location permission denied. Enable it in your browser settings.';
    case err.POSITION_UNAVAILABLE:
      return 'Your location is currently unavailable.';
    case err.TIMEOUT:
      return 'Timed out while getting your location.';
    default:
      return 'Could not get your location.';
  }
}

/** One-shot browser location with a persisted fallback (last known or env default). */
export function useCurrentLocation(): CurrentLocation {
  const saved = storage.get<LatLng | null>(STORAGE_KEYS.location, null);
  const [location, setLoc] = useState<LatLng>(saved ?? { latitude: env.defaultLat, longitude: env.defaultLng });
  const [isPrecise, setPrecise] = useState(Boolean(saved));
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setLocation = useCallback((loc: LatLng) => {
    setLoc(loc);
    setPrecise(true);
    storage.set(STORAGE_KEYS.location, loc);
  }, []);

  const locate = useCallback(
    () =>
      new Promise<LatLng | null>((resolve) => {
        if (!('geolocation' in navigator)) {
          setError('Geolocation is not supported by this browser.');
          resolve(null);
          return;
        }
        setLocating(true);
        setError(null);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
            setLocation(loc);
            setLocating(false);
            resolve(loc);
          },
          (err) => {
            setError(geolocationErrorMessage(err));
            setLocating(false);
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
        );
      }),
    [setLocation],
  );

  return { location, isPrecise, locating, error, locate, setLocation };
}
