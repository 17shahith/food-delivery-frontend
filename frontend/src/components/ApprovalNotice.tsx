import { Clock, ShieldX } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Alert } from '@/components/ui';
import type { ApprovalStatus } from '@/types';

/** Shown on vendor/rider dashboards until an admin approves the account. */
export function ApprovalNotice({ status }: { status?: ApprovalStatus | null }) {
  const { user } = useAuth();
  const s = status ?? user?.approval_status;
  if (!s || s === 'approved') return null;
  const who = user?.role === 'rider' ? 'rider' : 'store';
  if (s === 'rejected') {
    return (
      <Alert tone="error" icon={<ShieldX className="h-5 w-5" />} title={`Your ${who} application was not approved`}>
        Please contact support to find out more or update your details.
      </Alert>
    );
  }
  return (
    <Alert tone="warning" icon={<Clock className="h-5 w-5" />} title="Your account is awaiting approval">
      {who === 'store'
        ? 'An admin is reviewing your store. You can set up products now — customers will see them once approved.'
        : 'An admin is reviewing your profile. You can go online and accept deliveries once approved.'}
    </Alert>
  );
}
