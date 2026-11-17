import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bike } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { useDebounce } from '@/hooks/useDebounce';
import { adminService } from '@/services/adminService';
import { ApprovalBadge, Avatar, Badge, EmptyState, ErrorState, PageHeader, SearchInput, SkeletonList, Tabs } from '@/components/ui';
import { DataGrid } from '@/components/admin/DataGrid';
import { ActiveToggleButton, ApprovalActions } from '@/components/admin/ApprovalActions';
import { VEHICLE_TYPES } from '@/utils/constants';
import type { ApprovalStatus, RiderProfile } from '@/types';

type Tab = '' | ApprovalStatus;

export default function RiderManagementPage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('status') ?? '') as Tab;
  const [search, setSearch] = useState('');
  const q = useDebounce(search);
  const riders = useAsync(() => adminService.riders({ search: q || undefined, status: tab || undefined }), [q, tab]);

  const patch = (id: string, next: Partial<RiderProfile>) =>
    riders.setData((prev) => prev?.map((r) => (r.id === id ? { ...r, ...next } : r)));

  const decide = async (r: RiderProfile, approved: boolean, reason?: string) => {
    const updated = await adminService.setRiderApproval(r.id, approved, reason);
    patch(r.id, { approval_status: updated.approval_status ?? (approved ? 'approved' : 'rejected') });
  };

  const setActive = async (r: RiderProfile, is_active: boolean) => {
    if (!r.user) return;
    await adminService.setUserActive(r.user.id, is_active);
    patch(r.id, { user: { ...r.user, is_active } });
  };

  const vehicleLabel = (v: string) => VEHICLE_TYPES.find((x) => x.value === v)?.label ?? v;

  return (
    <div>
      <PageHeader title="Riders" description="Approve new riders and manage the delivery fleet." />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs<Tab>
          value={tab}
          onChange={(t) => setParams(t ? { status: t } : {}, { replace: true })}
          tabs={[
            { value: '', label: 'All' },
            { value: 'pending', label: 'Pending' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
          ]}
        />
        <SearchInput value={search} onChange={setSearch} placeholder="Search name, phone, vehicle…" className="sm:w-72" />
      </div>
      {riders.loading ? (
        <SkeletonList rows={6} />
      ) : riders.error ? (
        <ErrorState message={riders.error} onRetry={() => void riders.reload()} />
      ) : !riders.data?.length ? (
        <EmptyState icon={<Bike className="h-6 w-6" />} title={tab === 'pending' ? 'No pending applications' : 'No riders found'} />
      ) : (
        <DataGrid
          rows={riders.data}
          rowKey={(r) => r.id}
          columns={[
            {
              key: 'rider',
              header: 'Rider',
              render: (r) => (
                <div className="flex items-center gap-3">
                  <Avatar name={r.user?.full_name} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{r.user?.full_name ?? 'Rider'}</p>
                    <p className="truncate text-xs text-slate-500">{r.user?.phone ?? r.user?.email}</p>
                  </div>
                </div>
              ),
            },
            {
              key: 'vehicle',
              header: 'Vehicle',
              hideOnMobile: true,
              render: (r) => (
                <span className="text-slate-700">
                  {vehicleLabel(r.vehicle_type)}
                  {r.vehicle_number && <span className="block text-xs text-slate-500">{r.vehicle_number}</span>}
                </span>
              ),
            },
            {
              key: 'online',
              header: 'Availability',
              render: (r) => (
                <Badge tone={r.is_online ? 'green' : 'gray'} dot>
                  {r.is_online ? 'Online' : 'Offline'}
                </Badge>
              ),
            },
            { key: 'deliveries', header: 'Deliveries', align: 'right', hideOnMobile: true, render: (r) => r.total_deliveries ?? 0 },
            { key: 'approval', header: 'Approval', render: (r) => <ApprovalBadge status={r.approval_status} /> },
            {
              key: 'actions',
              header: '',
              align: 'right',
              render: (r) => (
                <div className="flex items-center justify-end gap-2">
                  {r.user && (
                    <ActiveToggleButton active={r.user.is_active} name={r.user.full_name} onToggle={(v) => setActive(r, v)} />
                  )}
                  <ApprovalActions status={r.approval_status} name={r.user?.full_name ?? 'Rider'} onDecide={(a, reason) => decide(r, a, reason)} />
                </div>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
