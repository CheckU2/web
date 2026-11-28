import { useState } from "react";

export default function ProximityPage() {
  const [status, setStatus] = useState<"idle" | "checking" | "ok" | "fail">("idle");
  const [message, setMessage] = useState("Presiona para validar proximidad y evitar suplantación.");

  async function validateProximity() {
    setStatus("checking");
    setMessage("Validando evento de proximidad...");
    try {
      // Simulación de desafío de proximidad (HU11)
      await new Promise((r) => setTimeout(r, 800));
      const ok = Math.random() > 0.2;
      if (ok) {
        setStatus("ok");
        setMessage("Proximidad confirmada. Puedes registrar asistencia.");
      } else {
        setStatus("fail");
        setMessage("No se confirmó la proximidad. Intenta de nuevo cerca del aula.");
      }
    } catch {
      setStatus("fail");
      setMessage("Error al validar proximidad.");
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: "2rem auto", padding: "1.5rem" }}>
      <h1>Proximidad (HU11)</h1>
      <p>Pantalla para prevenir suplantación con desafío de proximidad.</p>
      <p>{message}</p>
      <button type="button" onClick={validateProximity} disabled={status === "checking"}>
        {status === "checking" ? "Validando..." : "Validar proximidad"}
      </button>
      {status === "ok" && <p style={{ color: "green" }}>✓ OK</p>}
      {status === "fail" && <p style={{ color: "crimson" }}>✗ Falló</p>}
    </div>
  );
}