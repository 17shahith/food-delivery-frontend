import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/errors';
import { Button, Input, Modal } from '@/components/ui';
import { LocationPicker } from '@/components/maps/LocationPicker';
import { isValid, required } from '@/utils/validation';
import type { Address, AddressInput, LatLng } from '@/types';

const empty: AddressInput = {
  label: 'Home',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postal_code: '',
  latitude: NaN,
  longitude: NaN,
  is_default: false,
};

export function AddressFormModal({
  open,
  onClose,
  initial,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Address | null;
  onSubmit: (data: AddressInput) => Promise<void>;
}) {
  const [form, setForm] = useState<AddressInput>(empty);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(initial ? { ...empty, ...initial } : empty);
      setErrors({});
    }
  }, [open, initial]);

  const pin: LatLng | null = Number.isFinite(form.latitude) ? { latitude: form.latitude, longitude: form.longitude } : null;
  const set = (k: keyof AddressInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    const e = {
      label: required(form.label, 'Label'),
      line1: required(form.line1, 'Address'),
      city: required(form.city, 'City'),
      postal_code: required(form.postal_code, 'Postal code'),
      pin: pin ? null : 'Drop a pin so the rider can find you.',
    };
    setErrors(e);
    if (!isValid(e)) return;
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        label: form.label.trim(),
        line1: form.line1.trim(),
        line2: form.line2?.trim() || null,
        city: form.city.trim(),
        state: form.state?.trim() || null,
        postal_code: form.postal_code.trim(),
      });
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      locked={saving}
      size="lg"
      title={initial ? 'Edit address' : 'Add a delivery address'}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={saving}>
            Save address
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Label" value={form.label} onChange={set('label')} error={errors.label} placeholder="Home, Work…" required />
          <Input label="Postal code" value={form.postal_code} onChange={set('postal_code')} error={errors.postal_code} required />
        </div>
        <Input label="Address line 1" value={form.line1} onChange={set('line1')} error={errors.line1} placeholder="House / flat, street" required />
        <Input label="Address line 2" value={form.line2 ?? ''} onChange={set('line2')} placeholder="Landmark, area (optional)" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="City" value={form.city} onChange={set('city')} error={errors.city} required />
          <Input label="State" value={form.state ?? ''} onChange={set('state')} />
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">
            Pin location <span className="text-red-500">*</span>
          </p>
          <LocationPicker value={pin} onChange={(p) => setForm((f) => ({ ...f, ...p }))} className="h-60" />
          {errors.pin && <p className="mt-1 text-xs text-red-600">{errors.pin}</p>}
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.is_default}
            onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          Use as my default address
        </label>
      </div>
    </Modal>
  );
}
