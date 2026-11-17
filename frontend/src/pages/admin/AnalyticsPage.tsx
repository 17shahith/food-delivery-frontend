import { useMemo, useState, type ReactNode } from 'react';
import { BarChart3, Clock, ShoppingBag, Table2, Wallet } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { adminService } from '@/services/adminService';
import { Button, Card, CardBody, CardHeader, EmptyState, ErrorState, PageHeader, Select, StatCard } from '@/components/ui';
import { BarChart, BarList, DataTable, LineChart, type Datum } from '@/components/charts/Charts';
import { STATUS_META } from '@/utils/orderStatus';
import { formatCurrency, formatMinutes } from '@/utils/format';

function ChartCard({
  title,
  description,
  data,
  valueHeader,
  formatValue,
  children,
}: {
  title: string;
  description?: string;
  data: Datum[];
  valueHeader: string;
  formatValue: (v: number) => string;
  children: ReactNode;
}) {
  const [table, setTable] = useState(false);
  return (
    <Card>
      <CardHeader
        title={title}
        description={description}
        action={
          <Button
            size="sm"
            variant="ghost"
            leftIcon={table ? <BarChart3 className="h-4 w-4" /> : <Table2 className="h-4 w-4" />}
            onClick={() => setTable((t) => !t)}
            aria-pressed={table}
          >
            {table ? 'Chart' : 'Table'}
          </Button>
        }
      />
      <CardBody>
        {!data.length ? (
          <EmptyState title="No data for this period" />
        ) : table ? (
          <DataTable data={data} labelHeader="Item" valueHeader={valueHeader} formatValue={formatValue} />
        ) : (
          children
        )}
      </CardBody>
    </Card>
  );
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const analytics = useAsync(() => adminService.analytics(days), [days]);
  const a = analytics.data;

  const { orders, revenue, statuses, vendors, totals } = useMemo(() => {
    const daily = a?.daily ?? [];
    const fmt = (d: string, long = false) =>
      new Date(d).toLocaleDateString(undefined, long ? { weekday: 'short', day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short' });
    return {
      orders: daily.map((d) => ({ label: fmt(d.date), title: fmt(d.date, true), value: d.orders })),
      revenue: daily.map((d) => ({ label: fmt(d.date), title: fmt(d.date, true), value: Number(d.revenue) })),
      statuses: [...(a?.status_breakdown ?? [])]
        .sort((x, y) => y.count - x.count)
        .map((s) => ({ label: STATUS_META[s.status]?.label ?? s.status, value: s.count })),
      vendors: (a?.top_vendors ?? []).map((v) => ({ label: v.name, value: Number(v.revenue), title: `${v.name} (${v.orders} orders)` })),
      totals: {
        orders: daily.reduce((s, d) => s + d.orders, 0),
        revenue: daily.reduce((s, d) => s + Number(d.revenue), 0),
      },
    };
  }, [a]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Platform performance over time."
        actions={
          <Select
            aria-label="Date range"
            value={String(days)}
            onChange={(e) => setDays(Number(e.target.value))}
            options={[
              { value: '7', label: 'Last 7 days' },
              { value: '30', label: 'Last 30 days' },
              { value: '90', label: 'Last 90 days' },
            ]}
            wrapperClassName="w-40"
          />
        }
      />

      {analytics.error ? (
        <ErrorState message={analytics.error} onRetry={() => void analytics.reload()} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Orders" value={totals.orders.toLocaleString()} icon={<ShoppingBag className="h-5 w-5" />} loading={analytics.loading} />
            <StatCard label="Revenue" value={formatCurrency(totals.revenue)} icon={<Wallet className="h-5 w-5" />} tone="blue" loading={analytics.loading} />
            <StatCard
              label="Avg. order value"
              value={formatCurrency(totals.orders ? totals.revenue / totals.orders : 0)}
              tone="violet"
              loading={analytics.loading}
            />
            <StatCard
              label="Avg. delivery time"
              value={a?.avg_delivery_minutes != null ? formatMinutes(a.avg_delivery_minutes) : '—'}
              icon={<Clock className="h-5 w-5" />}
              tone="amber"
              loading={analytics.loading}
            />
          </div>

          {analytics.loading ? (
            <div className="grid gap-6 lg:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-[300px] animate-pulse rounded-2xl bg-slate-200/60" />
              ))}
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <ChartCard title="Orders per day" data={orders} valueHeader="Orders" formatValue={(v) => `${v}`}>
                <BarChart data={orders} ariaLabel="Orders per day" formatValue={(v) => `${v} orders`} />
              </ChartCard>
              <ChartCard title="Revenue per day" data={revenue} valueHeader="Revenue" formatValue={formatCurrency}>
                <LineChart data={revenue} ariaLabel="Revenue per day" formatValue={formatCurrency} />
              </ChartCard>
              <ChartCard title="Orders by status" description="Share of orders in this period" data={statuses} valueHeader="Orders" formatValue={(v) => `${v}`}>
                <BarList data={statuses} formatValue={(v) => v.toLocaleString()} />
              </ChartCard>
              <ChartCard title="Top vendors" description="By revenue" data={vendors} valueHeader="Revenue" formatValue={formatCurrency}>
                <BarList data={vendors} formatValue={formatCurrency} />
              </ChartCard>
            </div>
          )}
        </>
      )}
    </div>
  );
}
