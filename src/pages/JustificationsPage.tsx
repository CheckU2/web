import Skeleton from "../components/Skeleton";
import CloseButton from "../components/CloseButton";
import { useCallback, useEffect, useId, useState, type FormEvent } from "react";
import { ImagePlus, Inbox, Send } from "lucide-react";
import { apiRequest } from "../api/http";
import { useAuth } from "../auth/AuthContext";
import { activeRole } from "../auth/roleRouting";
import Feedback from "../components/Feedback";
import { CDMX_TIME_ZONE } from "../lib/datetime";

type Option = { id: string; label: string; teacher_name?: string; has_tutor?: boolean; students: { id: string; name: string }[] };
type Message = { id: string; author_role: string; message: string; image?: string; created_at: string };
type Item = { id: string; student_name?: string; reason: string; status: string; created_at: string; can_resolve?: boolean; resolution_comment?: string; submitted_by_role?: string };
const labels: Record<string, string> = { pending: "Pendiente", needs_information: "En revisión", approved: "Aprobado", rejected: "Rechazado", cancelled: "Cancelado" };
const roleLabels: Record<string, string> = { teacher: "Docente", tutor: "Tutor" };
const endpoint = "/api/v1/justifications";
const dateTime = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: CDMX_TIME_ZONE });
const isOpen = (item: Item) => ["pending", "needs_information"].includes(item.status);

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "No se pudo completar la operación.";
}

async function toBase64(file: File | null) {
  if (!file) return undefined;
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 1024 * 1024) {
    throw new Error("Selecciona una imagen JPG, PNG o WebP de hasta 1 MB.");
  }
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(file);
  });
}

function ImageField({ file, onChange }: { file: File | null; onChange: (file: File | null) => void }) {
  const id = useId();
  return <div className="field attachment-field">
    <label htmlFor={id}><ImagePlus size={16} /> Imagen <small>(opcional, hasta 1 MB)</small></label>
    <input id={id} type="file" accept="image/jpeg,image/png,image/webp" key={file ? "attached" : "empty"} onChange={e => onChange(e.target.files?.[0] ?? null)} />
    {file && <span>{file.name} <button type="button" className="button button-ghost button-small" onClick={() => onChange(null)}>Quitar</button></span>}
  </div>;
}

