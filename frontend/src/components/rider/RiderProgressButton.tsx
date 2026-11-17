import { useState } from 'react';
import { CheckCircle2, PackageCheck, Navigation } from 'lucide-react';
import toast from 'react-hot-toast';
import { riderService } from '@/services/riderService';
import { Button, ConfirmDialog } from '@/components/ui';
import { getErrorMessage } from '@/utils/errors';
import { RIDER_ACTION_LABEL, STATUS_META, riderNextStatus } from '@/utils/orderStatus';
import type { Order } from '@/types';

/** Advances a delivery: confirm pickup → start delivery → delivered (with confirmation). */
export function RiderProgressButton({
  order,
  onUpdated,
  size = 'md',
  fullWidth,
}: {
  order: Order;
  onUpdated: (o: Order) => void;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const next = riderNextStatus(order.status);
  if (!next) return null;

  const Icon = next === 'picked_up' ? PackageCheck : next === 'out_for_delivery' ? Navigation : CheckCircle2;

  const advance = async () => {
    setBusy(true);
    try {
      const updated = await riderService.updateProgress(order.id, next);
      onUpdated(updated);
      toast.success(STATUS_META[next].label);
      setConfirmOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        size={size}
        fullWidth={fullWidth}
        variant={next === 'delivered' ? 'success' : 'primary'}
        leftIcon={<Icon className="h-4 w-4" />}
        loading={busy && !confirmOpen}
        onClick={() => (next === 'delivered' || next === 'picked_up' ? setConfirmOpen(true) : void advance())}
      >
        {RIDER_ACTION_LABEL[next]}
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={advance}
        loading={busy}
        title={next === 'delivered' ? 'Confirm delivery' : 'Confirm pickup'}
        message={
          next === 'delivered'
            ? `Confirm you handed the order to ${order.customer?.full_name ?? 'the customer'}${
                order.payment_method === 'cod' ? ' and collected the cash payment' : ''
              }.`
            : `Confirm you collected all ${order.items.reduce((s, i) => s + i.quantity, 0)} item(s) from ${order.vendor?.name ?? 'the shop'}.`
        }
        confirmLabel={next === 'delivered' ? 'Mark delivered' : 'Confirm pickup'}
      />
    </>
  );
}
