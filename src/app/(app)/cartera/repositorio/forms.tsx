"use client";

import { useActionState, useState } from "react";
import { adoptProposalAction, shareProposalAction } from "@/app/actions/proposals";
import { PROPOSAL_THEMES, proposalProblems, RISK_LABEL, type ProposalInput } from "@/lib/proposals";

function Msg({ state }: { state: { error?: string; ok?: string } | undefined }) {
  if (!state) return null;
  if (state.error) return <p role="alert" className="m-0 text-[13px] text-neutral-800">{state.error}</p>;
  if (state.ok) return <p role="status" className="m-0 text-[13px] text-accent-700">{state.ok}</p>;
  return null;
}

/** Elegir el mes y crear el borrador de la cartera a partir de una propuesta. */
export function UseProposalForm({ proposalId, defaultMonth }: { proposalId: string; defaultMonth: string }) {
  const [state, action, pending] = useActionState(adoptProposalAction, undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="proposalId" value={proposalId} />
      <div className="field">
        <label htmlFor={`mes-${proposalId}`}>Mes de la cartera</label>
        <input id={`mes-${proposalId}`} name="month" type="month" defaultValue={defaultMonth} className="input" required />
      </div>
      <button className="btn-primary" disabled={pending}>{pending ? "Creando…" : "Usar esta propuesta"}</button>
      <Msg state={state} />
    </form>
  );
}

/**
 * Casilla «Compartir en el repositorio» de una cartera: pública y firmada con el nombre de la familia, o anónima.
 * Antes de guardar enseña, en vivo, lo que habría que cambiar para cumplir la normativa del club (texto neutro).
 */
export function ShareProposalForm({
  portfolioId,
  familyName,
  initial,
  snapshot,
}: {
  portfolioId: string;
  familyName: string;
  initial: { shared: boolean; signed: boolean; theme: string; risk: number };
  snapshot: Omit<ProposalInput, "theme" | "risk">;
}) {
  const [state, action, pending] = useActionState(shareProposalAction, undefined);
  const [on, setOn] = useState(initial.shared);
  const [theme, setTheme] = useState(initial.theme);
  const [risk, setRisk] = useState(initial.risk);
  const problems = on ? proposalProblems({ ...snapshot, theme, risk }) : [];

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="portfolioId" value={portfolioId} />
      <label className="flex items-start gap-2.5 cursor-pointer">
        <input type="checkbox" name="share" checked={on} onChange={(e) => setOn(e.target.checked)} className="mt-1" />
        <span>
          <b>Compartir esta propuesta en el repositorio</b>
          <span className="block text-[13px] text-neutral-700">Cualquier presidente podrá usarla como punto de partida para su cartera. Se comparte una copia del título, la lección y las opciones; los importes, las decisiones y los miembros nunca se comparten.</span>
        </span>
      </label>

      <fieldset disabled={!on} className="grid gap-3 border-0 p-0 m-0" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", opacity: on ? 1 : 0.55 }}>
        <div className="field">
          <span className="label">Cómo quieres que aparezca</span>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" name="visibility" value="signed" defaultChecked={initial.signed} /> Firmada: saldrá como <b>{familyName}</b>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" name="visibility" value="anonymous" defaultChecked={!initial.signed} /> Anónima: no se muestra tu familia
          </label>
        </div>
        <div className="field">
          <label htmlFor="share-theme">Tema</label>
          <select id="share-theme" name="theme" value={theme} onChange={(e) => setTheme(e.target.value)} className="input" required>
            <option value="" disabled>Elige un tema</option>
            {PROPOSAL_THEMES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="share-risk">Nivel de riesgo</label>
          <select id="share-risk" name="risk" value={risk || ""} onChange={(e) => setRisk(Number(e.target.value))} className="input" required>
            <option value="" disabled>Elige el riesgo</option>
            {[1, 2, 3, 4, 5].map((r) => <option key={r} value={r}>{r} · {RISK_LABEL[r]}</option>)}
          </select>
        </div>
      </fieldset>

      {on && problems.length > 0 && (
        <div role="alert" className="rounded-lg border px-4 py-3 text-[13px]" style={{ borderColor: "#e5a016", background: "var(--color-amber-100)", color: "var(--color-amber-700)" }}>
          <b>Antes de compartirla, corrige esto:</b>
          <ul className="m-0 mt-1 pl-5 flex flex-col gap-0.5">{problems.slice(0, 5).map((p) => <li key={p}>{p}</li>)}</ul>
        </div>
      )}
      {on && problems.length === 0 && <p className="m-0 text-[13px] text-accent-700">Cumple la normativa del club: texto neutro y datos completos.</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled={pending}>{pending ? "Guardando…" : on ? "Guardar y compartir" : "Guardar"}</button>
        <Msg state={state} />
      </div>
    </form>
  );
}
