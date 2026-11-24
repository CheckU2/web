import Skeleton from "../components/Skeleton";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../api/http";
import Feedback from "../components/Feedback";
import { formatDateTime } from "../lib/datetime";
import type { ApiEnvelope } from "../types/api";

type Row = Record<string, unknown>;
interface AuditLog extends Row {
  id?: string;
  _id?: string;
  action?: string;
  entity?: string;
  entity_id?: string;
  actor_id?: string;
  created_at?: string;
}

const ENTITY_NAMES: Record<string, string> = {
  tutors: "Tutor", users: "Usuario", students: "Alumno", teachers: "Docente",
  groups: "Grupo", classes: "Clase", class_sessions: "Sesión de clase",
  attendance: "Asistencia", subjects: "Materia", careers: "Carrera",
  academic_periods: "Periodo académico", justifications: "Justificante",
};
const ACTION_NAMES: Record<string, string> = {
  create: "Creación", update: "Actualización", delete: "Eliminación",
  start: "Inicio", end: "Finalización", check_in: "Registro de asistencia",
  login: "Inicio de sesión", logout: "Cierre de sesión",
  approve: "Aprobación", reject: "Rechazo",
};
const SPECIFIC_ACTIONS: Record<string, string> = {
  "tutors:update": "Tutor actualizado", "class_sessions:create": "Sesión creada",
  "class_sessions:start": "Sesión iniciada", "class_sessions:end": "Sesión finalizada",
  "attendance:check_in": "Asistencia registrada",
};
const CATALOGS: Record<string, string> = {
  users: "users", tutors: "tutors", teachers: "teachers", students: "students",
  groups: "groups", classes: "classes", class_sessions: "class-sessions",
  attendance: "attendance", subjects: "subjects", careers: "careers",
  academic_periods: "academic-periods", justifications: "justifications",
};
const text = (value: unknown): string => typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "";
const looksLikeId = (value: string) => /^[a-f0-9]{24}$/i.test(value);
function displayName(row: Row, entity: string): string {
  const direct = [row.full_name, row.name, row.title, row.subject_name, row.group_name, row.code, row.email]
    .map(text).find(value => value && !looksLikeId(value));
  if (direct) return direct;
  if (entity === "class_sessions") {
    const title = text(row.class_name ?? row.subject_name);
    return title ? `Sesión de ${title}` : "Sesión de clase";
  }
  if (entity === "attendance") return "Registro de asistencia";
  return ENTITY_NAMES[entity] ?? "Registro";
}
function describeAction(log: AuditLog): string {
  const entity = text(log.entity);
  const action = text(log.action);
  return SPECIFIC_ACTIONS[`${entity}:${action}`] ?? `${ACTION_NAMES[action] ?? "Acción registrada"} · ${ENTITY_NAMES[entity] ?? "Registro"}`;
}
function extractRows(response: unknown): Row[] {
  if (!response || typeof response !== "object") return [];
  const data = (response as { data?: unknown }).data;
  if (Array.isArray(data)) return data.filter((item): item is Row => item !== null && typeof item === "object");
  if (data && typeof data === "object") {
    const nested = (data as { items?: unknown; results?: unknown }).items ?? (data as { results?: unknown }).results;
    if (Array.isArray(nested)) return nested.filter((item): item is Row => item !== null && typeof item === "object");
  }
  return [];
}
export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [catalogs, setCatalogs] = useState<Record<string, Row[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiRequest<ApiEnvelope<AuditLog[]>>("/api/v1/audit-logs?limit=100");
      const nextLogs = Array.isArray(response.data) ? response.data : [];
      setLogs(nextLogs);
      const needed = new Set(nextLogs.map(log => text(log.entity)));
      needed.add("users");
      // Los catálogos pueden estar restringidos por permisos. Un fallo no debe ocultar la auditoría.
      const results = await Promise.allSettled(
        [...needed].filter(entity => CATALOGS[entity]).map(async entity => {
          const result = await apiRequest<unknown>(`/api/v1/${CATALOGS[entity]}?page=1&limit=500`);
          return [entity, extractRows(result)] as const;
        })
      );
      const nextCatalogs: Record<string, Row[]> = {};
      for (const result of results) if (result.status === "fulfilled") nextCatalogs[result.value[0]] = result.value[1];
      setCatalogs(nextCatalogs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo consultar la auditoría.");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const lookups = useMemo(() => {
    const mapped: Record<string, Map<string, string>> = {};
    for (const [entity, rows] of Object.entries(catalogs)) {
      const map = new Map<string, string>();
      for (const row of rows) {
        const label = displayName(row, entity);
        for (const value of [row.id, row._id, row.user_id]) {
          const key = text(value);
          if (key) map.set(key, label);
        }
      }
      mapped[entity] = map;
    }
    return mapped;
  }, [catalogs]);
  const actorName = (id: unknown) => {
    const key = text(id);
    if (!key) return "Sistema";
    for (const entity of ["users", "teachers", "tutors", "students"]) {
      const value = lookups[entity]?.get(key);
      if (value) return value;
    }
    return "Usuario no disponible";
  };
  const entityName = (log: AuditLog) => {
    const entity = text(log.entity);
    const key = text(log.entity_id);
    if (!key) return "Sin referencia";
    const found = lookups[entity]?.get(key);
    if (found) return found;
    // Evita mostrar códigos internos cuando el recurso fue eliminado o no hay permisos.
    return entity === "attendance" ? "Registro de asistencia" :
      entity === "class_sessions" ? "Sesión de clase" :
      `${ENTITY_NAMES[entity] ?? "Registro"} no disponible`;
  };
  return (
    <div className="page">
      <div className="page-heading">
        <div><p className="eyebrow">SEGURIDAD</p><h1>Auditoría</h1>
          <p className="muted">Registro de acciones administrativas y cambios relevantes.</p></div>
        <button className="button button-secondary" onClick={() => void load()} disabled={loading}>
          {loading ? "Actualizando…" : "Actualizar"}
        </button>
      </div>
      <Feedback error={error} />
      <section className="panel">
        <h2>Eventos recientes</h2>
        {loading ? <Skeleton variant="rows" /> : logs.length === 0 ? (
          <div className="empty-state">No hay eventos disponibles para tu cuenta.</div>
        ) : (
          <div className="table-wrap"><table>
            <thead><tr><th>Acción</th><th>Elemento</th><th>Detalle</th><th>Realizado por</th><th>Fecha</th></tr></thead>
            <tbody>{logs.map((log, index) => (
              <tr key={String(log.id ?? log._id ?? index)}>
                <td>{describeAction(log)}</td>
                <td>{ENTITY_NAMES[text(log.entity)] ?? "Registro"}</td>
                <td>{entityName(log)}</td>
                <td>{actorName(log.actor_id)}</td>
                <td>{formatDateTime(log.created_at)}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
    </div>
  );
}