export default function JustificationsPage() {
  const { user } = useAuth();
  const role = activeRole(user);
  const teacher = role === "teacher";
  const tutor = role === "tutor";
  const canSubmit = teacher || tutor;
  const [items, setItems] = useState<Item[]>([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [session, setSession] = useState("");
  const [student, setStudent] = useState("");
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState<File | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [decision, setDecision] = useState("excused");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [optionsLoading, setOptionsLoading] = useState(canSubmit);
  const [busy, setBusy] = useState(false);
  const [pendingOnly, setPendingOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [total, setTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const visibleItems = items.filter(item => (!statusFilter || item.status === statusFilter) &&
    `${item.student_name ?? ""} ${item.reason}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const current = items.find(item => item.id === selected);
  const selectedSession = options.find(option => option.id === session);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiRequest<{ data: Item[]; meta: { total: number; review_pending: number } }>(`${endpoint}?page=${page}&limit=50&review_pending=${pendingOnly}`);
      setItems(result.data);
      setTotal(result.meta.total);
      setPendingCount(result.meta.review_pending);
    } catch (error) { setError(errorMessage(error)); }
    finally { setLoading(false); }
  }, [page, pendingOnly]);

  const loadOptions = useCallback(async () => {
    if (!canSubmit) return;
    setOptionsLoading(true);
    try {
      const result = await apiRequest<{ data: { sessions: Option[] } }>(`${endpoint}/options`);
      setOptions(result.data.sessions);
    } catch (error) { setError(errorMessage(error)); }
    finally { setOptionsLoading(false); }
  }, [canSubmit]);

  useEffect(() => { void load(); void loadOptions(); }, [load, loadOptions]);
  useEffect(() => {
    if (!selected) return;
    let active = true;
    void apiRequest<{ data: Message[] }>(`${endpoint}/${selected}/messages`)
      .then(result => { if (active) setMessages(result.data); })
      .catch(error => { if (active) setError(errorMessage(error)); })
      .finally(() => { if (active) setLoadingThread(false); });
    return () => { active = false; };
  }, [selected]);

  function openThread(item: Item) {
    setMessages([]); setMessage(""); setAttachment(null); setComment(""); setDecision("excused");
    setError(""); setSuccess(""); setLoadingThread(true); setSelected(item.id);
  }

  async function submit(action: () => Promise<void>) {
    setBusy(true); setError(""); setSuccess("");
    try { await action(); } catch (error) { setError(errorMessage(error)); }
    finally { setBusy(false); }
  }

  function create(event: FormEvent) {
    event.preventDefault();
    void submit(async () => {
      await apiRequest(endpoint, {
        method: "POST", body: JSON.stringify({ session_id: session, student_id: student, reason, image: await toBase64(evidence) }),
      });
      setSession(""); setStudent(""); setReason(""); setEvidence(null);
      setSuccess(teacher ? "Justificante enviado al tutor asignado." : "Solicitud enviada al docente.");
      if (page === 1 && !pendingOnly) await load();
      else { setPage(1); setPendingOnly(false); }
    });
  }

  function send(event: FormEvent) {
    event.preventDefault();
    if (!current) return;
    void submit(async () => {
      const result = await apiRequest<{ data: Message }>(`${endpoint}/${current.id}/messages`, {
        method: "POST", body: JSON.stringify({ message, image: await toBase64(attachment) }),
      });
      setMessages(previous => [...previous, result.data]); setMessage(""); setAttachment(null);
    });
  }

  function resolve(action: "approve" | "reject") {
    if (!current) return;
    void submit(async () => {
      await apiRequest(`${endpoint}/${current.id}/${action}`, {
        method: "POST", body: JSON.stringify({ reason: comment, attendance_status: tutor ? "excused" : decision }),
      });
      setSelected(null);
      window.dispatchEvent(new Event("justifications-updated"));
      setSuccess(action === "approve" ? "Justificante aprobado. Se actualizó la asistencia." : "Justificante rechazado.");
      await load();
    });
  }

  return <div className="page">
    <div className="page-heading"><div><h1>Justificantes</h1><p className="muted">Envía evidencia, conversa y consulta el estado de las solicitudes.</p></div>
      <button className="button button-secondary" onClick={() => { setError(""); void load(); void loadOptions(); }}>Actualizar</button>
    </div>
    {!current && <Feedback error={error} success={success} />}
    <div className="justification-workspace">
    {canSubmit && !current && <section className="panel justification-compose">
      <h2>{teacher ? "Enviar justificante al tutor" : "Solicitar justificación al docente"}</h2>
      {optionsLoading ? <Skeleton variant="field" count={2} label="Cargando sesiones y alumnos" /> : <form className="form-stack" onSubmit={create}>
        <label className="field"><span>Sesión cerrada</span>
          <select required value={session} onChange={e => { setSession(e.target.value); setStudent(""); }}>
            <option value="">{options.length ? "Selecciona una sesión" : "Sin sesiones disponibles"}</option>
            {options.map(option => <option key={option.id} value={option.id}>{option.label}{tutor && option.teacher_name ? ` · ${option.teacher_name}` : ""}</option>)}
          </select>
        </label>
        <label className="field"><span>Alumno</span>
          <select required value={student} disabled={!selectedSession} onChange={e => setStudent(e.target.value)}>
            <option value="">Selecciona al alumno</option>
            {selectedSession?.students.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
          </select>
        </label>
        {teacher && selectedSession?.has_tutor === false && <div className="field-wide"><Feedback warning="Asigna un tutor al grupo para enviar el justificante." title="Falta un tutor asignado" /></div>}
        <label className="field field-wide"><span>Motivo</span><textarea required minLength={5} maxLength={2000} rows={3} value={reason} onChange={e => setReason(e.target.value)} /></label>
        <ImageField file={evidence} onChange={setEvidence} />
        <div className="form-actions field-wide"><button className="button button-primary" disabled={busy || (teacher && selectedSession?.has_tutor === false)}><Send size={16} /> Enviar</button></div>
      </form>}
    </section>}
    <section className="panel justification-inbox">
      <div className="panel-heading"><h2>Bandeja de justificantes</h2><button className={`button button-small ${pendingOnly ? "button-primary" : "button-secondary"}`} aria-pressed={pendingOnly} onClick={() => { setPage(1); setStatusFilter(""); setPendingOnly(value => !value); }}>{pendingCount} por revisar</button></div>
      <div className="academic-filters">
        <label className="field"><span>Buscar en esta página</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Alumno o motivo" /></label>
        <label className="field"><span>Estado</span><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="">Todos</option>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      </div>
      {loading ? <Skeleton label="Cargando justificantes" /> : visibleItems.length ? <div className="table-wrap"><table>
        <thead><tr><th>Alumno y motivo</th><th>Estado</th><th>Conversación</th></tr></thead>
        <tbody>{visibleItems.map(item => <tr key={item.id} className={selected === item.id ? "request-selected" : undefined}>
          <td><strong>{item.student_name || "Alumno"}</strong><small className="request-reason">{item.reason}</small><small className="muted">{dateTime.format(new Date(item.created_at))}</small></td>
          <td><span className={`status ${isOpen(item) ? "status-neutral" : item.status === "approved" ? "status-active" : "status-inactive"}`}>{labels[item.status] || item.status}</span></td>
          <td><button className="button button-secondary button-small" disabled={busy} onClick={() => { if (item.id !== selected) openThread(item); }}>Abrir</button></td>
        </tr>)}</tbody>
      </table></div> : <div className="empty-state"><Inbox size={20} /> Sin justificantes para estos filtros.</div>}
      {total > 50 && <div className="pagination"><button className="button button-secondary button-small" disabled={page === 1 || busy} onClick={() => { setSelected(null); setPage(page - 1); }}>Anterior</button><span>{page} de {Math.ceil(total / 50)}</span><button className="button button-secondary button-small" disabled={page * 50 >= total || busy} onClick={() => { setSelected(null); setPage(page + 1); }}>Siguiente</button></div>}
    </section>
    {current && <section className="panel justification-compose" aria-labelledby="thread-title">
        <div className="panel-heading"><div><span className="pill">{labels[current.status] || current.status}</span><h2 id="thread-title">{current.student_name || "Alumno"}</h2></div>
          <CloseButton autoFocus disabled={busy} onClick={() => setSelected(null)} aria-label="Cerrar justificante" /></div>
        <p>{current.reason}</p><Feedback error={error} success={success} />
        <div className="message-thread" aria-live="polite">{messages.map(item => <div className="message-bubble" key={item.id}>
          <strong>{roleLabels[item.author_role] ?? "Personal académico"}</strong>
          {item.message && <p>{item.message}</p>}
          {item.image?.startsWith("data:image/jpeg;base64,") && <img className="justification-image" src={item.image} alt="Evidencia adjunta al justificante" />}
          <small>{dateTime.format(new Date(item.created_at))}</small>
        </div>)}{loadingThread ? <Skeleton count={2} label="Cargando conversación" /> : !messages.length && <p className="muted">Sin mensajes.</p>}</div>
        {canSubmit && <form className="form-stack" onSubmit={send}>
          <label className="field"><span>Mensaje</span><textarea maxLength={4000} rows={2} value={message} onChange={e => setMessage(e.target.value)} /></label>
          <ImageField file={attachment} onChange={setAttachment} />
          <button className="button button-secondary" disabled={busy || loadingThread || (!message.trim() && !attachment)}>Enviar mensaje</button>
        </form>}
        {current.resolution_comment && <p className="muted">{current.resolution_comment}</p>}
        {current.can_resolve && isOpen(current) && <div className="resolution-box">
          <h3>Resolver justificante</h3>
          {!tutor && <label className="field"><span>Resultado</span><select value={decision} onChange={e => setDecision(e.target.value)}><option value="excused">Falta justificada</option><option value="present">Presente (asistencia verificada)</option></select></label>}
          <label className="field"><span>Comentario de resolución</span><textarea rows={2} value={comment} onChange={e => setComment(e.target.value)} /></label>
          <div className="table-actions">
            <button className="button button-primary" disabled={busy || loadingThread} onClick={() => resolve("approve")}>{tutor ? "Justificar falta" : "Aprobar"}</button>
            <button className="button button-danger-ghost" disabled={busy || loadingThread || comment.trim().length < 5} onClick={() => resolve("reject")}>Rechazar</button>
          </div>
        </div>}
      </section>}
    </div>
  </div>;
}
