import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../api/http";
import { useAuth } from "../auth/AuthContext";
import Feedback from "../components/Feedback";
import type { ApiEnvelope } from "../types/api";

interface DashboardMetrics { sessions: number; active_sessions: number; attendance_records: number; pending_justifications: number; }
interface HealthResponse { success: boolean; data?: { status?: string; database?: string; [key: string]: unknown } }
const metricLabels: Array<{ key: keyof DashboardMetrics; label: string; hint: string }> = [
  { key: "sessions", label: "Sesiones registradas", hint: "Total en tu ámbito" },
  { key: "active_sessions", label: "Sesiones activas", hint: "Clases en curso" },
  { key: "attendance_records", label: "Registros de asistencia", hint: "Marcajes almacenados" },
  { key: "pending_justifications", label: "Justificantes pendientes", hint: "Solicitudes por revisar" },
];

export default function DashboardPage() {
  const { user, refreshUser } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [apiState, setApiState] = useState<"loading" | "online" | "offline">("loading");
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true); setError("");
    try {
      const [, report] = await Promise.all([
        apiRequest<HealthResponse>("/api/v1/ready", { auth: false, retryOnUnauthorized: false }),
        apiRequest<ApiEnvelope<DashboardMetrics>>("/api/v1/reports/dashboard"),
      ]);
      setMetrics(report.data); setApiState("online");
      await refreshUser().catch(() => undefined);
    } catch (err) {
      setApiState("offline"); setError(err instanceof Error ? err.message : "No se pudieron cargar las métricas.");
    } finally { setRefreshing(false); }
  }, [refreshUser]);

  useEffect(() => { void load(); }, [load]);

  return <div className="page">
    <div className="page-heading"><div><p className="eyebrow">RESUMEN</p><h1>Hola, {user?.full_name || user?.email || "bienvenido"}</h1><p className="muted">Este es el resumen actual de tu cuenta en CheckU.</p></div><button className="button button-secondary" onClick={() => void load()} disabled={refreshing}>{refreshing ? "Actualizando…" : "Actualizar datos"}</button></div>
    <Feedback error={error} />
    <section className="connection-banner"><span className={apiState === "online" ? "status-dot" : apiState === "offline" ? "status-dot status-dot-error" : "status-dot status-dot-loading"} /><div><strong>{apiState === "online" ? "API conectada" : apiState === "offline" ? "No se pudo conectar con la API" : "Comprobando conexión con la API…"}</strong><p className="muted small-text">{apiState === "online" ? "Los datos se consultan directamente al backend de CheckU." : "Comprueba que el backend esté ejecutándose y que VITE_API_URL sea correcto."}</p></div></section>
    <section className="metric-grid">{metricLabels.map((metric) => <article className="metric-card" key={metric.key}><span className="metric-label">{metric.label}</span><strong className="metric-value">{metrics ? metrics[metric.key] ?? 0 : "—"}</strong><span className="metric-hint">{metric.hint}</span></article>)}</section>
    <section className="panel"><div className="panel-heading"><div><h2>Tu cuenta</h2><p className="muted small-text">Información recibida desde la API.</p></div></div><dl className="details-grid"><div><dt>Nombre</dt><dd>{user?.full_name || "—"}</dd></div><div><dt>Correo</dt><dd>{user?.email || "—"}</dd></div><div><dt>Rol</dt><dd>{user?.role || "—"}</dd></div><div><dt>Estado</dt><dd>{user?.is_active ? "Activa" : "—"}</dd></div><div><dt>Carrera</dt><dd>{user?.career_id || "No asignada"}</dd></div></dl></section>
  </div>;
}
