import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api/http";
import { useAuth } from "../auth/AuthContext";
import Feedback from "../components/Feedback";

export default function AccountPage() {
  const { user, refreshUser, signOut } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [editing, setEditing] = useState(false);
  const [bannerColor, setBannerColor] = useState(user?.banner_color ?? "#63B89F");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [avatar, setAvatar] = useState<string | null>(user?.avatar ?? null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  async function onImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 250000) {
      setProfileError('Selecciona una imagen PNG, JPG o WEBP de menos de 250 KB.'); return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatar(typeof reader.result === 'string' ? reader.result : null);
    reader.readAsDataURL(file);
  }
  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setProfileError(""); setProfileSuccess(""); setSavingProfile(true);
    try {
      await apiRequest('/api/v1/auth/profile', { method: 'PATCH', body: JSON.stringify({ full_name: fullName.trim(), bio, avatar, banner_color: bannerColor }) });
      await refreshUser(); setProfileSuccess("Tu perfil se actualizó correctamente."); setEditing(false);
    } catch (err) { setProfileError(err instanceof Error ? err.message : "No se pudo actualizar el perfil."); }
    finally { setSavingProfile(false); }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPasswordError(""); setPasswordSuccess("");
    if (newPassword !== confirmation) { setPasswordError("Las contraseñas nuevas no coinciden."); return; }
    if (newPassword.length < 12) { setPasswordError("La contraseña nueva debe tener al menos 12 caracteres."); return; }
    setSavingPassword(true);
    try {
      const response = await apiRequest<{ data?: { message?: string } }>("/api/v1/auth/change-password", { method: "PATCH", body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }) });
      setPasswordSuccess(response.data?.message ?? "Contraseña actualizada.");
      setCurrentPassword(""); setNewPassword(""); setConfirmation("");
      await signOut().catch(() => undefined);
      navigate("/login", { replace: true, state: { message: "Contraseña actualizada. Inicia sesión con tu nueva contraseña." } });
    } catch (err) { setPasswordError(err instanceof Error ? err.message : "No se pudo cambiar la contraseña."); }
    finally { setSavingPassword(false); }
  }

  const roleNames: Record<string, string> = {student:"Alumno",teacher:"Docente",tutor:"Tutor",career_admin:"Administrador de carrera",admin:"Administrador",super_admin:"Administrador general"};
  return (
    <div className="page">
      <div className="page-heading"><div><p className="eyebrow">CONFIGURACIÓN PERSONAL</p><h1>Mi cuenta</h1><p className="muted">Actualiza tus datos y protege el acceso a tu cuenta.</p></div></div>
      <section className="panel checku-profile-card">
        <div className="checku-profile-banner" style={{backgroundColor: user?.banner_color ?? "#63B89F"}} />
        <div className="checku-profile-summary"><div className="checku-profile-avatar">{user?.avatar ? <img src={user.avatar} alt="Foto de perfil" /> : <span>{(user?.full_name ?? "C")[0]}</span>}</div><h2>{user?.full_name ?? "Mi perfil"}</h2><span className="pill">{roleNames[user?.role ?? ""] ?? "Usuario"}</span><p>{user?.bio || "Puedes agregar una descripción sobre ti."}</p><p className="muted">{user?.email}</p><button className="button button-primary" onClick={() => setEditing(true)}>Editar perfil</button></div>
        {editing && <div className="checku-modal-backdrop" onMouseDown={e => {if(e.target===e.currentTarget)setEditing(false)}}><div className="panel checku-modal" role="dialog" aria-modal="true" aria-label="Editar perfil">
        <div className="panel-heading"><h2>Editar perfil</h2><button className="button button-ghost" onClick={() => setEditing(false)} aria-label="Cerrar">Cerrar</button></div>
        
        
        <Feedback error={profileError} success={profileSuccess} />
        <form className="form-stack account-form" onSubmit={updateProfile}>
          <label className="field"><span>Color sólido de portada</span><input type="color" value={bannerColor} onChange={e => setBannerColor(e.target.value)} /></label>
          <div className="profile-picture">{avatar ? <img src={avatar} alt="Mi foto de perfil" /> : <div className="profile-initial">{(user?.full_name ?? 'C')[0]}</div>}<label className="field"><span>Foto de perfil (máximo 250 KB)</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => void onImage(e)} /></label>{avatar && <button type="button" className="button button-secondary button-small" onClick={() => setAvatar(null)}>Quitar foto</button>}</div>
          <label className="field"><span>Nombre completo</span><input value={fullName} onChange={(event) => setFullName(event.target.value)} minLength={2} maxLength={120} required /></label>
          <label className="field"><span>Acerca de mí</span><textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={400} rows={3} placeholder="Una breve presentación…" /></label>
          <div><button className="button button-primary" type="submit" disabled={savingProfile}>{savingProfile ? "Guardando…" : "Guardar perfil"}</button></div>
        </form>
        </div></div>}
      </section>
      <section className="panel">
        <h2>Cambiar contraseña</h2>
        <p className="muted small-text">Después de cambiarla, tendrás que iniciar sesión de nuevo.</p>
        <Feedback error={passwordError} success={passwordSuccess} />
        <form className="form-stack account-form" onSubmit={changePassword}>
          <label className="field"><span>Contraseña actual</span><input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" required /></label>
          <label className="field"><span>Contraseña nueva</span><input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={12} maxLength={128} autoComplete="new-password" required /></label>
          <label className="field"><span>Confirmar contraseña nueva</span><input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={12} maxLength={128} autoComplete="new-password" required /></label>
          <div><button className="button button-primary" type="submit" disabled={savingPassword}>{savingPassword ? "Actualizando…" : "Cambiar contraseña"}</button></div>
        </form>
      </section>
    </div>
  );
}
