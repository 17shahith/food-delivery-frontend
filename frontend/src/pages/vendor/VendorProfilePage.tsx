import { useEffect, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { useAsync } from '@/hooks/useAsync';
import { vendorService } from '@/services/vendorService';
import {
  ApprovalBadge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  Input,
  PageHeader,
  Select,
  Skeleton,
  Textarea,
  Toggle,
} from '@/components/ui';
import { LocationPicker } from '@/components/maps/LocationPicker';
import { AccountDetailsCard, ChangePasswordCard } from '@/components/profile/AccountCards';
import { ApprovalNotice } from '@/components/ApprovalNotice';
import { getErrorMessage } from '@/utils/errors';
import { isValid, required, validatePhone } from '@/utils/validation';
import { VENDOR_CATEGORIES } from '@/utils/constants';
import type { LatLng, VendorUpdate } from '@/types';

interface StoreForm {
  name: string;
  description: string;
  category: string;
  address: string;
  phone: string;
  opening_hours: string;
  logo_url: string;
  banner_url: string;
  delivery_fee: string;
  min_order_amount: string;
  avg_prep_minutes: string;
  is_open: boolean;
}

export default function VendorProfilePage() {
  const store = useAsync(() => vendorService.me(), []);
  const [form, setForm] = useState<StoreForm | null>(null);
  const [location, setLocation] = useState<LatLng | null>(null);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const v = store.data;
    if (!v) return;
    setForm({
      name: v.name,
      description: v.description ?? '',
      category: v.category,
      address: v.address,
      phone: v.phone ?? '',
      opening_hours: v.opening_hours ?? '',
      logo_url: v.logo_url ?? '',
      banner_url: v.banner_url ?? '',
      delivery_fee: v.delivery_fee == null ? '' : String(v.delivery_fee),
      min_order_amount: v.min_order_amount == null ? '' : String(v.min_order_amount),
      avg_prep_minutes: v.avg_prep_minutes == null ? '' : String(v.avg_prep_minutes),
      is_open: v.is_open,
    });
    setLocation({ latitude: v.latitude, longitude: v.longitude });
  }, [store.data]);

  if (store.loading || (!form && !store.error)) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }
  if (store.error || !form) return <ErrorState message={store.error} onRetry={() => void store.reload()} />;

  const set = (k: keyof StoreForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => (f ? { ...f, [k]: e.target.value } : f));

  const num = (v: string) => (v.trim() === '' ? null : Number(v));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const nonNeg = (v: string, label: string) => {
      const n = num(v);
      return n != null && (!Number.isFinite(n) || n < 0) ? `${label} must be 0 or more.` : null;
    };
    const errs = {
      name: required(form.name, 'Store name'),
      category: required(form.category, 'Category'),
      address: required(form.address, 'Address'),
      phone: validatePhone(form.phone),
      delivery_fee: nonNeg(form.delivery_fee, 'Delivery fee'),
      min_order_amount: nonNeg(form.min_order_amount, 'Minimum order'),
      avg_prep_minutes: nonNeg(form.avg_prep_minutes, 'Prep time'),
      location: location ? null : 'Pin your store location.',
    };
    setErrors(errs);
    if (!isValid(errs)) return;

    const payload: VendorUpdate = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      category: form.category,
      address: form.address.trim(),
      phone: form.phone.trim() || null,
      opening_hours: form.opening_hours.trim() || null,
      logo_url: form.logo_url.trim() || null,
      banner_url: form.banner_url.trim() || null,
      delivery_fee: num(form.delivery_fee),
      min_order_amount: num(form.min_order_amount),
      avg_prep_minutes: num(form.avg_prep_minutes),
      is_open: form.is_open,
      latitude: location!.latitude,
      longitude: location!.longitude,
    };
    setSaving(true);
    try {
      const updated = await vendorService.updateMe(payload);
      store.setData(updated);
      toast.success('Store profile saved');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Store profile"
        description="This is what customers see when they visit your shop."
        actions={<ApprovalBadge status={store.data?.approval_status} />}
      />
      <ApprovalNotice status={store.data?.approval_status} />

      <form onSubmit={onSubmit} noValidate className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Store information" />
          <CardBody className="space-y-4">
            <Input label="Store name" value={form.name} onChange={set('name')} error={errors.name} required />
            <Select
              label="Category"
              value={form.category}
              onChange={set('category')}
              error={errors.category}
              options={VENDOR_CATEGORIES.map((c) => ({ value: c, label: c }))}
              required
            />
            <Textarea label="Description" value={form.description} onChange={set('description')} rows={3} maxLength={500} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Store phone" type="tel" value={form.phone} onChange={set('phone')} error={errors.phone} />
              <Input label="Opening hours" value={form.opening_hours} onChange={set('opening_hours')} placeholder="8 AM – 10 PM" />
            </div>
            <Input label="Logo URL" type="url" value={form.logo_url} onChange={set('logo_url')} placeholder="https://…" />
            <Input label="Banner URL" type="url" value={form.banner_url} onChange={set('banner_url')} placeholder="https://…" />
            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Accepting orders</p>
                <p className="text-xs text-slate-500">Turn off to temporarily close your store.</p>
              </div>
              <Toggle checked={form.is_open} onChange={(v) => setForm((f) => (f ? { ...f, is_open: v } : f))} label="Accepting orders" />
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Location & delivery" />
            <CardBody className="space-y-4">
              <Input label="Address" value={form.address} onChange={set('address')} error={errors.address} required />
              <div>
                <LocationPicker value={location} onChange={setLocation} className="h-56" />
                {errors.location && <p className="mt-1 text-xs text-red-600">{errors.location}</p>}
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Input label="Delivery fee" type="number" min={0} step="0.01" value={form.delivery_fee} onChange={set('delivery_fee')} error={errors.delivery_fee} />
                <Input
                  label="Min. order"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.min_order_amount}
                  onChange={set('min_order_amount')}
                  error={errors.min_order_amount}
                />
                <Input
                  label="Prep time (min)"
                  type="number"
                  min={0}
                  value={form.avg_prep_minutes}
                  onChange={set('avg_prep_minutes')}
                  error={errors.avg_prep_minutes}
                />
              </div>
            </CardBody>
          </Card>
          <div className="flex justify-end">
            <Button type="submit" loading={saving} size="lg">
              Save store profile
            </Button>
          </div>
        </div>
      </form>

      <div className="grid gap-6 lg:grid-cols-2">
        <AccountDetailsCard />
        <ChangePasswordCard />
      </div>
    </div>
  );
}
