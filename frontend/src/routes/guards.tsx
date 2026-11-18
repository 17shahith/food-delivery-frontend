import { useEffect, useState, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button, FullPageLoader } from '@/components/ui';
import { getErrorMessage } from '@/utils/errors';
import type { Role } from '@/types';

/**
 * There is no login page: when the visitor has no session, or a session for a
 * different module, this signs in automatically as the module's account
 * (see utils/autoLogin) and then renders `children` or nested routes.
 */
export function ProtectedRoute({ roles, children }: { roles: Role[]; children?: ReactNode }) {
  const { user, initializing, signInAs } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const role = roles[0];
  const allowed = !!user && roles.includes(user.role);

  useEffect(() => {
    if (initializing || allowed || error) return;
    let cancelled = false;
    signInAs(role).then(
      (u) => {
        if (!cancelled && !roles.includes(u.role)) {
          setError(`The configured ${role} account has the role "${u.role}".`);
        }
      },
      (err) => {
        if (!cancelled) setError(getErrorMessage(err, `Could not open the ${role} module.`));
      },
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initializing, allowed, error, role, attempt, signInAs]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center">
        <p className="max-w-md text-sm text-slate-600">{error}</p>
        <Button
          onClick={() => {
            setError(null);
            setAttempt((a) => a + 1);
          }}
        >
          Try again
        </Button>
      </div>
    );
  }
  if (initializing || !allowed) return <FullPageLoader />;
  return children ? <>{children}</> : <Outlet />;
}
