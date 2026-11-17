import { useMemo, useState } from 'react';
import { BellOff, CheckCheck, RefreshCw } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { Button, Card, EmptyState, ErrorState, PageHeader, SkeletonList, Tabs } from '@/components/ui';
import { NotificationItem } from '@/components/notifications/NotificationItem';

type Filter = 'all' | 'unread';

export default function NotificationsPage() {
  const { notifications, unreadCount, loading, error, reload, markRead, markAllRead, remove } = useNotifications();
  const [filter, setFilter] = useState<Filter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const shown = useMemo(
    () => (filter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications),
    [notifications, filter],
  );

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Order updates and account alerts arrive here in real time."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              loading={refreshing}
              leftIcon={<RefreshCw className="h-4 w-4" />}
              onClick={async () => {
                setRefreshing(true);
                await reload();
                setRefreshing(false);
              }}
            >
              Refresh
            </Button>
            <Button size="sm" leftIcon={<CheckCheck className="h-4 w-4" />} disabled={!unreadCount} onClick={() => void markAllRead()}>
              Mark all read
            </Button>
          </>
        }
      />
      <Tabs<Filter>
        className="mb-4"
        value={filter}
        onChange={setFilter}
        tabs={[
          { value: 'all', label: 'All', count: notifications.length },
          { value: 'unread', label: 'Unread', count: unreadCount },
        ]}
      />
      {loading && !notifications.length ? (
        <SkeletonList rows={5} />
      ) : error && !notifications.length ? (
        <ErrorState message={error} onRetry={() => void reload()} />
      ) : !shown.length ? (
        <EmptyState
          icon={<BellOff className="h-6 w-6" />}
          title={filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          description="We'll let you know when something happens with your orders or account."
        />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {shown.map((n) => (
              <NotificationItem key={n.id} notification={n} onRead={markRead} onRemove={remove} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
