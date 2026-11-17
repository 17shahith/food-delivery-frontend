import { useState } from 'react';
import { Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, ConfirmDialog } from '@/components/ui';
import { getErrorMessage } from '@/utils/errors';
import type { ApprovalStatus } from '@/types';

/** Approve / reject buttons with a reason dialog for rejection. */
export function ApprovalActions({
  status,
  name,
  onDecide,
}: {
  status: ApprovalStatus;
  name: string;
  onDecide: (approved: boolean, reason?: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);

  const decide = async (approved: boolean, reason?: string) => {
    setBusy(approved ? 'approve' : 'reject');
    try {
      await onDecide(approved, reason);
      toast.success(`${name} ${approved ? 'approved' : 'rejected'}`);
      setRejectOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
      {status !== 'rejected' && (
        <Button size="sm" variant="outline" leftIcon={<X className="h-3.5 w-3.5" />} disabled={!!busy} onClick={() => setRejectOpen(true)}>
          {status === 'approved' ? 'Revoke' : 'Reject'}
        </Button>
      )}
      {status !== 'approved' && (
        <Button size="sm" leftIcon={<Check className="h-3.5 w-3.5" />} loading={busy === 'approve'} disabled={!!busy} onClick={() => void decide(true)}>
          Approve
        </Button>
      )}
      <ConfirmDialog
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onConfirm={(reason) => decide(false, reason)}
        loading={busy === 'reject'}
        title={status === 'approved' ? `Revoke approval for ${name}?` : `Reject ${name}?`}
        message="They will be notified and won't be able to operate on the platform."
        confirmLabel={status === 'approved' ? 'Revoke' : 'Reject'}
        tone="danger"
        withReason
        reasonLabel="Reason (shared with the applicant)"
      />
    </div>
  );
}

export function ActiveToggleButton({
  active,
  name,
  onToggle,
}: {
  active: boolean;
  name: string;
  onToggle: (next: boolean) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <span onClick={(e) => e.stopPropagation()}>
      <Button size="sm" variant={active ? 'ghost' : 'outline'} onClick={() => setOpen(true)}>
        {active ? 'Deactivate' : 'Activate'}
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        loading={busy}
        tone={active ? 'danger' : 'primary'}
        title={active ? `Deactivate ${name}?` : `Reactivate ${name}?`}
        message={active ? 'They will be signed out and unable to log in until reactivated.' : 'They will be able to sign in again.'}
        confirmLabel={active ? 'Deactivate' : 'Activate'}
        onConfirm={async () => {
          setBusy(true);
          try {
            await onToggle(!active);
            toast.success(`${name} ${active ? 'deactivated' : 'activated'}`);
            setOpen(false);
          } catch (err) {
            toast.error(getErrorMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      />
    </span>
  );
}
