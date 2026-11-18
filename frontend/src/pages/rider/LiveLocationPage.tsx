import { Circle, Marker } from 'react-leaflet';
import { Gauge, LocateFixed, Navigation, Radio, Send } from 'lucide-react';
import { useLocationSharing, MIN_MOVE_METERS, SEND_INTERVAL_MS } from '@/contexts/LocationSharingContext';
import { Alert, Button, Card, CardBody, CardHeader, DescriptionList, PageHeader } from '@/components/ui';
import { BaseMap, FollowPoint, toLatLngTuple } from '@/components/maps/BaseMap';
import { riderIcon } from '@/components/maps/mapIcons';
import { formatTime, shortId, timeAgo } from '@/utils/format';
import { isSupabaseConfigured } from '@/services/supabase';

export default function LiveLocationPage() {
  const { sharing, start, stop, position, error, lastSentAt, sentCount, activeOrderId } = useLocationSharing();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live location sharing"
        description="Your GPS position is sent securely while sharing is on, so customers and shops can follow the delivery."
        actions={
          sharing ? (
            <Button variant="danger" leftIcon={<Radio className="h-4 w-4" />} onClick={stop}>
              Stop sharing
            </Button>
          ) : (
            <Button leftIcon={<LocateFixed className="h-4 w-4" />} onClick={start}>
              Start sharing
            </Button>
          )
        }
      />

      {error && <Alert tone="error">{error}</Alert>}
      {!isSupabaseConfigured && (
        <Alert tone="info">Realtime isn't configured, so viewers receive your position by polling every few seconds.</Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardBody>
            {position ? (
              <BaseMap center={position} zoom={16} className="h-[420px]">
                <FollowPoint point={position} enabled />
                {position.accuracy != null && (
                  <Circle
                    center={toLatLngTuple(position)}
                    radius={position.accuracy}
                    pathOptions={{ color: '#8A72C2', fillColor: '#B7A5DB', fillOpacity: 0.12, weight: 1 }}
                  />
                )}
                <Marker position={toLatLngTuple(position)} icon={riderIcon} />
              </BaseMap>
            ) : (
              <div className="flex h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-center">
                <Navigation className="h-8 w-8 text-slate-400" aria-hidden />
                <p className="mt-3 font-medium text-slate-700">{sharing ? 'Getting a GPS fix…' : 'Location sharing is off'}</p>
                <p className="mt-1 max-w-xs text-sm text-slate-500">
                  {sharing ? 'Make sure location services are enabled.' : 'Start sharing to see your position on the map.'}
                </p>
              </div>
            )}
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Status" />
            <CardBody>
              <DescriptionList
                items={[
                  {
                    label: 'Sharing',
                    value: (
                      <span className={sharing ? 'text-emerald-700' : 'text-slate-500'}>{sharing ? 'Active' : 'Off'}</span>
                    ),
                  },
                  { label: 'Linked delivery', value: activeOrderId ? shortId(activeOrderId) : 'None' },
                  { label: 'Latitude', value: position ? position.latitude.toFixed(6) : '—' },
                  { label: 'Longitude', value: position ? position.longitude.toFixed(6) : '—' },
                  { label: 'Accuracy', value: position?.accuracy != null ? `±${Math.round(position.accuracy)} m` : '—' },
                  {
                    label: 'Speed',
                    value: position?.speed != null ? `${(position.speed * 3.6).toFixed(1)} km/h` : '—',
                  },
                  { label: 'GPS fix', value: position ? formatTime(new Date(position.timestamp)) : '—' },
                  { label: 'Last upload', value: lastSentAt ? timeAgo(new Date(lastSentAt)) : '—' },
                  { label: 'Updates sent', value: sentCount },
                ]}
              />
            </CardBody>
          </Card>
          <Card>
            <CardBody className="space-y-2 text-sm text-slate-600">
              <p className="flex items-center gap-2 font-medium text-slate-900">
                <Gauge className="h-4 w-4" aria-hidden /> Battery-friendly updates
              </p>
              <p>
                Updates are sent at most every {SEND_INTERVAL_MS / 1000}s, and only when you've moved more than {MIN_MOVE_METERS} m
                (plus a periodic heartbeat).
              </p>
              <p className="flex items-center gap-2 pt-1 text-xs text-slate-500">
                <Send className="h-3.5 w-3.5" aria-hidden /> Keep this app open during deliveries for continuous tracking.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
