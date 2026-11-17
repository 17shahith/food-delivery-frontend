import { useEffect, useMemo, useRef } from 'react';
import { Marker, useMap, useMapEvents } from 'react-leaflet';
import type { Marker as LeafletMarker } from 'leaflet';
import { LocateFixed } from 'lucide-react';
import toast from 'react-hot-toast';
import type { LatLng } from '@/types';
import { env } from '@/utils/env';
import { isValidCoord } from '@/utils/geo';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import { Button } from '@/components/ui';
import { BaseMap, MapControl, toLatLngTuple } from './BaseMap';
import { pinIcon } from './mapIcons';

function ClickHandler({ onPick }: { onPick: (p: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onPick({ latitude: e.latlng.lat, longitude: e.latlng.lng });
    },
  });
  return null;
}

function PanTo({ point }: { point: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (point) map.panTo(toLatLngTuple(point));
  }, [point?.latitude, point?.longitude, map]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** Click or drag to choose a location; "Use my location" fills from GPS. */
export function LocationPicker({
  value,
  onChange,
  className = 'h-64',
}: {
  value: LatLng | null;
  onChange: (p: LatLng) => void;
  className?: string;
}) {
  const { locate, locating } = useCurrentLocation();
  const markerRef = useRef<LeafletMarker>(null);
  const valid = isValidCoord(value) ? value : null;
  const center = valid ?? { latitude: env.defaultLat, longitude: env.defaultLng };

  const handlers = useMemo(
    () => ({
      dragend() {
        const m = markerRef.current;
        if (m) {
          const ll = m.getLatLng();
          onChange({ latitude: ll.lat, longitude: ll.lng });
        }
      },
    }),
    [onChange],
  );

  return (
    <div className="space-y-2">
      <BaseMap center={center} zoom={valid ? 16 : 13} className={className}>
        <ClickHandler onPick={onChange} />
        <PanTo point={valid} />
        {valid && (
          <Marker position={toLatLngTuple(valid)} icon={pinIcon} draggable eventHandlers={handlers} ref={markerRef} />
        )}
        <MapControl>
          <Button
            size="sm"
            variant="outline"
            loading={locating}
            leftIcon={<LocateFixed className="h-4 w-4" />}
            onClick={async () => {
              const loc = await locate();
              if (loc) onChange(loc);
              else toast.error('Could not get your location. Tap the map instead.');
            }}
            className="shadow"
          >
            Use my location
          </Button>
        </MapControl>
      </BaseMap>
      <p className="text-xs text-slate-500">
        {valid
          ? `Pinned at ${valid.latitude.toFixed(5)}, ${valid.longitude.toFixed(5)} — drag the pin to adjust.`
          : 'Tap on the map to drop a pin.'}
      </p>
    </div>
  );
}
