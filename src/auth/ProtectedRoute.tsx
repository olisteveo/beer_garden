import { Navigate } from "react-router-dom";
import { useAuth } from "./useAuth";
import type { ReactNode } from "react";

/** Full-screen loading spinner (matches LoadingOverlay style). */
function AuthSpinner() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
    </div>
  );
}

/**
 * Route guard — shows spinner while auth bootstraps, redirects to /login
 * if the user is not authenticated.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <AuthSpinner />;
  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
