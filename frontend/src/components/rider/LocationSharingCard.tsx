import { Radio, RadioTower } from 'lucide-react';
import { useLocationSharing } from '@/contexts/LocationSharingContext';
import { Card, CardBody, Toggle } from '@/components/ui';
import { timeAgo } from '@/utils/format';
import { cn } from '@/utils/cn';

export function LocationSharingCard({ compact }: { compact?: boolean }) {
  const { sharing, start, stop, position, lastSentAt, error } = useLocationSharing();
  return (
    <Card className={cn(sharing ? 'border-emerald-200' : 'border-amber-200')}>
      <CardBody className="flex items-start gap-4">
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            sharing ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
          )}
        >
          {sharing ? <RadioTower className="h-5 w-5" aria-hidden /> : <Radio className="h-5 w-5" aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-slate-900">{sharing ? 'Sharing live location' : 'Live location is off'}</p>
          <p className="text-sm text-slate-500">
            {sharing
              ? lastSentAt
                ? `Last update sent ${timeAgo(new Date(lastSentAt))}${position?.accuracy ? ` · ±${Math.round(position.accuracy)} m` : ''}`
                : 'Waiting for GPS fix…'
              : 'Customers and the shop can’t see where you are.'}
          </p>
          {!compact && error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
        <Toggle checked={sharing} onChange={(on) => (on ? start() : stop())} label="Share live location" />
      </CardBody>
    </Card>
  );
}
