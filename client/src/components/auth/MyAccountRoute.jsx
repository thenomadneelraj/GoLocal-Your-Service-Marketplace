import { Navigate } from "react-router-dom";
import { useAuth } from "@/components/contexts/AuthContext";

const getDashboardPathByRole = (role) => {
  if (role === "ADMIN") return "/admin";
  if (role === "PROVIDER") return "/provider-dashboard";
  return "/dashboard";
};

export default function MyAccountRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/signin"
        replace
        state={{
          redirectTo: "/my-account",
          message: "Please sign in to access your account.",
        }}
      />
    );
  }

  return <Navigate to={getDashboardPathByRole(user.role)} replace />;
}
