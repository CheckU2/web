import { useState, type ReactNode } from "react";
import { CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon, XCircleIcon, XMarkIcon } from "@heroicons/react/24/solid";

interface FeedbackProps {
  error?: string;
  success?: string;
  warning?: string;
  info?: string;
  title?: string;
  actions?: ReactNode;
  dismissible?: boolean;
}

const icons = { error: XCircleIcon, warning: ExclamationCircleIcon, success: CheckCircleIcon, info: InformationCircleIcon };
const headings = { error: "No se pudo completar", warning: "Requiere atención", info: "Información" };
type Tone = keyof typeof icons;

function FeedbackNotice({ tone, title, message, actions, dismissible }: {
  tone: Tone;
  title: string;
  message?: string;
  actions?: ReactNode;
  dismissible: boolean;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  const Icon = icons[tone];
  return (
    <div className={`feedback feedback-${tone}`}>
      <Icon className="feedback-icon" aria-hidden="true" />
      <div className="feedback-copy">
        <div role={tone === "error" ? "alert" : "status"}>
          <strong className="feedback-title">{title}</strong>
          {message && <p className="feedback-message">{message}</p>}
        </div>
        {actions && <div className="feedback-actions">{actions}</div>}
      </div>
      {dismissible && <button className="feedback-dismiss" type="button" aria-label="Cerrar aviso" onClick={() => setDismissed(true)}>
        <XMarkIcon aria-hidden="true" />
      </button>}
    </div>
  );
}

export default function Feedback({ error, success, warning, info, title, actions, dismissible = true }: FeedbackProps) {
  const message = error || warning || success || info;
  if (!message) return null;
  const tone = error ? "error" : warning ? "warning" : success ? "success" : "info";
  const heading = title ?? (tone === "success" ? message : headings[tone]);
  return <FeedbackNotice key={`${tone}:${heading}:${message}`} tone={tone} title={heading}
    message={heading === message ? undefined : message} actions={actions} dismissible={dismissible} />;
}
