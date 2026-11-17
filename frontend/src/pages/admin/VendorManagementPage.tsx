import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Store } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { useDebounce } from '@/hooks/useDebounce';
import { adminService } from '@/services/adminService';
import {
  ApprovalBadge,
  Badge,
  DescriptionList,
  EmptyState,
  ErrorState,
  ImageWithFallback,
  Modal,
  PageHeader,
  SearchInput,
  SkeletonList,
  Tabs,
} from '@/components/ui';
import { DataGrid } from '@/components/admin/DataGrid';
import { ActiveToggleButton, ApprovalActions } from '@/components/admin/ApprovalActions';
import { DeliveryMap } from '@/components/maps/DeliveryMap';
import { formatCurrency, formatDate } from '@/utils/format';
import type { ApprovalStatus, Vendor } from '@/types';

type Tab = '' | ApprovalStatus;

export default function VendorManagementPage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('status') ?? '') as Tab;
  const [search, setSearch] = useState('');
  const q = useDebounce(search);
  const vendors = useAsync(() => adminService.vendors({ search: q || undefined, status: tab || undefined }), [q, tab]);
  const [selected, setSelected] = useState<Vendor | null>(null);

  const patch = (id: string, next: Partial<Vendor>) => {
    vendors.setData((prev) => prev?.map((v) => (v.id === id ? { ...v, ...next } : v)));
    setSelected((s) => (s && s.id === id ? { ...s, ...next } : s));
  };

  const decide = async (v: Vendor, approved: boolean, reason?: string) => {
    const updated = await adminService.setVendorApproval(v.id, approved, reason);
    patch(v.id, { approval_status: updated.approval_status ?? (approved ? 'approved' : 'rejected') });
  };

  const setActive = async (v: Vendor, is_active: boolean) => {
    if (!v.owner) return;
    await adminService.setUserActive(v.owner.id, is_active);
    patch(v.id, { owner: { ...v.owner, is_active } });
  };

  return (
    <div>
      <PageHeader title="Vendors" description="Review applications and manage stores." />
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
        <SearchInput value={search} onChange={setSearch} placeholder="Search store or owner…" className="sm:w-72" />
      </div>
      {vendors.loading ? (
        <SkeletonList rows={6} />
      ) : vendors.error ? (
        <ErrorState message={vendors.error} onRetry={() => void vendors.reload()} />
      ) : !vendors.data?.length ? (
        <EmptyState icon={<Store className="h-6 w-6" />} title={tab === 'pending' ? 'No pending applications' : 'No vendors found'} />
      ) : (
        <DataGrid
          rows={vendors.data}
          rowKey={(v) => v.id}
          onRowClick={setSelected}
          columns={[
            {
              key: 'store',
              header: 'Store',
              render: (v) => (
                <div className="flex items-center gap-3">
                  <ImageWithFallback src={v.logo_url} alt="" className="h-9 w-9 shrink-0 rounded-lg" fallbackIcon={<Store className="h-4 w-4" />} />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{v.name}</p>
                    <p className="truncate text-xs text-slate-500">{v.category}</p>
                  </div>
                </div>
              ),
            },
            {
              key: 'owner',
              header: 'Owner',
              hideOnMobile: true,
              render: (v) => (
                <div className="min-w-0">
                  <p className="truncate text-slate-700">{v.owner?.full_name ?? '—'}</p>
                  <p className="truncate text-xs text-slate-500">{v.owner?.email}</p>
                </div>
              ),
            },
            { key: 'approval', header: 'Approval', render: (v) => <ApprovalBadge status={v.approval_status} /> },
            {
              key: 'account',
              header: 'Account',
              hideOnMobile: true,
              render: (v) => (
                <Badge tone={v.owner?.is_active === false ? 'gray' : 'green'}>{v.owner?.is_active === false ? 'Deactivated' : 'Active'}</Badge>
              ),
            },
            {
              key: 'actions',
              header: '',
              align: 'right',
              render: (v) => <ApprovalActions status={v.approval_status} name={v.name} onDecide={(a, r) => decide(v, a, r)} />,
            },
          ]}
        />
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name ?? ''} description={selected?.category} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <ApprovalBadge status={selected.approval_status} />
              <Badge tone={selected.is_open ? 'green' : 'gray'}>{selected.is_open ? 'Open' : 'Closed'}</Badge>
            </div>
            <DescriptionList
              items={[
                { label: 'Owner', value: selected.owner?.full_name ?? '—' },
                { label: 'Email', value: selected.owner?.email ?? '—' },
                { label: 'Phone', value: selected.phone ?? selected.owner?.phone ?? '—' },
                { label: 'Address', value: selected.address },
                { label: 'Delivery fee', value: formatCurrency(selected.delivery_fee) },
                { label: 'Registered', value: formatDate(selected.created_at) },
              ]}
            />
            <DeliveryMap vendor={selected} className="h-56" />
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
              {selected.owner && (
                <ActiveToggleButton
                  active={selected.owner.is_active}
                  name={selected.owner.full_name}
                  onToggle={(v) => setActive(selected, v)}
                />
              )}
              <ApprovalActions status={selected.approval_status} name={selected.name} onDecide={(a, r) => decide(selected, a, r)} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
