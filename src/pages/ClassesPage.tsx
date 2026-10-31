import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { apiRequest } from "../api/http";
import type { ResourceRecord } from "../api/resources.api";
import Feedback from "../components/Feedback";

type ClassRow = ResourceRecord & { subject_name?: string; group_name?: string; period_name?: string; tutor_ids?: string[]; join_code?: string; subject_id?: string; group_id?: string; period_id?: string; teacher_id?: string; teacher_name?: string; enrollment_open?: boolean; };
const MANAGERS = ["admin", "super_admin", "career_admin", "tutor", "teacher"];
const SOURCES = ["subjects", "groups", "academic-periods", "teachers", "careers", "tutors"];
function id(row: ResourceRecord) { return String(row.id ?? row._id ?? ""); }
function label(resource: string, row: ResourceRecord) {
  if (resource === "teachers") return `Empleado ${String(row.employee_id ?? "—")} · ${String(row.full_name ?? row.name ?? "Docente")}`;
  return `${String(row.name ?? row.code ?? "Registro")} ${row.code ? `(${row.code})` : ""}`;
}
export default function ClassesPage() {
  const { user } = useAuth();
  const manager = MANAGERS.includes(user?.role ?? "");
  const student = user?.role === "student";
  const [rows, setRows] = useState<ClassRow[]>([]);
  const [catalogs, setCatalogs] = useState<Record<string, ResourceRecord[]>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [code, setCode] = useState("");
  const [showJoin, setShowJoin] = useState(false);
  const [showSubject, setShowSubject] = useState(false);
  const [subjectName, setSubjectName] = useState("");
  const [communityClass, setCommunityClass] = useState<ClassRow | null>(null);
  const [community, setCommunity] = useState<{students: ResourceRecord[]; teacher: ResourceRecord | null; tutors: ResourceRecord[]} | null>(null);
  const [communityBusy, setCommunityBusy] = useState(false);
  const [assignedCareer, setAssignedCareer] = useState<string | null>(null);
  const [catalogError, setCatalogError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createdClass, setCreatedClass] = useState<ClassRow | null>(null);
  const [showGroup, setShowGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupCode, setGroupCode] = useState("");
  const [groupPeriod, setGroupPeriod] = useState("");
  const [rosterClass, setRosterClass] = useState<string | null>(null);
  const [roster, setRoster] = useState<ResourceRecord[]>([]);
  const [rosterBusy, setRosterBusy] = useState(false);
  const [invitations, setInvitations] = useState<ResourceRecord[]>([]);
  const [selectedTutor, setSelectedTutor] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    try {
      const response = await apiRequest<{data: ClassRow[]}>("/api/v1/classes?limit=100");
      setRows(response.data ?? []);
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudieron cargar las clases"); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (user?.role !== 'tutor') return;
    void apiRequest<{data: ResourceRecord[]}>('/api/v1/classes/invitations/mine').then(r => setInvitations(r.data ?? [])).catch(() => undefined);
  }, [user?.role]);
  async function acceptInvitation(invitation: ResourceRecord) {
    try {
      await apiRequest(`/api/v1/classes/invitations/${id(invitation)}/accept`, {method: 'POST'});
      setInvitations(items => items.filter(item => id(item) !== id(invitation)));
      setSuccess('Invitación aceptada'); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo aceptar'); }
  }
  async function viewStudents(row: ClassRow) {
    const classId = id(row);
    if (rosterClass === classId) { setRosterClass(null); return; }
    setRosterClass(classId); setRosterBusy(true); setRoster([]);
    try {
      const response = await apiRequest<{data: ResourceRecord[]}>(`/api/v1/classes/${classId}/students`);
      setRoster(response.data ?? []);
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudieron cargar los alumnos'); }
    finally { setRosterBusy(false); }
  }
  async function inviteTutor(row: ClassRow) {
    try {
      await apiRequest(`/api/v1/classes/${id(row)}/invite-tutor`, {method: 'POST', body: JSON.stringify({tutor_user_id: selectedTutor[id(row)]})});
      setSuccess('Invitación enviada al tutor');
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo invitar'); }
  }
  useEffect(() => {
    if (!manager) return;
    let active = true;
    void apiRequest<{data: Record<string, ResourceRecord[] | string | null>}>('/api/v1/classes/options')
      .then(response => {
        if (!active) return;
        const result: Record<string, ResourceRecord[]> = {};
        for (const resource of SOURCES) result[resource] = Array.isArray(response.data[resource]) ? response.data[resource] as ResourceRecord[] : [];
        setCatalogs(result);
        setAssignedCareer(typeof response.data.assigned_career_id === 'string' ? response.data.assigned_career_id : null);
        setCatalogError('');
      })
      .catch(err => { if (active) setCatalogError(err instanceof Error ? err.message : 'No se pudieron cargar los catálogos'); });
    return () => { active = false; };
  }, [manager]);
  async function create(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setSuccess("");
    try {
      const result = await apiRequest<{data: ClassRow}>("/api/v1/classes", {method: "POST", body: JSON.stringify({...values, ...(assignedCareer ? {career_id: assignedCareer} : {})})});
      setCreatedClass(result.data);
      setValues({}); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo crear la clase"); }
    finally { setBusy(false); }
  }
  async function createGroup(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await apiRequest('/api/v1/groups', {method:'POST', body:JSON.stringify({name:groupName,code:groupCode,period_id:groupPeriod, ...(assignedCareer ? {career_id:assignedCareer} : {})})});
      setShowGroup(false); setGroupName(''); setGroupCode(''); setGroupPeriod('');
      const response = await apiRequest<{data: Record<string, ResourceRecord[] | string | null>}>('/api/v1/classes/options');
      setCatalogs(old => ({...old, groups: Array.isArray(response.data.groups) ? response.data.groups : []}));
      setSuccess('Grupo creado correctamente');
    } catch(err) { setError(err instanceof Error ? err.message : 'No se pudo crear el grupo'); }
    finally { setBusy(false); }
  }
  async function createSubject(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await apiRequest<{data: ResourceRecord}>('/api/v1/classes/subjects', {
        method: 'POST', body: JSON.stringify({name: subjectName, ...(assignedCareer ? {career_id: assignedCareer} : {career_id: values.career_id})})
      });
      const subject = response.data;
      setCatalogs(old => ({...old, subjects: [...(old.subjects ?? []), subject]}));
      setValues(old => ({...old, subject_id: id(subject)}));
      setShowSubject(false); setSubjectName(''); setSuccess('Materia creada y seleccionada');
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo crear la materia'); }
    finally { setBusy(false); }
  }
  async function viewCommunity(row: ClassRow) {
    setCommunityClass(row); setCommunity(null); setCommunityBusy(true); setError('');
    try {
      const response = await apiRequest<{data: {students: ResourceRecord[]; teacher: ResourceRecord | null; tutors: ResourceRecord[]}}>(`/api/v1/classes/${id(row)}/community`);
      setCommunity(response.data);
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo consultar la comunidad'); }
    finally { setCommunityBusy(false); }
  }
  async function join(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setSuccess("");
    try {
      await apiRequest("/api/v1/classes/join", {method: "POST", body: JSON.stringify({code: code.trim().toUpperCase()})});
      setSuccess("Te inscribiste correctamente a la clase."); setCode(""); setShowJoin(false); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo realizar la inscripción"); }
    finally { setBusy(false); }
  }
  async function modify(row: ClassRow, change: Record<string, unknown>) {
    setError(""); setSuccess("");
    try {
      await apiRequest(`/api/v1/classes/${id(row)}`, {method: "PATCH", body: JSON.stringify(change)});
      setSuccess("Clase actualizada."); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo actualizar la clase"); }
  }
  function name(resource: string, value?: string) {
    const row = catalogs[resource]?.find(item => id(item) === value || (resource === "teachers" && item.user_id === value));
    return row ? label(resource, row) : "—";
  }
  function personCard(person: ResourceRecord, role: string) { const photo = person.avatar; return <div className="checku-person checku-person-profile" key={id(person)}><div className="checku-person-avatar">{typeof photo === "string" && photo ? <img src={photo} alt="" /> : <span>{String(person.full_name ?? "?")[0]}</span>}</div><div><strong>{String(person.full_name ?? "Sin nombre")}</strong><small>{role}</small>{person.bio ? <p className="muted small-text">{String(person.bio)}</p> : null}</div></div>; }
  return <div className="page">
    <div className="page-heading"><div><p className="eyebrow">GESTIÓN ACADÉMICA</p><h1>Clases</h1><p className="muted">Inscríbete con un código de 6 dígitos. El PIN de asistencia es independiente.</p></div></div>
    <Feedback error={error || catalogError} success={success} />
    {manager && !catalogError && SOURCES.some(resource => (catalogs[resource] ?? []).length === 0) && <p className="muted">Para crear clases deben existir carreras, materias, grupos, periodos y docentes activos asociados a tu carrera. Si falta alguna opción, solicita su registro al administrador.</p>}
    {manager && <div className="table-actions"><button className="button button-primary" onClick={() => {setCreatedClass(null);setShowCreate(true);}}>+ Crear clase</button>{['tutor','career_admin','admin','super_admin'].includes(user?.role ?? '') && <button className="button button-secondary" onClick={() => setShowGroup(true)}>+ Crear grupo</button>}</div>}
    {manager && showSubject && <div className="checku-modal-backdrop" onMouseDown={e => {if(e.target===e.currentTarget)setShowSubject(false);}}><section className="panel checku-modal" role="dialog" aria-modal="true" aria-label="Nueva materia"><div className="panel-heading"><h2>+ Nueva materia</h2><button className="button button-ghost" onClick={()=>setShowSubject(false)}>✕</button></div><p className="muted">Crea una materia sin salir de la clase.</p><form className="form-stack" onSubmit={createSubject}><label className="field"><span>Nombre de la materia</span><input autoFocus required minLength={2} maxLength={120} placeholder="Programación orientada a objetos" value={subjectName} onChange={e=>setSubjectName(e.target.value)}/></label><button className="button button-primary" disabled={busy}>Guardar y seleccionar</button></form></section></div>}
    {manager && showCreate && <div className="checku-modal-backdrop" onMouseDown={e => {if(e.target===e.currentTarget) setShowCreate(false);}}><section className="panel checku-modal" role="dialog" aria-modal="true" aria-label="Crear clase"><div className="panel-heading"><h2>{createdClass ? '¡Clase creada!' : 'Nueva clase'}</h2><button className="button button-ghost" onClick={() => setShowCreate(false)}>✕</button></div>{createdClass ? <div className="checku-created"><p>Comparte este código con tus alumnos</p><strong className="checku-code">{createdClass.join_code}</strong><button className="button button-primary" onClick={() => void navigator.clipboard?.writeText(createdClass.join_code ?? '')}>Copiar código</button><button className="button button-secondary" onClick={() => setShowCreate(false)}>Listo</button></div> : <><form className="resource-form" onSubmit={create}>
      {([ ["career_id", "Carrera", "careers"], ["subject_id", "Materia", "subjects"], ["group_id", "Grupo", "groups"], ["period_id", "Periodo", "academic-periods"], ...((user?.role === "teacher" ? [] : [["teacher_id", "Docente", "teachers"]]) as [string, string, string][]) ] as const).map(([field, title, resource]) => <label className="field" key={field}><span>{title} *</span><select required={field !== "career_id" || user?.role === "admin" || user?.role === "super_admin"} value={field === "career_id" && assignedCareer ? assignedCareer : (values[field] ?? "")} disabled={field === "career_id" && Boolean(assignedCareer)} onChange={e => setValues(old => ({...old, [field]: e.target.value}))}><option value="">{field === "career_id" && user?.role !== "admin" && user?.role !== "super_admin" ? "Mi carrera asignada" : `Selecciona ${title.toLowerCase()}`}</option>{(catalogs[resource] ?? []).map(row => <option key={id(row)} value={id(row)}>{label(resource, row)}</option>)}</select></label>)}
      <div className="form-actions field-wide"><button type="button" className="button button-secondary" onClick={()=>setShowSubject(true)}>+ Crear nueva materia</button><button className="button button-primary" disabled={busy}>Crear clase y generar código</button></div>
    </form></>}</section></div>}
    {showGroup && <div className="checku-modal-backdrop" onMouseDown={e => {if(e.target===e.currentTarget)setShowGroup(false);}}><section className="panel checku-modal" role="dialog" aria-modal="true" aria-label="Crear grupo"><div className="panel-heading"><h2>Nuevo grupo</h2><button className="button button-ghost" onClick={() => setShowGroup(false)}>✕</button></div><form className="form-stack" onSubmit={createGroup}><label className="field"><span>Nombre del grupo</span><input required value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="3A" /></label><label className="field"><span>Clave del grupo</span><input required value={groupCode} onChange={e => setGroupCode(e.target.value)} placeholder="3A-SIS" /></label><label className="field"><span>Periodo</span><select required value={groupPeriod} onChange={e => setGroupPeriod(e.target.value)}><option value="">Selecciona periodo</option>{(catalogs['academic-periods'] ?? []).map(r => <option key={id(r)} value={id(r)}>{label('academic-periods',r)}</option>)}</select></label><button className="button button-primary" disabled={busy}>Guardar grupo</button></form></section></div>}
    {student && <div className="table-actions"><button className="button button-primary" onClick={()=>setShowJoin(true)} aria-label="Agregar clase">＋ Agregar clase</button></div>}
    {student && showJoin && <div className="checku-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowJoin(false);}}><section className="panel checku-modal" role="dialog" aria-modal="true" aria-label="Unirme a clase"><div className="panel-heading"><h2>Unirme a una clase</h2><button className="button button-ghost" onClick={()=>setShowJoin(false)}>✕</button></div><p className="muted">Pide al docente el código de seis dígitos.</p><form className="form-stack" onSubmit={join}><label className="field"><span>Código de la clase</span><input autoFocus required minLength={6} maxLength={6} pattern="[0-9]{6}" inputMode="numeric" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} placeholder="482019" /></label><button className="button button-primary" disabled={busy}>Unirme a la clase</button></form></section></div>}
    {user?.role === 'tutor' && invitations.length > 0 && <section className="panel"><h2>Invitaciones de docentes</h2>{invitations.map(inv => <div key={id(inv)} className="table-actions"><span>Invitación a clase {String(inv.class_id ?? '')}</span><button className="button button-primary button-small" onClick={() => void acceptInvitation(inv)}>Aceptar</button></div>)}</section>}
    <section className="panel"><div className="panel-heading"><h2>{student ? 'Mis clases' : 'Clases registradas'}</h2><span className="pill">{rows.length} clases</span></div>
      <div className="checku-card-grid">{rows.map(row => <article className="checku-class-card checku-class-clickable" key={id(row)} tabIndex={0} role="button" aria-label={`Abrir ${String(row.subject_name ?? "clase")}`} onClick={() => void viewCommunity(row)} onKeyDown={e => {if(e.key === "Enter" || e.key === " "){e.preventDefault();void viewCommunity(row);}}}>
        <span className="pill">{String(row.group_name ?? 'Grupo')}</span>
        <h3>{String(row.subject_name ?? 'Materia')}</h3>
        <p>{String(row.period_name ?? 'Periodo')}</p>
        <p className="muted">Docente: {String(row.teacher_name ?? 'Sin asignar')}</p>
        {!student && <p className="muted">Código: <strong>{row.join_code ?? '—'}</strong></p>}
        <div className="table-actions" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}><span className="muted small-text">Selecciona la tarjeta para ver participantes</span>
          {manager && <button className="button button-secondary button-small" onClick={()=>void viewStudents(row)}>Inscritos</button>}
          {manager && <button className="button button-ghost button-small" onClick={()=>void modify(row,{enrollment_open:!row.enrollment_open})}>{row.enrollment_open?'Cerrar inscripción':'Abrir inscripción'}</button>}
          {manager && <button className="button button-ghost button-small" onClick={()=>window.confirm('¿Regenerar código?')&&void modify(row,{regenerate_code:true})}>Nuevo código</button>}
        </div>
        {manager && user?.role==='teacher' && (catalogs.tutors??[]).length>0 && <div className="table-actions" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}><select aria-label="Invitar tutor" value={selectedTutor[id(row)]??''} onChange={e=>setSelectedTutor(old=>({...old,[id(row)]:e.target.value}))}><option value="">Invitar tutor…</option>{(catalogs.tutors??[]).map(t=><option key={id(t)} value={String(t.user_id)}>{String(t.full_name??'Tutor')}</option>)}</select><button className="button button-secondary button-small" disabled={!selectedTutor[id(row)]} onClick={()=>void inviteTutor(row)}>Invitar</button></div>}
      </article>)}{rows.length===0&&<p className="muted">Aún no hay clases para mostrar.</p>}</div>
    </section>
    {manager && rosterClass && <div className="checku-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setRosterClass(null);}}><section className="panel checku-modal" role="dialog" aria-modal="true"><div className="panel-heading"><h2>Alumnos inscritos</h2><button className="button button-ghost" onClick={()=>setRosterClass(null)}>✕</button></div>{rosterBusy?<p>Cargando…</p>:roster.length===0?<p>Sin alumnos inscritos.</p>:<div className="checku-people">{roster.map(person=><div className="checku-person" key={id(person)}><strong>{String(person.full_name??'Alumno')}</strong><small>{String(person.student_id??person.email??'')}</small></div>)}</div>}</section></div>}
    {communityClass && <div className="checku-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setCommunityClass(null);}}><section className="panel checku-modal" role="dialog" aria-modal="true"><div className="panel-heading"><h2>{String(communityClass.subject_name??'Clase')} · Participantes</h2><button className="button button-ghost" onClick={()=>setCommunityClass(null)}>✕</button></div>{communityBusy?<p>Cargando perfiles…</p>:community&&<><h3>Docente</h3>{community.teacher?personCard(community.teacher, "Docente"):<p>Sin docente</p>}<h3>Tutores</h3><div className="checku-people">{community.tutors.length?community.tutors.map(p=>personCard(p, "Tutor")):<p>Sin tutor vinculado</p>}</div><h3>Compañeros ({community.students.length})</h3><div className="checku-people">{community.students.map(p=>personCard(p, "Alumno"))}</div></>}</section></div>}
  </div>;
}
