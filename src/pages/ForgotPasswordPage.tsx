import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "../api/auth.api";
import Feedback from "../components/Feedback";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSuccess(""); setSubmitting(true);
    try {
      const response = await requestPasswordReset(email.trim());
      setSuccess(response.data.message || "Si la cuenta existe, recibirás instrucciones para recuperar tu contraseña.");
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo enviar la solicitud."); }
    finally { setSubmitting(false); }
  }

  return <main className="auth-page"><section className="auth-card">
    <div className="brand brand-centered"><span className="brand-mark">C</span><span>CheckU</span></div>
    <p className="eyebrow">RECUPERACIÓN DE CUENTA</p><h1>Recupera tu contraseña</h1>
    <p className="muted">Si tu cuenta existe, te enviaremos las instrucciones por correo.</p>
    <form className="form-stack" onSubmit={handleSubmit}>
      <label className="field"><span>Correo electrónico</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label>
      <Feedback error={error} success={success} />
      <button className="button button-primary button-full" type="submit" disabled={submitting}>{submitting ? "Enviando…" : "Enviar instrucciones"}</button>
    </form>
    <p className="auth-bottom"><Link to="/login">Volver al inicio de sesión</Link></p>
  </section></main>;
}
