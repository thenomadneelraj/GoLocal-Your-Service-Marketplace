import { Navigate } from "react-router-dom";
import { useAuth } from "@/components/contexts/AuthContext";

const getHomeByRole = (role) => {
  if (role === "ADMIN") return "/admin-dashboard";
  if (role === "PROVIDER") return "/provider-dashboard";
  return "/dashboard";
};

export default function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to={getHomeByRole(user.role)} replace />;

  return children;
}
