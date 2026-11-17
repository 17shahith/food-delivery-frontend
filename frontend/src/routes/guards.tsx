import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { FullPageLoader } from '@/components/ui';
import { ROLE_HOME } from '@/utils/constants';
import type { Role } from '@/types';

/**
 * Requires a signed-in user; when `roles` is given, users with other roles are
 * redirected to their own dashboard. Renders `children` or nested routes.
 */
export function ProtectedRoute({ roles, children }: { roles?: Role[]; children?: ReactNode }) {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) return <FullPageLoader />;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={ROLE_HOME[user.role]} replace />;
  }
  return children ? <>{children}</> : <Outlet />;
}

/** Auth pages: signed-in users are sent to their dashboard. */
export function PublicOnlyRoute({ children }: { children?: ReactNode }) {
  const { user, initializing } = useAuth();
  if (initializing) return <FullPageLoader />;
  if (user) return <Navigate to={ROLE_HOME[user.role]} replace />;
  return children ? <>{children}</> : <Outlet />;
}
