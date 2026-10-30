import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../auth/AuthContext";

const navigation = [
  { to: "/dashboard", label: "Panel", roles: [] },
  { to: "/account", label: "Mi cuenta", roles: [] },
  { to: "/attendance", label: "Asistencia", roles: [] },
  { to: "/classes", label: "Clases", roles: [] },
  { to: "/sessions", label: "Sesiones", roles: ["teacher", "career_admin", "admin", "super_admin"] },
  { to: "/justifications", label: "Justificantes", roles: [] },
  { to: "/students", label: "Alumnos", roles: ["career_admin", "admin", "super_admin", "teacher", "tutor"] },
  { to: "/groups", label: "Grupos", roles: ["career_admin", "admin", "super_admin", "teacher", "tutor"] },
  { to: "/subjects", label: "Materias", roles: ["career_admin", "admin", "super_admin", "teacher"] },
  { to: "/teachers", label: "Docentes", roles: ["career_admin", "admin", "super_admin"] },
  { to: "/tutors", label: "Tutores", roles: ["career_admin", "admin", "super_admin"] },
  { to: "/enrollments", label: "Inscripciones", roles: ["career_admin", "admin", "super_admin"] },
  { to: "/assignments", label: "Asignaciones", roles: ["career_admin", "admin", "super_admin"] },
  { to: "/schedules", label: "Horarios", roles: [] },
  { to: "/incidents", label: "Incidencias", roles: ["teacher", "tutor", "career_admin", "admin", "super_admin"] },
  { to: "/reports", label: "Reportes", roles: ["teacher", "tutor", "career_admin", "admin", "super_admin"] },
  { to: "/users", label: "Usuarios", roles: ["admin", "super_admin"] },
  { to: "/careers", label: "Carreras", roles: ["admin", "super_admin"] },
  { to: "/academic-periods", label: "Periodos", roles: ["career_admin", "admin", "super_admin"] },
  { to: "/proximity", label: "Proximidad", roles: ["teacher", "career_admin", "admin", "super_admin"] },
  { to: "/audit-logs", label: "Auditoría", roles: ["admin", "super_admin"] },
];

const roleLabels: Record<string, string> = {
  student: "Estudiante", teacher: "Docente", tutor: "Tutor", career_admin: "Administrador de carrera",
  admin: "Administrador", super_admin: "Superadministrador",
};

export default function AppLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const role = user?.role ?? "";

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await signOut();
    } finally {
      setLoggingOut(false);
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="brand"><span className="brand-mark">C</span><span>CheckU</span></div>
        <nav className="main-nav" aria-label="Navegación principal">
          {navigation.filter((item) => item.roles.length === 0 || item.roles.includes(role)).map((item) => (
            <NavLink key={item.to} to={item.to} onClick={() => setMenuOpen(false)} className={({ isActive }) => isActive ? "nav-link nav-link-active" : "nav-link"}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer"><span className="status-dot" /> API de CheckU</div>
      </aside>

      {menuOpen && <button className="sidebar-backdrop" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} />}

      <div className="main-column">
        <header className="topbar">
          <button className="mobile-menu-button" onClick={() => setMenuOpen((open) => !open)} aria-label="Abrir menú">☰</button>
          <div className="topbar-title">Plataforma académica</div>
          <div className="user-menu">
            <div className="avatar" aria-hidden="true">{user?.avatar ? <img src={user.avatar} alt="" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}} /> : (user?.full_name || user?.email || "C").charAt(0).toUpperCase()}</div>
            <div className="user-details"><strong>{user?.full_name || user?.email}</strong><span>{roleLabels[role] ?? role}</span></div>
            <button className="button button-secondary button-small" onClick={() => void handleLogout()} disabled={loggingOut}>
              {loggingOut ? "Saliendo…" : "Cerrar sesión"}
            </button>
          </div>
        </header>
        <main className="page-content"><Outlet /></main>
      </div>
    </div>
  );
}
