import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "../api/http";
import { useAuth } from "../auth/AuthContext";
import Feedback from "../components/Feedback";
import type { ApiEnvelope } from "../types/api";

interface AttendanceRecord extends Record<string, unknown> { id?: string; _id?: string; session_id?: string; student_id?: string; status?: string; recorded_at?: string; source?: string; }
function valueText(value: unknown) { if (value === undefined || value === null || value === "") return "—"; return typeof value === "object" ? JSON.stringify(value) : String(value); }

export default function AttendancePage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [code, setCode] = useState("");
  const [qrToken, setQrToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const isStudent = user?.role === "student";

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const response = await apiRequest<ApiEnvelope<AttendanceRecord[]>>("/api/v1/attendance/me?limit=100"); setRecords(Array.isArray(response.data) ? response.data : []); }
    catch (err) { setError(err instanceof Error ? err.message : "No se pudo consultar la asistencia."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function checkIn(event: FormEvent<HTMLFormElement>, mode: "code" | "qr") {
    event.preventDefault(); setError(""); setSuccess(""); setSubmitting(true);
    let qrValue = qrToken.trim();
    if (mode === "qr") {
      try {
        const parsed = JSON.parse(qrValue) as {qr_token?: string};
        if (parsed.qr_token) qrValue = parsed.qr_token;
      } catch { /* El lector puede devolver directamente el token. */ }
    }
    const payload = mode === "code" ? { code: code.trim() } : { qr_token: qrValue };
    try {
      await apiRequest(`/api/v1/attendance/${mode === "code" ? "code" : "qr"}/check-in`, { method: "POST", body: JSON.stringify(payload) });
      setSuccess("Asistencia registrada correctamente."); setCode(""); setQrToken(""); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo registrar la asistencia."); }
    finally { setSubmitting(false); }
  }

  return <div className="page"><div className="page-heading"><div><p className="eyebrow">CONTROL DE ASISTENCIA</p><h1>Asistencia</h1><p className="muted">Consulta los registros y, si eres estudiante, registra tu asistencia con un código temporal.</p></div><button className="button button-secondary" onClick={() => void load()} disabled={loading}>{loading ? "Actualizando…" : "Actualizar"}</button></div>
    <Feedback error={error} success={success} />
    {isStudent && <div className="attendance-forms"><section className="panel"><h2>Registrar con código</h2><p className="muted small-text">Solo necesitas los 4 dígitos que muestra el docente.</p><form className="form-stack" onSubmit={(event) => void checkIn(event, "code")}><label className="field"><span>Código de 4 dígitos *</span><input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" pattern="[0-9]{4}" minLength={4} maxLength={4} required /></label><button className="button button-primary" disabled={submitting}>{submitting ? "Registrando…" : "Registrar asistencia"}</button></form></section>
      <section className="panel"><h2>Registrar con QR</h2><p className="muted small-text">Escanea el QR con tu teléfono y pega aquí el contenido obtenido.</p><form className="form-stack" onSubmit={(event) => void checkIn(event, "qr")}><label className="field"><span>Token QR *</span><textarea value={qrToken} onChange={(e) => setQrToken(e.target.value)} rows={3} required /></label><button className="button button-primary" disabled={submitting}>{submitting ? "Registrando…" : "Validar QR y registrar"}</button></form></section></div>}
    <section className="panel"><div className="panel-heading"><div><h2>Historial de asistencia</h2><p className="muted small-text">Registros visibles para tu cuenta.</p></div><span className="pill">{records.length} registros</span></div>
      {loading ? <div className="empty-state">Cargando historial…</div> : records.length === 0 ? <div className="empty-state">No hay registros de asistencia para mostrar.</div> : <div className="table-wrap"><table><thead><tr><th>Registro</th><th>Alumno</th><th>Estado</th><th>Fecha</th><th>Origen</th></tr></thead><tbody>{records.map((record, index) => <tr key={String(record.id ?? record._id ?? index)}><td>Asistencia de clase</td><td>{isStudent ? 'Yo' : 'Estudiante'}</td><td><span className={`status ${record.status === "present" || record.status === "late" ? "status-active" : record.status === "absent" ? "status-inactive" : "status-neutral"}`}>{valueText(record.status)}</span></td><td>{record.recorded_at ? new Date(record.recorded_at).toLocaleString() : "—"}</td><td>{valueText(record.source)}</td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}
