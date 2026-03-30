import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/components/contexts/AuthContext";

export default function ProtectedRoute({ children, roles = [] }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    const redirectTo =
      `${location.pathname}${location.search}${location.hash}`;
    const preferredRole = roles.length === 1 ? roles[0] : undefined;

    return (
      <Navigate
        to="/signin"
        replace
        state={{
          redirectTo,
          preferredRole,
          message: "Please sign in to continue.",
        }}
      />
    );
  }

  const userRole = user.role?.toUpperCase();
  const normalizedAllowedRoles = roles.map(r => r.toUpperCase());

  if (normalizedAllowedRoles.length > 0 && !normalizedAllowedRoles.includes(userRole)) {
    console.log(`ProtectedRoute: Role mismatch! User: ${userRole}, Allowed: ${normalizedAllowedRoles}`);
    
    // Explicit redirects based on role to prevent loops
    if (userRole === "PROVIDER") {
      return <Navigate to="/provider-dashboard" replace />;
    }
    if (userRole === "CLIENT") {
      return <Navigate to="/dashboard" replace />;
    }
    if (userRole === "ADMIN") {
      return <Navigate to="/admin-dashboard" replace />;
    }
    
    return <Navigate to="/" replace />;
  }

  return children;
}
