import { useState } from 'react';
import { Check, ChefHat, PackageCheck, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { orderService } from '@/services/orderService';
import { Button, ConfirmDialog } from '@/components/ui';
import { getErrorMessage } from '@/utils/errors';
import { STATUS_META, VENDOR_ACTION_LABEL, vendorNextStatus } from '@/utils/orderStatus';
import type { Order } from '@/types';

/** Accept / reject / advance controls for a vendor's order. */
export function VendorOrderActions({
  order,
  onUpdated,
  size = 'sm',
}: {
  order: Order;
  onUpdated: (o: Order) => void;
  size?: 'sm' | 'md';
}) {
  const [busy, setBusy] = useState<'accept' | 'reject' | 'advance' | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const next = vendorNextStatus(order.status);

  const run = async (kind: 'accept' | 'reject' | 'advance', fn: () => Promise<Order>, success: string) => {
    setBusy(kind);
    try {
      const updated = await fn();
      onUpdated(updated);
      toast.success(success);
      return true;
    } catch (err) {
      toast.error(getErrorMessage(err));
      return false;
    } finally {
      setBusy(null);
    }
  };

  if (order.status === 'placed') {
    return (
      <>
        <Button
          size={size}
          variant="outline"
          leftIcon={<X className="h-4 w-4" />}
          disabled={!!busy}
          onClick={() => setRejectOpen(true)}
        >
          Reject
        </Button>
        <Button
          size={size}
          leftIcon={<Check className="h-4 w-4" />}
          loading={busy === 'accept'}
          disabled={!!busy}
          onClick={() => void run('accept', () => orderService.accept(order.id), 'Order accepted')}
        >
          Accept order
        </Button>
        <ConfirmDialog
          open={rejectOpen}
          onClose={() => setRejectOpen(false)}
          onConfirm={async (reason) => {
            const ok = await run('reject', () => orderService.reject(order.id, reason ?? ''), 'Order rejected');
            if (ok) setRejectOpen(false);
          }}
          loading={busy === 'reject'}
          title="Reject this order?"
          message="The customer will be notified and any online payment refunded."
          confirmLabel="Reject order"
          tone="danger"
          withReason
          reasonRequired
          reasonLabel="Reason for the customer"
        />
      </>
    );
  }

  if (next) {
    const Icon = next === 'preparing' ? ChefHat : PackageCheck;
    return (
      <Button
        size={size}
        leftIcon={<Icon className="h-4 w-4" />}
        loading={busy === 'advance'}
        onClick={() =>
          void run('advance', () => orderService.updateStatus(order.id, next), `Marked as “${STATUS_META[next].label}”`)
        }
      >
        {VENDOR_ACTION_LABEL[next]}
      </Button>
    );
  }

  if (order.status === 'ready_for_pickup') {
    return <span className="text-sm text-slate-500">Waiting for a rider to accept…</span>;
  }
  return null;
}
