import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../api/http";
import Feedback from "../components/Feedback";
import type { ApiEnvelope } from "../types/api";

interface ReportData extends Record<string, unknown> { attendance_percentage?: number | null; sessions_evaluated?: number; attendance_records?: number; active_sessions?: number; at_risk?: boolean; statuses?: Record<string, number>; pending_justifications?: number; }
function safeJson(value: unknown) { return JSON.stringify(value, null, 2); }
export default function ReportsPage() {
  const [dashboard, setDashboard] = useState<ReportData | null>(null);
  const [attendance, setAttendance] = useState<ReportData | null>(null);
  const [days, setDays] = useState("90");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeReport, setActiveReport] = useState<"attendance" | "justifications">("attendance");
  const [detail, setDetail] = useState<unknown>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [dashboardResponse, attendanceResponse] = await Promise.all([
        apiRequest<ApiEnvelope<ReportData>>("/api/v1/reports/dashboard"),
        apiRequest<ApiEnvelope<ReportData>>(`/api/v1/reports/attendance?days=${days}`),
      ]);
      setDashboard(dashboardResponse.data); setAttendance(attendanceResponse.data);
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudieron cargar los reportes."); }
    finally { setLoading(false); }
  }, [days]);
  useEffect(() => { void load(); }, [load]);

  async function loadDetail() {
    setError(""); setDetail(null);
    try { const response = await apiRequest<ApiEnvelope<unknown>>(`/api/v1/reports/${activeReport}`); setDetail(response.data); }
    catch (err) { setError(err instanceof Error ? err.message : "No se pudo cargar el reporte."); }
  }

  return <div className="page"><div className="page-heading"><div><p className="eyebrow">ANÁLISIS</p><h1>Reportes</h1><p className="muted">Indicadores de actividad y asistencia disponibles para tu rol.</p></div><button className="button button-secondary" onClick={() => void load()} disabled={loading}>{loading ? "Actualizando…" : "Actualizar"}</button></div>
    <Feedback error={error} />
    <section className="metric-grid">{[{ label: "Sesiones", value: dashboard?.sessions }, { label: "Sesiones activas", value: dashboard?.active_sessions }, { label: "Asistencias", value: dashboard?.attendance_records }, { label: "Justificantes pendientes", value: dashboard?.pending_justifications }].map((item) => <article className="metric-card" key={item.label}><span className="metric-label">{item.label}</span><strong className="metric-value">{loading ? "—" : item.value ?? 0}</strong></article>)}</section>
    <section className="panel"><div className="panel-heading"><div><h2>Porcentaje de asistencia</h2><p className="muted small-text">Incluye presentes, retardos y justificantes aprobados según las reglas del backend.</p></div><label className="inline-field"><span>Días</span><select value={days} onChange={(e) => setDays(e.target.value)}><option value="7">7</option><option value="30">30</option><option value="90">90</option><option value="180">180</option><option value="366">366</option></select></label></div>
      <div className="attendance-score"><strong>{attendance?.attendance_percentage == null ? "—" : `${attendance.attendance_percentage}%`}</strong><span className="muted">{attendance?.sessions_evaluated ?? 0} registros evaluados · mínimo institucional de referencia: 80%</span></div>
      {attendance?.statuses && <div className="status-breakdown">{Object.entries(attendance.statuses).map(([status, count]) => <div key={status}><span>{status}</span><strong>{count}</strong></div>)}</div>}
      {attendance?.at_risk !== undefined && <p className={attendance.at_risk ? "risk-note" : "success-note"}>{attendance.at_risk ? "El porcentaje calculado está por debajo del 80%." : "El porcentaje calculado no está por debajo del 80%."}</p>}
    </section>
    <section className="panel"><div className="panel-heading"><div><h2>Otros reportes</h2><p className="muted small-text">Consulta el reporte completo en formato JSON.</p></div></div><div className="inline-controls"><label className="field"><span>Reporte</span><select value={activeReport} onChange={(e) => setActiveReport(e.target.value as "attendance" | "justifications")}><option value="attendance">Asistencia</option><option value="justifications">Justificantes</option></select></label><button className="button button-primary" onClick={() => void loadDetail()}>Consultar reporte</button></div>{detail !== null && <pre className="json-output">{safeJson(detail)}</pre>}</section>
  </div>;
}
