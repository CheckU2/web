import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import AccountPage from "./pages/AccountPage";
import UsersPage from "./pages/UsersPage";
import ResourcePage, { RESOURCE_CONFIGS } from "./pages/ResourcePage";
import SessionsPage from "./pages/SessionsPage";
import AttendancePage from "./pages/AttendancePage";
import JustificationsPage from "./pages/JustificationsPage";
import ReportsPage from "./pages/ReportsPage";
import AuditLogsPage from "./pages/AuditLogsPage";
import ClassesPage from "./pages/ClassesPage";
import ProximityPage from "./pages/ProximityPage";

function HomeRedirect() {
  const { token, user, loading } = useAuth();
  if (loading) return <div className="page-loading">Comprobando sesión…</div>;
  return <Navigate to={token && user ? "/dashboard" : "/login"} replace />;
}

function NotFoundPage() {
  const location = useLocation();
  return <main className="auth-page"><section className="auth-card"><div className="brand brand-centered"><span className="brand-mark">C</span><span>CheckU</span></div><h1>Página no encontrada</h1><p className="muted">No existe una página para <code>{location.pathname}</code>.</p><a className="button button-primary button-link" href="/">Volver al inicio</a></section></main>;
}

function AdminOnly({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user?.role === "admin" || user?.role === "super_admin" ? <>{children}</> : <div className="page"><h1>Acceso denegado</h1><p>No tienes permiso para entrar a este módulo.</p></div>;
}

const resourceRoutes = Object.keys(RESOURCE_CONFIGS);

export default function App() {
  return <Routes>
    <Route path="/" element={<HomeRedirect />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    <Route path="/reset-password" element={<ResetPasswordPage />} />
    <Route element={<ProtectedRoute />}><Route element={<AppLayout />}>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/account" element={<AccountPage />} />
      <Route path="/users" element={<AdminOnly><UsersPage /></AdminOnly>} />
      <Route path="/classes" element={<ClassesPage />} />
      <Route path="/sessions" element={<SessionsPage />} />
      <Route path="/attendance" element={<AttendancePage />} />
      <Route path="/justifications" element={<JustificationsPage />} />
      <Route path="/reports" element={<ReportsPage />} />
      <Route path="/audit-logs" element={<AdminOnly><AuditLogsPage /></AdminOnly>} />
      <Route path="/proximity" element={<ProximityPage />} />
      {resourceRoutes.map((resource) => <Route key={resource} path={`/${resource}`} element={resource === "careers" ? <AdminOnly><ResourcePage resource={resource} /></AdminOnly> : <ResourcePage resource={resource} />} />)}
    </Route></Route>
    <Route path="*" element={<NotFoundPage />} />
  </Routes>;
}
