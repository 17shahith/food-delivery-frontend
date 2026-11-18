import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, Button, Input } from '@/components/ui';
import { getErrorMessage } from '@/utils/errors';
import { validateEmail } from '@/utils/validation';
import { ROLE_HOME, ROLE_LABEL } from '@/utils/constants';
import type { Role } from '@/types';
import { DemoAccounts } from '@/components/DemoAccounts';

/** Only honour a redirect back to a page the role can actually open. */
function canVisit(role: Role, path: string): boolean {
  if (role === 'customer') return !/^\/(vendor|rider|admin)(\/|$)/.test(path);
  return path === `/${role}` || path.startsWith(`/${role}/`);
}

export default function LoginPage({ portal = 'customer' }: { portal?: Role }) {
  const staff = portal !== 'customer';
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const signIn = async (emailValue: string, passwordValue: string) => {
    setLoading(true);
    setFormError(null);
    try {
      const user = await login(emailValue.trim().toLowerCase(), passwordValue);
      toast.success(`Welcome back, ${user.full_name.split(' ')[0]}!`);
      navigate(from && canVisit(user.role, from) ? from : ROLE_HOME[user.role], { replace: true });
    } catch (err) {
      setFormError(getErrorMessage(err, 'Invalid email or password.'));
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next = { email: validateEmail(email), password: password ? null : 'Password is required.' };
    setErrors(next);
    if (next.email || next.password) return;
    void signIn(email, password);
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{staff ? `${ROLE_LABEL[portal]} sign in` : 'Sign in'}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {staff ? `Sign in to the ${ROLE_LABEL[portal].toLowerCase()} dashboard.` : 'Welcome back. Enter your details to continue.'}
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
        {formError && <Alert tone="error">{formError}</Alert>}
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          leftIcon={<Mail className="h-4 w-4" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          placeholder="you@example.com"
          required
        />
        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          leftIcon={<Lock className="h-4 w-4" />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          placeholder="••••••••"
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
        <div className="flex justify-end">
          <Link to={staff ? `/${portal}/forgot-password` : '/forgot-password'} className="text-sm font-medium text-brand-700 hover:text-brand-800">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" fullWidth size="lg" loading={loading}>
          Sign in
        </Button>
      </form>

      <DemoAccounts
        portal={portal}
        disabled={loading}
        onPick={(e, p) => {
          setEmail(e);
          setPassword(p);
          setErrors({});
          void signIn(e, p);
        }}
      />

      {portal !== 'admin' && (
        <p className="mt-8 text-center text-sm text-slate-500">
          {portal === 'vendor' ? 'Want to sell on QuickDrop?' : portal === 'rider' ? 'Want to deliver with us?' : 'New here?'}{' '}
          <Link to={staff ? `/${portal}/register` : '/register'} className="font-medium text-brand-700 hover:text-brand-800">
            {portal === 'vendor' ? 'Register your store' : portal === 'rider' ? 'Become a rider' : 'Create an account'}
          </Link>
        </p>
      )}
      <p className="mt-3 text-center text-xs text-slate-500">
        {staff ? (
          <Link to="/login" className="hover:text-slate-300">
            Shopping? Go to the customer sign-in →
          </Link>
        ) : (
          <>
            Partner sign-in:{' '}
            <Link to="/vendor/login" className="hover:text-slate-300">
              Vendor
            </Link>{' '}
            ·{' '}
            <Link to="/rider/login" className="hover:text-slate-300">
              Rider
            </Link>{' '}
            ·{' '}
            <Link to="/admin/login" className="hover:text-slate-300">
              Admin
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
