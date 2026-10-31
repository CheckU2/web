import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "../api/http";
import { useAuth } from "../auth/AuthContext";
import Feedback from "../components/Feedback";
import { listResource, type ResourceRecord } from "../api/resources.api";
import type { ApiEnvelope, AuthUser } from "../types/api";

interface UserRow extends AuthUser { id: string; is_active: boolean; }
const roles = [
  { value: "student", label: "Estudiante" }, { value: "teacher", label: "Docente" },
  { value: "tutor", label: "Tutor" }, { value: "career_admin", label: "Administrador de carrera" },
];

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [employeeId, setEmployeeId] = useState("");
  const [department, setDepartment] = useState("");
  const [careerId, setCareerId] = useState("");
  const [careers, setCareers] = useState<ResourceRecord[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await apiRequest<ApiEnvelope<UserRow[]> & { meta?: { total: number } }>(`/api/v1/users?page=${page}&limit=20`);
      setUsers(Array.isArray(response.data) ? response.data : []);
      setTotal(response.meta?.total ?? response.data.length);
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudieron cargar los usuarios."); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { void loadUsers(); }, [loadUsers]);
  useEffect(() => { void listResource("careers", 1, 100).then((res) => setCareers(res.data ?? [])).catch(() => setCareers([])); }, []);

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSuccess(""); setSaving(true);
    try {
      await apiRequest("/api/v1/users", { method: "POST", body: JSON.stringify({ full_name: fullName.trim(), email: email.trim(), password, role, ...(careerId ? { career_id: careerId } : {}), ...(["teacher", "tutor"].includes(role) ? { employee_id: employeeId.trim(), ...(role === "teacher" && department.trim() ? { department: department.trim() } : {}) } : {}) }) });
      setSuccess("Usuario creado correctamente."); setFullName(""); setEmail(""); setPassword(""); setRole("student"); setEmployeeId(""); setDepartment(""); setCareerId("");
      await loadUsers();
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo crear el usuario."); }
    finally { setSaving(false); }
  }

  async function toggleStatus(target: UserRow) {
    setError(""); setSuccess("");
    try {
      await apiRequest(`/api/v1/users/${target.id}/status`, { method: "PATCH", body: JSON.stringify({ is_active: !target.is_active }) });
      setSuccess(`Cuenta ${target.is_active ? "desactivada" : "activada"}.`); await loadUsers();
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo cambiar el estado."); }
  }

  async function deactivateUser(target: UserRow) {
    if (!window.confirm(`¿Desactivar la cuenta de ${target.full_name || target.email}?`)) return;
    setError(""); setSuccess("");
    try { await apiRequest(`/api/v1/users/${target.id}`, { method: "DELETE" }); setSuccess("Cuenta desactivada correctamente."); await loadUsers(); }
    catch (err) { setError(err instanceof Error ? err.message : "No se pudo desactivar el usuario."); }
  }

  return <div className="page">
    <div className="page-heading"><div><p className="eyebrow">ADMINISTRACIÓN</p><h1>Usuarios</h1><p className="muted">Gestiona las cuentas y sus roles de acceso.</p></div><button className="button button-secondary" onClick={() => void loadUsers()} disabled={loading}>{loading ? "Actualizando…" : "Actualizar"}</button></div>
    <Feedback error={error} success={success} />
    <section className="panel"><div className="panel-heading"><div><h2>Crear usuario</h2><p className="muted small-text">Las cuentas nuevas requieren una contraseña de 12 caracteres como mínimo.</p></div></div>
      <form className="resource-form" onSubmit={createUser}>
        <label className="field"><span>Nombre completo *</span><input value={fullName} onChange={(e) => setFullName(e.target.value)} minLength={2} maxLength={120} required /></label>
        <label className="field"><span>Correo electrónico *</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label className="field"><span>Contraseña *</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={12} maxLength={128} required autoComplete="new-password" /></label>
        <label className="field"><span>Rol *</span><select value={role} onChange={(e) => setRole(e.target.value)}>{roles.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label className="field"><span>Carrera</span><select value={careerId} onChange={(e) => setCareerId(e.target.value)}><option value="">Sin carrera asignada</option>{careers.map((career) => <option key={String(career.id)} value={String(career.id)}>{String(career.name ?? "Carrera")} ({String(career.code ?? "Sin código")})</option>)}</select></label>
        {(role === "teacher" || role === "tutor") && <label className="field"><span>Número de empleado *</span><input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} maxLength={40} required placeholder="Ej. EMP-1025" /></label>}
        {role === "teacher" && <label className="field"><span>Departamento</span><input value={department} onChange={(e) => setDepartment(e.target.value)} maxLength={120} /></label>}
        <div className="form-actions field-wide"><button className="button button-primary" type="submit" disabled={saving}>{saving ? "Creando…" : "Crear usuario"}</button></div>
      </form>
    </section>
    <section className="panel"><div className="panel-heading"><div><h2>Cuentas registradas</h2><p className="muted small-text">{total} usuarios en total</p></div><span className="pill">Página {page}</span></div>
      {loading ? <div className="empty-state">Cargando usuarios…</div> : users.length === 0 ? <div className="empty-state">No hay usuarios en esta página.</div> : <div className="table-wrap"><table><thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{users.map((item) => <tr key={item.id}><td>{item.full_name || "—"}</td><td>{item.email}</td><td>{roles.find((entry) => entry.value === item.role)?.label ?? item.role}</td><td><span className={item.is_active ? "status status-active" : "status status-inactive"}>{item.is_active ? "Activa" : "Inactiva"}</span></td><td><div className="table-actions"><button className="button button-ghost button-small" disabled={item.id === (user?.id ?? user?._id)} onClick={() => void toggleStatus(item)}>{item.is_active ? "Desactivar" : "Activar"}</button>{item.is_active && <button className="button button-danger-ghost button-small" disabled={item.id === (user?.id ?? user?._id)} onClick={() => void deactivateUser(item)}>Baja lógica</button>}</div></td></tr>)}</tbody></table></div>}
      <div className="pagination"><button className="button button-secondary button-small" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>Anterior</button><span className="muted small-text">Página {page}</span><button className="button button-secondary button-small" disabled={loading || page * 20 >= total} onClick={() => setPage((p) => p + 1)}>Siguiente</button></div>
    </section>
  </div>;
}
