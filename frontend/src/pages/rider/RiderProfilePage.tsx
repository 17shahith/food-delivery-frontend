import { useEffect, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { useAsync } from '@/hooks/useAsync';
import { riderService } from '@/services/riderService';
import {
  ApprovalBadge,
  Button,
  Card,
  CardBody,
  CardHeader,
  DescriptionList,
  ErrorState,
  Input,
  PageHeader,
  Select,
  Skeleton,
} from '@/components/ui';
import { AccountDetailsCard, ChangePasswordCard } from '@/components/profile/AccountCards';
import { ApprovalNotice } from '@/components/ApprovalNotice';
import { getErrorMessage } from '@/utils/errors';
import { VEHICLE_TYPES } from '@/utils/constants';
import type { VehicleType } from '@/types';

export default function RiderProfilePage() {
  const profile = useAsync(() => riderService.me(), []);
  const [vehicleType, setVehicleType] = useState<VehicleType>('scooter');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile.data) {
      setVehicleType(profile.data.vehicle_type);
      setVehicleNumber(profile.data.vehicle_number ?? '');
    }
  }, [profile.data]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (vehicleType !== 'bicycle' && !vehicleNumber.trim()) {
      setError('Vehicle number is required.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const updated = await riderService.updateMe({ vehicle_type: vehicleType, vehicle_number: vehicleNumber.trim() });
      profile.setData(updated);
      toast.success('Vehicle details saved');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rider profile"
        description="Your account and vehicle details."
        actions={profile.data && <ApprovalBadge status={profile.data.approval_status} />}
      />
      <ApprovalNotice status={profile.data?.approval_status} />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <AccountDetailsCard />
          <ChangePasswordCard />
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Vehicle" />
            <CardBody>
              {profile.loading ? (
                <Skeleton className="h-32 w-full" />
              ) : profile.error ? (
                <ErrorState message={profile.error} onRetry={() => void profile.reload()} />
              ) : (
                <form onSubmit={onSubmit} className="space-y-4" noValidate>
                  <Select
                    label="Vehicle type"
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value as VehicleType)}
                    options={VEHICLE_TYPES.map((v) => ({ value: v.value, label: v.label }))}
                  />
                  <Input
                    label="Vehicle number"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    error={error}
                    required={vehicleType !== 'bicycle'}
                  />
                  <div className="flex justify-end">
                    <Button type="submit" loading={saving}>
                      Save vehicle
                    </Button>
                  </div>
                </form>
              )}
            </CardBody>
          </Card>
          {profile.data && (
            <Card>
              <CardHeader title="Performance" />
              <CardBody>
                <DescriptionList
                  items={[
                    { label: 'Total deliveries', value: profile.data.total_deliveries ?? 0 },
                    { label: 'Rating', value: profile.data.rating != null ? profile.data.rating.toFixed(1) : 'No ratings yet' },
                    { label: 'Status', value: profile.data.is_online ? 'Online' : 'Offline' },
                  ]}
                />
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
