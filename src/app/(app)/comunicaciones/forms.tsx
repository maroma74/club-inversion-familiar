"use client";

import { useActionState, useState, useTransition } from "react";
import { createCommunicationAction, markOpenedAction } from "@/app/actions/communications";
import { DEFAULT_PORTFOLIO_TEMPLATE, MESSAGE_PLACEHOLDERS, renderMessage, templateProblems, whatsappLink, type MessageVars } from "@/lib/communications";
import { CopyButton } from "@/components/CopyButton";

export type PortfolioOption = { id: string; label: string; status: string; preview: MessageVars };

/** Redactar el aviso: cartera, plantilla editable con marcadores y vista previa con los datos de un miembro real. */
export function ComposeForm({ portfolios, initialPortfolioId }: { portfolios: PortfolioOption[]; initialPortfolioId: string }) {
  const [state, action, pending] = useActionState(createCommunicationAction, undefined);
  const [portfolioId, setPortfolioId] = useState(initialPortfolioId);
  const [template, setTemplate] = useState(DEFAULT_PORTFOLIO_TEMPLATE);
  const current = portfolios.find((p) => p.id === portfolioId) ?? portfolios[0];
  const problems = templateProblems(template);
  const preview = current ? renderMessage(template, current.preview) : "";
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))" }}>
        <div className="field">
          <label htmlFor="cm-portfolio">Cartera</label>
          <select id="cm-portfolio" name="portfolioId" className="input" value={portfolioId} onChange={(e) => setPortfolioId(e.target.value)}>
            {portfolios.map((p) => <option key={p.id} value={p.id}>{p.label}{p.status === "CLOSED" ? " (cerrada)" : ""}</option>)}
          </select>
        </div>
        <div className="field">
          <span className="label">Marcadores</span>
          <div className="flex flex-wrap gap-1">
            {MESSAGE_PLACEHOLDERS.map((m) => <button key={m} type="button" className="tag tag-outline cursor-pointer" onClick={() => setTemplate((t) => t + (t.endsWith(" ") || t.endsWith("\n") ? "" : " ") + m)} title={`Añadir ${m} al final`}>{m}</button>)}
          </div>
        </div>
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))" }}>
        <div className="field">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="cm-template">Mensaje (plantilla)</label>
            {template !== DEFAULT_PORTFOLIO_TEMPLATE && <button type="button" className="btn-ghost text-xs" onClick={() => setTemplate(DEFAULT_PORTFOLIO_TEMPLATE)}>Volver a la plantilla del club</button>}
          </div>
          <textarea id="cm-template" name="template" className="input" rows={12} value={template} onChange={(e) => setTemplate(e.target.value)} maxLength={1500} required />
          <p className="m-0 text-xs text-neutral-700">En WhatsApp, *asteriscos* ponen el texto en negrita. El enlace se completa solo para cada miembro.</p>
        </div>
        <div className="field">
          <span className="label">Así lo recibirá {current?.preview.nombre ?? "cada miembro"}</span>
          <pre className="m-0 whitespace-pre-wrap rounded-lg border border-divider px-4 py-3 text-sm font-sans [text-wrap:pretty]" style={{ background: "var(--color-surface-2)" }}>{preview}</pre>
        </div>
      </div>
      {problems.length > 0 && <p role="alert" className="m-0 text-[13px]" style={{ color: "var(--color-amber-700)" }}>{problems.join(" ")}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled={pending || problems.length > 0 || !current}>{pending ? "Preparando…" : "Preparar el aviso para cada miembro"}</button>
        {state?.error && <p role="alert" className="m-0 text-sm text-neutral-800">{state.error}</p>}
        {state?.ok && <p role="status" className="m-0 text-sm text-accent-700">{state.ok}</p>}
      </div>
    </form>
  );
}

/** Botón que abre WhatsApp con el mensaje escrito para ese miembro y deja constancia de cuándo se hizo. */
export function WhatsAppSendButton({ communicationId, userId, phone, text, openedAt }: { communicationId: string; userId: string; phone: string; text: string; openedAt: string | null }) {
  const [, start] = useTransition();
  const [opened, setOpened] = useState(openedAt);
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <a
        href={whatsappLink(phone, text)}
        target="_blank"
        rel="noopener noreferrer"
        className={opened ? "btn-secondary py-1 text-xs" : "btn-primary py-1 text-xs"}
        onClick={() => {
          if (!opened) setOpened(new Date().toISOString());
          start(() => { void markOpenedAction(communicationId, userId); });
        }}
      >
        {opened ? "Volver a abrir en WhatsApp" : "Enviar por WhatsApp"}
      </a>
      {opened && <span className="text-xs text-neutral-700">abierto el {new Date(opened).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>}
    </span>
  );
}

export function CopyText({ text, label }: { text: string; label: string }) {
  return <CopyButton text={text} label={label} />;
}
