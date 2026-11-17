import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { trackingService } from '@/services/trackingService';
import { geolocationErrorMessage } from '@/hooks/useCurrentLocation';
import { haversineKm } from '@/utils/geo';
import type { LatLng } from '@/types';

/** Minimum time between uploads, and minimum movement that forces an upload. */
export const SEND_INTERVAL_MS = 5000;
export const MIN_MOVE_METERS = 15;
const HEARTBEAT_MS = 30000;

interface Position extends LatLng {
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

interface LocationSharingValue {
  sharing: boolean;
  position: Position | null;
  error: string | null;
  lastSentAt: number | null;
  sentCount: number;
  activeOrderId: string | null;
  start: () => void;
  stop: () => void;
  setActiveOrderId: (id: string | null) => void;
}

const LocationSharingContext = createContext<LocationSharingValue | undefined>(undefined);

/**
 * Keeps the rider's GPS stream alive across rider pages. Positions are throttled
 * (time + distance) before being posted to the backend, which writes them to the
 * `rider_locations` table that customers/admins subscribe to via Supabase Realtime.
 */
export function LocationSharingProvider({ children }: { children: ReactNode }) {
  const [sharing, setSharing] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSentAt, setLastSentAt] = useState<number | null>(null);
  const [sentCount, setSentCount] = useState(0);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  const watchId = useRef<number | null>(null);
  const lastSent = useRef<{ at: number; pos: LatLng } | null>(null);
  const inFlight = useRef(false);
  const orderRef = useRef<string | null>(null);
  orderRef.current = activeOrderId;

  const send = useCallback(async (p: Position, force = false) => {
    const prev = lastSent.current;
    const now = Date.now();
    if (!force && prev) {
      const moved = haversineKm(prev.pos, p) * 1000;
      const elapsed = now - prev.at;
      if (elapsed < SEND_INTERVAL_MS) return;
      if (moved < MIN_MOVE_METERS && elapsed < HEARTBEAT_MS) return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      await trackingService.sendLocation({
        latitude: p.latitude,
        longitude: p.longitude,
        accuracy: p.accuracy,
        heading: p.heading,
        speed: p.speed,
        order_id: orderRef.current,
      });
      lastSent.current = { at: now, pos: p };
      setLastSentAt(now);
      setSentCount((c) => c + 1);
      setError(null);
    } catch {
      setError('Could not upload your location. Retrying…');
    } finally {
      inFlight.current = false;
    }
  }, []);

  const stop = useCallback(() => {
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    lastSent.current = null;
    setSharing(false);
  }, []);

  const start = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported on this device.');
      toast.error('Geolocation is not supported on this device.');
      return;
    }
    if (watchId.current != null) return;
    setError(null);
    setSharing(true);
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const p: Position = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
          heading: pos.coords.heading ?? null,
          speed: pos.coords.speed ?? null,
          timestamp: pos.timestamp,
        };
        setPosition(p);
        void send(p);
      },
      (err) => {
        const msg = geolocationErrorMessage(err);
        setError(msg);
        if (err.code === err.PERMISSION_DENIED) {
          toast.error(msg);
          stop();
        }
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 },
    );
  }, [send, stop]);

  // Push an immediate update when the active order changes so customers see the rider right away.
  useEffect(() => {
    if (sharing && position) void send(position, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrderId]);

  useEffect(() => () => stop(), [stop]);

  const value = useMemo<LocationSharingValue>(
    () => ({ sharing, position, error, lastSentAt, sentCount, activeOrderId, start, stop, setActiveOrderId }),
    [sharing, position, error, lastSentAt, sentCount, activeOrderId, start, stop],
  );

  return <LocationSharingContext.Provider value={value}>{children}</LocationSharingContext.Provider>;
}

export function useLocationSharing(): LocationSharingValue {
  const ctx = useContext(LocationSharingContext);
  if (!ctx) throw new Error('useLocationSharing must be used within LocationSharingProvider');
  return ctx;
}
