import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bike, CheckCircle2, Eye, EyeOff, ShoppingBag, Store } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, Button, Input, Select } from '@/components/ui';
import { LocationPicker } from '@/components/maps/LocationPicker';
import { getErrorMessage } from '@/utils/errors';
import { isValid, required, validateEmail, validatePassword, validatePhone } from '@/utils/validation';
import { ROLE_HOME, VEHICLE_TYPES, VENDOR_CATEGORIES } from '@/utils/constants';
import { cn } from '@/utils/cn';
import type { LatLng, RegisterPayload, VehicleType } from '@/types';

type RegRole = RegisterPayload['role'];

const ROLES: { value: RegRole; label: string; description: string; icon: typeof Store }[] = [
  { value: 'customer', label: 'Customer', description: 'Order from local shops', icon: ShoppingBag },
  { value: 'vendor', label: 'Vendor', description: 'Sell from your store', icon: Store },
  { value: 'rider', label: 'Rider', description: 'Deliver and earn', icon: Bike },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState<RegRole>('customer');
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
    store_name: '',
    store_category: '',
    store_address: '',
    vehicle_type: 'scooter' as VehicleType,
    vehicle_number: '',
  });
  const [storeLocation, setStoreLocation] = useState<LatLng | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e: Record<string, string | null> = {
      full_name: required(form.full_name, 'Full name'),
      email: validateEmail(form.email),
      phone: validatePhone(form.phone, role !== 'customer'),
      password: validatePassword(form.password),
      confirm: form.confirm === form.password ? null : 'Passwords do not match.',
    };
    if (role === 'vendor') {
      e.store_name = required(form.store_name, 'Store name');
      e.store_category = required(form.store_category, 'Category');
      e.store_address = required(form.store_address, 'Store address');
      e.store_location = storeLocation ? null : 'Pin your store on the map.';
    }
    if (role === 'rider') {
      e.vehicle_number = form.vehicle_type === 'bicycle' ? null : required(form.vehicle_number, 'Vehicle number');
    }
    setErrors(e);
    return isValid(e);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setFormError(null);
    const payload: RegisterPayload = {
      role,
      full_name: form.full_name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim() || undefined,
      password: form.password,
      ...(role === 'vendor' && {
        store_name: form.store_name.trim(),
        store_category: form.store_category,
        store_address: form.store_address.trim(),
        latitude: storeLocation?.latitude,
        longitude: storeLocation?.longitude,
      }),
      ...(role === 'rider' && {
        vehicle_type: form.vehicle_type,
        vehicle_number: form.vehicle_number.trim() || undefined,
      }),
    };
    try {
      const user = await register(payload);
      if (!user) {
        setNeedsConfirmation(true);
        return;
      }
      toast.success('Account created!');
      navigate(ROLE_HOME[user.role], { replace: true });
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (needsConfirmation) {
    return (
      <div className="text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-700">
          <CheckCircle2 className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="mt-4 text-2xl font-semibold text-slate-900">Check your inbox</h1>
        <p className="mt-2 text-sm text-slate-500">
          We sent a confirmation link to <strong>{form.email}</strong>. Confirm your email, then sign in.
        </p>
        <Link to="/login" className="mt-6 inline-block text-sm font-medium text-brand-700 hover:text-brand-800">
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Create your account</h1>
      <p className="mt-1 text-sm text-slate-500">Choose how you'll use the platform.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <fieldset>
          <legend className="sr-only">Account type</legend>
          <div className="grid grid-cols-3 gap-2">
            {ROLES.map((r) => (
              <label
                key={r.value}
                className={cn(
                  'flex cursor-pointer flex-col items-center gap-1 rounded-xl border p-3 text-center transition-colors',
                  role === r.value ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-slate-200 hover:border-slate-300',
                )}
              >
                <input
                  type="radio"
                  name="role"
                  value={r.value}
                  checked={role === r.value}
                  onChange={() => setRole(r.value)}
                  className="sr-only"
                />
                <r.icon className={cn('h-5 w-5', role === r.value ? 'text-brand-700' : 'text-slate-500')} aria-hidden />
                <span className="text-sm font-medium text-slate-900">{r.label}</span>
                <span className="hidden text-[11px] text-slate-500 sm:block">{r.description}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {role !== 'customer' && (
          <Alert tone="info">
            {role === 'vendor' ? 'Vendor' : 'Rider'} accounts are reviewed by an admin before they can go live.
          </Alert>
        )}
        {formError && <Alert tone="error">{formError}</Alert>}

        <Input label="Full name" value={form.full_name} onChange={set('full_name')} error={errors.full_name} autoComplete="name" required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Email" type="email" value={form.email} onChange={set('email')} error={errors.email} autoComplete="email" required />
          <Input
            label="Phone"
            type="tel"
            value={form.phone}
            onChange={set('phone')}
            error={errors.phone}
            autoComplete="tel"
            required={role !== 'customer'}
          />
        </div>

        {role === 'vendor' && (
          <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-900">Store details</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Store name" value={form.store_name} onChange={set('store_name')} error={errors.store_name} required />
              <Select
                label="Category"
                value={form.store_category}
                onChange={set('store_category')}
                error={errors.store_category}
                placeholder="Select…"
                options={VENDOR_CATEGORIES.map((c) => ({ value: c, label: c }))}
                required
              />
            </div>
            <Input label="Store address" value={form.store_address} onChange={set('store_address')} error={errors.store_address} required />
            <div>
              <p className="mb-1.5 text-sm font-medium text-slate-700">
                Store location <span className="text-red-500">*</span>
              </p>
              <LocationPicker value={storeLocation} onChange={setStoreLocation} className="h-52" />
              {errors.store_location && <p className="mt-1 text-xs text-red-600">{errors.store_location}</p>}
            </div>
          </div>
        )}

        {role === 'rider' && (
          <div className="grid gap-4 rounded-2xl border border-slate-200 p-4 sm:grid-cols-2">
            <Select
              label="Vehicle type"
              value={form.vehicle_type}
              onChange={set('vehicle_type')}
              options={VEHICLE_TYPES.map((v) => ({ value: v.value, label: v.label }))}
            />
            <Input
              label="Vehicle number"
              value={form.vehicle_number}
              onChange={set('vehicle_number')}
              error={errors.vehicle_number}
              required={form.vehicle_type !== 'bicycle'}
              placeholder="KA 01 AB 1234"
            />
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={set('password')}
            error={errors.password}
            hint="8+ characters, letters and numbers"
            autoComplete="new-password"
            required
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="rounded-md p-1.5 text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />
          <Input
            label="Confirm password"
            type={showPassword ? 'text' : 'password'}
            value={form.confirm}
            onChange={set('confirm')}
            error={errors.confirm}
            autoComplete="new-password"
            required
          />
        </div>

        <Button type="submit" fullWidth size="lg" loading={loading}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-brand-700 hover:text-brand-800">
          Sign in
        </Link>
      </p>
    </div>
  );
}
