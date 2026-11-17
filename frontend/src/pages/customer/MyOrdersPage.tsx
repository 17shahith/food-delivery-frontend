import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/contexts/AuthContext';
import { useOrderRealtime } from '@/hooks/useOrderRealtime';
import { orderService } from '@/services/orderService';
import { Button, EmptyState, ErrorState, PageHeader, SkeletonList, Tabs } from '@/components/ui';
import { OrderCard } from '@/components/orders/OrderCard';
import { isActive } from '@/utils/orderStatus';

type Tab = 'active' | 'past';

export default function MyOrdersPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('active');
  const orders = useAsync(() => orderService.mine(), []);

  useOrderRealtime(user ? `customer_id=eq.${user.id}` : undefined, () => void orders.reload(true));

  const { active, past } = useMemo(() => {
    const list = [...(orders.data ?? [])].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    return { active: list.filter((o) => isActive(o.status)), past: list.filter((o) => !isActive(o.status)) };
  }, [orders.data]);

  const shown = tab === 'active' ? active : past;

  return (
    <div>
      <PageHeader title="My orders" description="Track current deliveries and review past orders." />
      <Tabs<Tab>
        className="mb-4"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'active', label: 'Active', count: active.length },
          { value: 'past', label: 'Past', count: past.length },
        ]}
      />
      {orders.loading ? (
        <SkeletonList rows={4} />
      ) : orders.error ? (
        <ErrorState message={orders.error} onRetry={() => void orders.reload()} />
      ) : !shown.length ? (
        <EmptyState
          icon={<ShoppingBag className="h-6 w-6" />}
          title={tab === 'active' ? 'No active orders' : 'No past orders yet'}
          description={tab === 'active' ? 'Orders you place will appear here so you can track them live.' : 'Completed and cancelled orders show up here.'}
          action={
            <Link to="/vendors">
              <Button>Start shopping</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {shown.map((o) => (
            <OrderCard key={o.id} order={o} to={`/orders/${o.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}
