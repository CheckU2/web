import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import Feedback from "../components/Feedback";

export default function LoginPage() {
  const { signIn, token, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const registrationMessage = (location.state as { message?: string } | null)?.message;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <div className="page-loading">Comprobando sesión…</div>;
  if (token && user) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signIn(email, password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand brand-centered"><span className="brand-mark">C</span><span>CheckU</span></div>
        <p className="eyebrow">PLATAFORMA ACADÉMICA</p>
        <h1>Bienvenido de nuevo</h1>
        <p className="muted">Inicia sesión para continuar.</p>
        <form className="form-stack" onSubmit={handleSubmit}>
          <label className="field"><span>Correo electrónico</span><input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@institucion.edu" required /></label>
          <label className="field"><span>Contraseña</span><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Tu contraseña" required /></label>
          <Feedback error={error} success={registrationMessage} />
          <button className="button button-primary button-full" type="submit" disabled={submitting}>{submitting ? "Iniciando sesión…" : "Iniciar sesión"}</button>
        </form>
        <div className="auth-links"><Link to="/forgot-password">¿Olvidaste tu contraseña?</Link><span>¿No tienes cuenta? <Link to="/register">Regístrate</Link></span></div>
      </section>
    </main>
  );
}
