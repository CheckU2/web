import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../api/auth.api";
import Feedback from "../components/Feedback";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password !== confirmation) { setError("Las contraseñas no coinciden."); return; }
    if (password.length < 12) { setError("La contraseña debe tener al menos 12 caracteres."); return; }
    setSubmitting(true);
    try {
      await register({ full_name: fullName.trim(), email: email.trim(), password });
      navigate("/login", { replace: true, state: { message: "Cuenta creada. Ahora puedes iniciar sesión." } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la cuenta.");
    } finally { setSubmitting(false); }
  }

  return (
    <main className="auth-page"><section className="auth-card">
      <div className="brand brand-centered"><span className="brand-mark">C</span><span>CheckU</span></div>
      <p className="eyebrow">REGISTRO DE ESTUDIANTE</p><h1>Crea tu cuenta</h1>
      <p className="muted">Usa tu correo y una contraseña de al menos 12 caracteres.</p>
      <form className="form-stack" onSubmit={handleSubmit}>
        <label className="field"><span>Nombre completo</span><input value={fullName} onChange={(e) => setFullName(e.target.value)} minLength={2} maxLength={120} autoComplete="name" required /></label>
        <label className="field"><span>Correo electrónico</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label>
        <label className="field"><span>Contraseña</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={12} maxLength={128} autoComplete="new-password" required /></label>
        <label className="field"><span>Confirmar contraseña</span><input type="password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} minLength={12} autoComplete="new-password" required /></label>
        <Feedback error={error} />
        <button className="button button-primary button-full" type="submit" disabled={submitting}>{submitting ? "Creando cuenta…" : "Crear cuenta"}</button>
      </form>
      <p className="auth-bottom">¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></p>
    </section></main>
  );
}
