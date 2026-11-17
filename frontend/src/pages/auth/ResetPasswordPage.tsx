import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authService } from '@/services/authService';
import { isSupabaseConfigured } from '@/services/supabase';
import { Alert, Button, Input } from '@/components/ui';
import { getErrorMessage } from '@/utils/errors';
import { validatePassword } from '@/utils/validation';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string | null; confirm?: string | null }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next = { password: validatePassword(password), confirm: password === confirm ? null : 'Passwords do not match.' };
    setErrors(next);
    if (next.password || next.confirm) return;
    setLoading(true);
    setFormError(null);
    try {
      await authService.resetPassword(password);
      toast.success('Password updated. Please sign in.');
      navigate('/login', { replace: true });
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Set a new password</h1>
      <p className="mt-1 text-sm text-slate-500">Choose a strong password you haven't used before.</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
        {!isSupabaseConfigured && (
          <Alert tone="warning">Password reset needs Supabase to be configured for this app.</Alert>
        )}
        {formError && <Alert tone="error">{formError}</Alert>}
        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          required
        />
        <Input
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
          required
        />
        <Button type="submit" fullWidth size="lg" loading={loading} disabled={!isSupabaseConfigured}>
          Update password
        </Button>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link to="/login" className="font-medium text-brand-700 hover:text-brand-800">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
