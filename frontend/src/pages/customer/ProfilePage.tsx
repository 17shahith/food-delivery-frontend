import { useState } from 'react';
import { MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAsync } from '@/hooks/useAsync';
import { authService } from '@/services/authService';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  PageHeader,
  SkeletonList,
} from '@/components/ui';
import { AddressFormModal } from '@/components/customer/AddressForm';
import { AccountDetailsCard, ChangePasswordCard } from '@/components/profile/AccountCards';
import { getErrorMessage } from '@/utils/errors';
import type { Address } from '@/types';

export default function ProfilePage() {
  const addresses = useAsync(() => authService.listAddresses(), []);
  const [editing, setEditing] = useState<Address | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Address | null>(null);
  const [busy, setBusy] = useState(false);

  const setDefault = async (a: Address) => {
    try {
      await authService.updateAddress(a.id, { is_default: true });
      addresses.setData((prev) => prev?.map((x) => ({ ...x, is_default: x.id === a.id })));
      toast.success(`${a.label} is now your default address`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await authService.deleteAddress(deleting.id);
      addresses.setData((prev) => prev?.filter((x) => x.id !== deleting.id));
      toast.success('Address deleted');
      setDeleting(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Profile" description="Manage your account and delivery addresses." />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <AccountDetailsCard />
          <ChangePasswordCard />
        </div>

        <Card className="h-fit">
          <CardHeader
            title="Delivery addresses"
            action={
              <Button
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                Add address
              </Button>
            }
          />
          <CardBody>
            {addresses.loading ? (
              <SkeletonList rows={2} />
            ) : addresses.error ? (
              <ErrorState message={addresses.error} onRetry={() => void addresses.reload()} />
            ) : !addresses.data?.length ? (
              <EmptyState
                icon={<MapPin className="h-6 w-6" />}
                title="No saved addresses"
                description="Add an address so checkout is quick and riders can find you."
              />
            ) : (
              <ul className="space-y-3">
                {addresses.data.map((a) => (
                  <li key={a.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 font-medium text-slate-900">
                          {a.label} {a.is_default && <Badge tone="green">Default</Badge>}
                        </p>
                        <p className="mt-0.5 text-sm text-slate-500">
                          {[a.line1, a.line2, a.city, a.state, a.postal_code].filter(Boolean).join(', ')}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(a);
                            setFormOpen(true);
                          }}
                          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                          aria-label={`Edit ${a.label}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(a)}
                          className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                          aria-label={`Delete ${a.label}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {!a.is_default && (
                      <button
                        type="button"
                        onClick={() => void setDefault(a)}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-800"
                      >
                        <Star className="h-3.5 w-3.5" /> Set as default
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <AddressFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initial={editing}
        onSubmit={async (data) => {
          if (editing) {
            const updated = await authService.updateAddress(editing.id, data);
            addresses.setData((prev) =>
              prev?.map((x) => (x.id === updated.id ? updated : updated.is_default ? { ...x, is_default: false } : x)),
            );
            toast.success('Address updated');
          } else {
            const created = await authService.createAddress(data);
            addresses.setData((prev) => [
              ...(prev ?? []).map((x) => (created.is_default ? { ...x, is_default: false } : x)),
              created,
            ]);
            toast.success('Address added');
          }
        }}
      />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        loading={busy}
        title="Delete address?"
        message={deleting ? `“${deleting.label}” will be removed from your saved addresses.` : ''}
        confirmLabel="Delete"
        tone="danger"
      />
    </div>
  );
}
