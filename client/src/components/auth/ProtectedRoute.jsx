import { Navigate } from "react-router-dom";
import { useAuth } from "@/components/contexts/AuthContext";

export default function ProtectedRoute({ children, role }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/signin" replace />;

  if (role && user.role !== role) return <Navigate to="/" replace />;

  return children;
}
