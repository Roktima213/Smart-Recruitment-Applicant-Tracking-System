import React from 'react';
import { Navigate, useLocation, Outlet, Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROUTES } from '../../constants/routes';
import { Button } from '../ui/Button';

export interface ProtectedRouteProps {
  allowedRoles?: string[];
  children?: React.ReactNode;
}

/**
 * Route guard enforcing authentication and role-based permissions
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        <p className="text-sm font-medium">Verifying authorization permissions...</p>
      </div>
    );
  }

  // Unauthenticated user -> redirect to Login with return path
  if (!user) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  // Role authorization check
  if (allowedRoles && allowedRoles.length > 0) {
    const normalizedUserRole = (role || 'CANDIDATE').toUpperCase();
    const normalizedAllowed = allowedRoles.map((r) => r.toUpperCase());

    // Role Hierarchy check: ADMIN has access to HR routes as well
    const hasPermission =
      normalizedAllowed.includes(normalizedUserRole) ||
      (normalizedUserRole === 'ADMIN' && normalizedAllowed.includes('HR'));

    if (!hasPermission) {
      return (
        <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-bold text-slate-900 mb-1">Access Restricted (403)</h2>
          <p className="text-xs text-slate-500 mb-4">
            Your current role <span className="font-semibold text-slate-800">[{normalizedUserRole}]</span> does
            not have clearance to access this resource.
          </p>

          <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 mb-6 text-left space-y-1">
            <p>
              Required Roles:{' '}
              <span className="font-semibold text-brand-600">{normalizedAllowed.join(', ')}</span>
            </p>
            <p className="text-slate-400 text-[11px]">
              If you believe this is an error, contact your ATS administrator to adjust your permissions.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3">
            <Link to={ROUTES.HOME}>
              <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Back to Home
              </Button>
            </Link>
            <Link to={ROUTES.CANDIDATE}>
              <Button variant="primary" size="sm">
                Candidate Portal
              </Button>
            </Link>
          </div>
        </div>
      );
    }
  }

  return children ? <>{children}</> : <Outlet />;
};
