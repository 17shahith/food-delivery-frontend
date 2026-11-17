import { useState } from 'react';
import { Users } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { useDebounce } from '@/hooks/useDebounce';
import { adminService } from '@/services/adminService';
import { Avatar, Badge, EmptyState, ErrorState, PageHeader, SearchInput, Select, SkeletonList } from '@/components/ui';
import { DataGrid } from '@/components/admin/DataGrid';
import { ActiveToggleButton } from '@/components/admin/ApprovalActions';
import { formatDate } from '@/utils/format';
import type { User } from '@/types';

export default function CustomerManagementPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const q = useDebounce(search);
  const users = useAsync(() => adminService.users('customer', { search: q || undefined, status: status || undefined }), [q, status]);

  const setActive = async (u: User, is_active: boolean) => {
    const updated = await adminService.setUserActive(u.id, is_active);
    users.setData((prev) => prev?.map((x) => (x.id === u.id ? { ...x, ...updated } : x)));
  };

  return (
    <div>
      <PageHeader title="Customers" description={users.data ? `${users.data.length} customers` : 'Manage customer accounts.'} />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <SearchInput value={search} onChange={setSearch} placeholder="Search name, email or phone…" className="sm:w-80" />
        <Select
          aria-label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          placeholder="All statuses"
          options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Deactivated' },
          ]}
          wrapperClassName="sm:w-44"
        />
      </div>
      {users.loading ? (
        <SkeletonList rows={6} />
      ) : users.error ? (
        <ErrorState message={users.error} onRetry={() => void users.reload()} />
      ) : !users.data?.length ? (
        <EmptyState icon={<Users className="h-6 w-6" />} title="No customers found" />
      ) : (
        <DataGrid
          rows={users.data}
          rowKey={(u) => u.id}
          columns={[
            {
              key: 'name',
              header: 'Customer',
              render: (u) => (
                <div className="flex items-center gap-3">
                  <Avatar name={u.full_name} src={u.avatar_url} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{u.full_name}</p>
                    <p className="truncate text-xs text-slate-500">{u.email}</p>
                  </div>
                </div>
              ),
            },
            { key: 'phone', header: 'Phone', render: (u) => u.phone ?? '—', hideOnMobile: true },
            { key: 'joined', header: 'Joined', render: (u) => formatDate(u.created_at), hideOnMobile: true },
            {
              key: 'status',
              header: 'Status',
              render: (u) => (
                <Badge tone={u.is_active ? 'green' : 'gray'} dot>
                  {u.is_active ? 'Active' : 'Deactivated'}
                </Badge>
              ),
            },
            {
              key: 'actions',
              header: '',
              align: 'right',
              render: (u) => <ActiveToggleButton active={u.is_active} name={u.full_name} onToggle={(v) => setActive(u, v)} />,
            },
          ]}
        />
      )}
    </div>
  );
}
