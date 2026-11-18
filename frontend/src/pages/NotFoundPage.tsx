import { Link } from 'react-router-dom';
import { MapPinOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_HOME, portalOf } from '@/utils/constants';

export default function NotFoundPage() {
  const { user } = useAuth();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-200 text-slate-500">
        <MapPinOff className="h-7 w-7" aria-hidden />
      </span>
      <h1 className="mt-4 text-2xl font-semibold text-slate-900">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">The page you're looking for doesn't exist or was moved.</p>
      <Link
        to={user ? ROLE_HOME[user.role] : ROLE_HOME[portalOf(location.pathname) ?? 'customer']}
        className="mt-6 inline-flex h-10 items-center rounded-xl bg-brand-600 px-4 text-sm font-medium text-slate-900 hover:bg-brand-500"
      >
        {user ? 'Back to dashboard' : 'Go to home'}
      </Link>
    </div>
  );
}
