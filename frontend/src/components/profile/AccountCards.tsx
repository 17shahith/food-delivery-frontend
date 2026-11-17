import { useEffect, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/authService';
import { Avatar, Badge, Button, Card, CardBody, CardHeader, Input } from '@/components/ui';
import { getErrorMessage } from '@/utils/errors';
import { required, validatePassword, validatePhone } from '@/utils/validation';
import { ROLE_LABEL } from '@/utils/constants';
import { formatDate } from '@/utils/format';

/** Name / phone / avatar editor shared by every role's profile page. */
export function AccountDetailsCard() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ full_name: '', phone: '', avatar_url: '' });
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) setForm({ full_name: user.full_name, phone: user.phone ?? '', avatar_url: user.avatar_url ?? '' });
  }, [user]);

  if (!user) return null;
  const dirty =
    form.full_name !== user.full_name || form.phone !== (user.phone ?? '') || form.avatar_url !== (user.avatar_url ?? '');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = { full_name: required(form.full_name, 'Name'), phone: validatePhone(form.phone) };
    setErrors(errs);
    if (errs.full_name || errs.phone) return;
    setSaving(true);
    try {
      const updated = await authService.updateProfile({
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        avatar_url: form.avatar_url.trim() || null,
      });
      setUser(updated);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Account details" />
      <CardBody>
        <div className="mb-5 flex items-center gap-4">
          <Avatar name={form.full_name || user.full_name} src={form.avatar_url || null} size="lg" />
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900">{user.email}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <Badge tone="blue">{ROLE_LABEL[user.role]}</Badge>
              Member since {formatDate(user.created_at)}
            </div>
          </div>
        </div>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Input
            label="Full name"
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            error={errors.full_name}
            required
          />
          <Input
            label="Phone"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            error={errors.phone}
          />
          <Input
            label="Avatar URL"
            type="url"
            value={form.avatar_url}
            onChange={(e) => setForm((f) => ({ ...f, avatar_url: e.target.value }))}
            placeholder="https://…"
          />
          <div className="flex justify-end">
            <Button type="submit" loading={saving} disabled={!dirty}>
              Save changes
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

export function ChangePasswordCard() {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = {
      current: form.current ? null : 'Enter your current password.',
      next: validatePassword(form.next),
      confirm: form.next === form.confirm ? null : 'Passwords do not match.',
    };
    setErrors(errs);
    if (errs.current || errs.next || errs.confirm) return;
    setSaving(true);
    try {
      await authService.changePassword(form.current, form.next);
      setForm({ current: '', next: '', confirm: '' });
      toast.success('Password changed');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Change password" />
      <CardBody>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Input
            label="Current password"
            type="password"
            autoComplete="current-password"
            value={form.current}
            onChange={(e) => setForm((f) => ({ ...f, current: e.target.value }))}
            error={errors.current}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="New password"
              type="password"
              autoComplete="new-password"
              value={form.next}
              onChange={(e) => setForm((f) => ({ ...f, next: e.target.value }))}
              error={errors.next}
            />
            <Input
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              value={form.confirm}
              onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
              error={errors.confirm}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="outline" loading={saving}>
              Update password
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
