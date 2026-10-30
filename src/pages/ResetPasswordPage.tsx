import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { resetPassword } from "../api/auth.api";
import Feedback from "../components/Feedback";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const resetToken = searchParams.get("token") ?? "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSuccess("");
    if (!resetToken) { setError("El enlace no contiene un token de recuperación."); return; }
    if (password !== confirmation) { setError("Las contraseñas no coinciden."); return; }
    setSubmitting(true);
    try {
      const response = await resetPassword(resetToken, password);
      setSuccess(response.data.message || "Contraseña actualizada.");
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo cambiar la contraseña."); }
    finally { setSubmitting(false); }
  }

  return <main className="auth-page"><section className="auth-card">
    <div className="brand brand-centered"><span className="brand-mark">C</span><span>CheckU</span></div>
    <p className="eyebrow">SEGURIDAD</p><h1>Define una contraseña nueva</h1>
    <p className="muted">La contraseña debe tener entre 12 y 128 caracteres.</p>
    <form className="form-stack" onSubmit={handleSubmit}>
      <label className="field"><span>Nueva contraseña</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={12} maxLength={128} autoComplete="new-password" required /></label>
      <label className="field"><span>Confirmar contraseña</span><input type="password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} minLength={12} maxLength={128} autoComplete="new-password" required /></label>
      <Feedback error={error} success={success} />
      <button className="button button-primary button-full" type="submit" disabled={submitting || !resetToken}>{submitting ? "Actualizando…" : "Cambiar contraseña"}</button>
    </form>
    <p className="auth-bottom"><Link to="/login">Volver al inicio de sesión</Link></p>
  </section></main>;
}
