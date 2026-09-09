import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { CloudDataGate } from '../../features/sync/CloudDataGate';
import { RequireAuth } from './RequireAuth';
import { RouteLoadingFallback } from './RouteLoadingFallback';

/**
 * The front door.
 *
 * Someone who types the bare address is a customer, so she is shown the
 * boutique. A signed-in member of the showroom still lands on the dashboard
 * at the same address, wrapped in the very same shell as before. /login and
 * /landing keep working under their own addresses.
 */
export function RootGate() {
  const { status } = useAuth();

  if (status === 'loading') return <RouteLoadingFallback />;

  if (status !== 'signed-in') {
    return <Navigate to="/landing" replace />;
  }

  return (
    <RequireAuth>
      <CloudDataGate>
        <Outlet />
      </CloudDataGate>
    </RequireAuth>
  );
}
