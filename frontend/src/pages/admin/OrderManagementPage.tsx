import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardList, RefreshCw } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { useDebounce } from '@/hooks/useDebounce';
import { useOrderRealtime } from '@/hooks/useOrderRealtime';
import { adminService } from '@/services/adminService';
import { orderService } from '@/services/orderService';
import {
  Button,
  EmptyState,
  ErrorState,
  Modal,
  PageHeader,
  SearchInput,
  Select,
  Skeleton,
  SkeletonList,
  StatusBadge,
} from '@/components/ui';
import { DataGrid } from '@/components/admin/DataGrid';
import { OrderTimeline } from '@/components/orders/OrderTimeline';
import { OrderItemsList, OrderParties } from '@/components/orders/OrderSummary';
import { STATUS_META } from '@/utils/orderStatus';
import { formatCurrency, formatDateTime, orderLabel } from '@/utils/format';
import type { OrderStatus } from '@/types';

function OrderDetailModal({ orderId, onClose }: { orderId: string | null; onClose: () => void }) {
  const order = useAsync(() => orderService.get(orderId!), [orderId], !!orderId);
  const o = order.data;
  return (
    <Modal open={!!orderId} onClose={onClose} size="xl" title={o ? `Order ${orderLabel(o)}` : 'Order'} description={o ? formatDateTime(o.created_at) : undefined}>
      {order.loading ? (
        <Skeleton className="h-80 w-full" />
      ) : order.error || !o ? (
        <ErrorState message={order.error} onRetry={() => void order.reload()} />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-6">
            <StatusBadge status={o.status} />
            <OrderParties order={o} />
            <OrderItemsList order={o} />
          </div>
          <OrderTimeline status={o.status} history={o.status_history} />
        </div>
      )}
    </Modal>
  );
}

export default function OrderManagementPage() {
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [search, setSearch] = useState('');
  const q = useDebounce(search);
  const orders = useAsync(() => adminService.orders({ status, search: q || undefined }), [status, q]);
  const focus = params.get('focus');
  const [openId, setOpenId] = useState<string | null>(focus);

  useEffect(() => setOpenId(focus), [focus]);
  // Admins receive every order change allowed by RLS; refresh quietly.
  useOrderRealtime('*', () => void orders.reload(true), 20000);

  const sorted = useMemo(
    () => [...(orders.data ?? [])].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)),
    [orders.data],
  );

  const close = () => {
    setOpenId(null);
    if (focus) {
      params.delete('focus');
      setParams(params, { replace: true });
    }
  };

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Monitor every order across the platform."
        actions={
          <Button variant="outline" size="sm" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => void orders.reload()}>
            Refresh
          </Button>
        }
      />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <SearchInput value={search} onChange={setSearch} placeholder="Search order #, customer, shop…" className="sm:w-80" />
        <Select
          aria-label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as OrderStatus | '')}
          placeholder="All statuses"
          options={(Object.keys(STATUS_META) as OrderStatus[]).map((s) => ({ value: s, label: STATUS_META[s].label }))}
          wrapperClassName="sm:w-52"
        />
      </div>
      {orders.loading ? (
        <SkeletonList rows={6} />
      ) : orders.error ? (
        <ErrorState message={orders.error} onRetry={() => void orders.reload()} />
      ) : !sorted.length ? (
        <EmptyState icon={<ClipboardList className="h-6 w-6" />} title="No orders found" />
      ) : (
        <DataGrid
          rows={sorted}
          rowKey={(o) => o.id}
          onRowClick={(o) => setOpenId(o.id)}
          columns={[
            {
              key: 'order',
              header: 'Order',
              render: (o) => (
                <div>
                  <p className="font-medium text-slate-900">{orderLabel(o)}</p>
                  <p className="text-xs text-slate-500">{formatDateTime(o.created_at)}</p>
                </div>
              ),
            },
            { key: 'customer', header: 'Customer', render: (o) => o.customer?.full_name ?? '—' },
            { key: 'vendor', header: 'Shop', hideOnMobile: true, render: (o) => o.vendor?.name ?? '—' },
            { key: 'rider', header: 'Rider', hideOnMobile: true, render: (o) => o.rider?.full_name ?? <span className="text-slate-400">—</span> },
            { key: 'status', header: 'Status', render: (o) => <StatusBadge status={o.status} /> },
            { key: 'total', header: 'Total', align: 'right', render: (o) => <span className="tabular-nums">{formatCurrency(o.total)}</span> },
          ]}
        />
      )}
      <OrderDetailModal orderId={openId} onClose={close} />
    </div>
  );
}
