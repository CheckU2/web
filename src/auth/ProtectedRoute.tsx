import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute() {
  const { token, user, loading } = useAuth();
  if (loading) return <div className="page-loading">Comprobando sesión…</div>;
  if (!token || !user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
