import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { apiRequest } from '../api/http';
import { useAuth } from '../auth/AuthContext';
import Feedback from '../components/Feedback';
import type { ApiEnvelope } from '../types/api';

type Row = Record<string, unknown> & {id?: string; status?: string; class_id?: string; subject_name?: string; group_name?: string; period_name?: string; teacher_id?: string; qr?: {image?: string; code?: string}};
type Person = {student_id: string; full_name: string; status: string; recorded_at?: string};
type Report = {session: Row; students: Person[]; counts: Record<string,number>; departure_tracking: boolean};
const id = (r: Row) => String(r.id ?? r._id ?? '');
const statusName: Record<string,string> = {present:'Asistió', late:'Retardo', absent:'Faltó', excused:'Justificado', pending:'Pendiente', closed:'Finalizada', active:'En curso', scheduled:'Programada'};
export default function SessionsPage() {
  const {user} = useAuth();
  const canCreate = ['teacher','career_admin','admin','super_admin'].includes(user?.role ?? '');
  const canReport = ['teacher','tutor','career_admin','admin','super_admin'].includes(user?.role ?? '');
  const [rows,setRows] = useState<Row[]>([]);
  const [classes,setClasses] = useState<Row[]>([]);
  const [selected,setSelected] = useState('');
  const [filter,setFilter] = useState('');
  const [open,setOpen] = useState(false);
  const [qr,setQr] = useState<Row['qr']>();
  const [report,setReport] = useState<Report | null>(null);
  const [reportLoading,setReportLoading] = useState(false);
  const [error,setError] = useState('');
  const [success,setSuccess] = useState('');
  const [busy,setBusy] = useState(false);
  const load = useCallback(async()=>{
    try {
      const [s,c] = await Promise.all([
        apiRequest<ApiEnvelope<Row[]>>('/api/v1/sessions?limit=100'),
        apiRequest<ApiEnvelope<Row[]>>('/api/v1/classes?limit=100')
      ]);
      setRows(s.data ?? []); setClasses(c.data ?? []);
    } catch(e) {setError(e instanceof Error ? e.message : 'No se pudieron cargar las sesiones');}
  },[]);
  useEffect(()=>{void load();},[load]);
  const visible = useMemo(()=>rows.filter(r=>!filter || String(r.class_id)===filter),[rows,filter]);
  async function create(e: FormEvent) {
    e.preventDefault(); if(!selected)return;
    setBusy(true); setError('');
    try {await apiRequest('/api/v1/sessions',{method:'POST',body:JSON.stringify({class_id:selected})});setOpen(false);setSelected('');setSuccess('Sesión creada');await load();}
    catch(e){setError(e instanceof Error?e.message:'No se pudo crear');}
    finally{setBusy(false);}
  }
  async function viewReport(row: Row) {
    setReport(null);setReportLoading(true);setError('');
    try {const r=await apiRequest<ApiEnvelope<Report>>(`/api/v1/sessions/${id(row)}/report`);setReport(r.data);}
    catch(e){setError(e instanceof Error?e.message:'No se pudo consultar el reporte');}
    finally{setReportLoading(false);}
  }
  async function action(row: Row,kind:'start'|'end'|'rotate') {
    setError('');
    try {
      const path=kind==='rotate'?`/api/v1/sessions/${id(row)}/qr/rotate`:`/api/v1/sessions/${id(row)}/${kind}`;
      const r=await apiRequest<ApiEnvelope<Row>>(path,{method:'POST',body:'{}'});
      if(kind==='start')setQr(r.data.qr);
      if(kind==='rotate')setQr(r.data as Row['qr']);
      if(kind==='end'){setQr(undefined);await viewReport(row);}
      setSuccess(kind==='start'?'Sesión iniciada':kind==='end'?'Sesión finalizada':'QR renovado');await load();
    } catch(e){setError(e instanceof Error?e.message:'No se pudo realizar la acción');}
  }
  return <div className="page">
    <div className="page-heading"><div><p className="eyebrow">CHECKU · ASISTENCIA</p><h1>Sesiones</h1><p className="muted">Cada clase tiene sus sesiones y su historial independiente.</p></div>{canCreate&&<button className="button button-primary" onClick={()=>setOpen(true)}>＋ Nueva sesión</button>}</div>
    <Feedback error={error} success={success}/>
    <section className="panel"><div className="panel-heading"><h2>Mis sesiones</h2><label className="field"><span>Ver clase</span><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="">Todas las clases</option>{classes.map(c=><option key={id(c)} value={id(c)}>{String(c.subject_name??'Materia')} · {String(c.group_name??'Grupo')}</option>)}</select></label></div>
      <div className="checku-card-grid">{visible.map(r=><article className="checku-class-card" key={id(r)}><span className="pill">{statusName[String(r.status)]??String(r.status)}</span><h3>{String(r.subject_name??'Materia')}</h3><p>{String(r.group_name??'Grupo')} · {String(r.period_name??'Periodo')}</p><p className="muted small-text">{r.started_at?new Date(String(r.started_at)).toLocaleString():'Pendiente de inicio'}</p><div className="table-actions">
        {canReport&&<button className="button button-secondary button-small" onClick={()=>void viewReport(r)}>👥 Ver asistencia</button>}
        {canCreate&&r.status!=='active'&&r.status!=='closed'&&<button className="button button-primary button-small" onClick={()=>void action(r,'start')}>Iniciar · QR y PIN</button>}
        {canCreate&&r.status==='active'&&<><button className="button button-secondary button-small" onClick={()=>void action(r,'rotate')}>Renovar QR</button><button className="button button-primary button-small" onClick={()=>void action(r,'end')}>Finalizar</button></>}
      </div></article>)}{visible.length===0&&<p className="muted">No hay sesiones para este filtro.</p>}</div>
    </section>
    {reportLoading&&<div className="checku-modal-backdrop"><section className="panel checku-modal"><p>Cargando reporte de asistencia…</p></section></div>}
    {report&&<div className="checku-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setReport(null);}}><section className="panel checku-modal" role="dialog" aria-modal="true" aria-label="Reporte de sesión"><div className="panel-heading"><div><h2>{String(report.session.subject_name??'Reporte de sesión')}</h2><p className="muted">{String(report.session.group_name??'Grupo')} · {statusName[String(report.session.status)]??String(report.session.status)}</p></div><button className="button button-ghost" onClick={()=>setReport(null)}>✕</button></div>
      <div className="checku-stats"><div><strong>{report.counts.present??0}</strong><span>Asistieron</span></div><div><strong>{report.counts.late??0}</strong><span>Retardos</span></div><div><strong>{report.counts.absent??0}</strong><span>Faltaron</span></div><div><strong>{report.counts.pending??0}</strong><span>Pendientes</span></div></div>
      <p className="muted small-text">El abandono no se marca automáticamente: se necesita un mecanismo de salida verificado para distinguirlo de una falta.</p>
      <div className="checku-people">{report.students.map(p=><div className="checku-person" key={p.student_id}><strong>{p.full_name}</strong><span className="pill">{statusName[p.status]??p.status}</span>{p.recorded_at&&<small>{new Date(p.recorded_at).toLocaleString()}</small>}</div>)}{report.students.length===0&&<p>No hay alumnos inscritos asociados a esta sesión.</p>}</div>
    </section></div>}
    {qr&&<div className="checku-modal-backdrop"><section className="panel checku-modal" role="dialog" aria-modal="true"><div className="panel-heading"><h2>Asistencia abierta</h2><button className="button button-ghost" onClick={()=>setQr(undefined)}>✕</button></div><div className="checku-created">{qr.image&&<img src={qr.image} width={240} height={240} alt="QR de asistencia"/>}<p>PIN temporal</p><strong className="checku-code">{qr.code}</strong></div></section></div>}
    {open&&<div className="checku-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false);}}><section className="panel checku-modal" role="dialog" aria-modal="true"><div className="panel-heading"><h2>Nueva sesión</h2><button className="button button-ghost" onClick={()=>setOpen(false)}>✕</button></div><form className="form-stack" onSubmit={create}><label className="field"><span>Clase</span><select required value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Selecciona tu clase</option>{classes.map(c=><option key={id(c)} value={id(c)}>{String(c.subject_name??'Materia')} · {String(c.group_name??'Grupo')}</option>)}</select></label><button className="button button-primary" disabled={busy}>Crear sesión</button></form></section></div>}
  </div>;
}
