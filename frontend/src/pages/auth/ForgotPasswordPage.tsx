import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MailCheck, Mail } from 'lucide-react';
import { authService } from '@/services/authService';
import { Alert, Button, Input } from '@/components/ui';
import { getErrorMessage } from '@/utils/errors';
import { validateEmail } from '@/utils/validation';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const err = validateEmail(email);
    setError(err);
    if (err) return;
    setLoading(true);
    setFormError(null);
    try {
      await authService.forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (e2) {
      setFormError(getErrorMessage(e2));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-700">
          <MailCheck className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="mt-4 text-2xl font-semibold text-slate-900">Check your email</h1>
        <p className="mt-2 text-sm text-slate-500">
          If an account exists for <strong>{email}</strong>, you'll receive a link to reset your password shortly.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <Button variant="outline" onClick={() => setSent(false)}>
            Use a different email
          </Button>
          <Link to="/login" className="text-sm font-medium text-brand-700 hover:text-brand-800">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link to="/login" className="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Back to sign in
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Forgot your password?</h1>
      <p className="mt-1 text-sm text-slate-500">Enter your email and we'll send you a reset link.</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
        {formError && <Alert tone="error">{formError}</Alert>}
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          leftIcon={<Mail className="h-4 w-4" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error}
          required
        />
        <Button type="submit" fullWidth size="lg" loading={loading}>
          Send reset link
        </Button>
      </form>
    </div>
  );
}
