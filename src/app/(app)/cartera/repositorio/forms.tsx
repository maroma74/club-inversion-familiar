"use client";

import { useActionState, useState } from "react";
import { adoptProposalAction, createProposalAction, shareProposalAction } from "@/app/actions/proposals";
import { autoFormat, LESSON_TEMPLATE, Markdown } from "@/components/Markdown";
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

/** Alta de una propuesta en el catálogo. La normativa (texto neutro, límites) se comprueba en vivo sobre lo escrito y de nuevo en el servidor. */
export function NewProposalForm({ familyName }: { familyName: string }) {
  const [state, action, pending] = useActionState(createProposalAction, undefined);
  const [title, setTitle] = useState("");
  const [lesson, setLesson] = useState("");
  const [options, setOptions] = useState("");
  const [theme, setTheme] = useState("");
  const [risk, setRisk] = useState(0);
  const [minChoices, setMin] = useState(1);
  const [maxChoices, setMax] = useState(2);
  const [preview, setPreview] = useState(false);
  const optionLines = options.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => { const [sym, ...rest] = l.split("|"); return { symbol: sym.trim().toUpperCase(), name: sym.trim().toUpperCase(), kind: "STOCK", note: rest.join("|").trim() || null }; });
  const problems = title || lesson || options ? proposalProblems({ title, lesson, theme, risk, minChoices, maxChoices, options: optionLines }) : [];

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))" }}>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label htmlFor="np-title">Título</label>
          <input id="np-title" name="title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Dividendos de calidad" required />
        </div>
        <div className="field">
          <label htmlFor="np-theme">Tema</label>
          <select id="np-theme" name="theme" className="input" value={theme} onChange={(e) => setTheme(e.target.value)} required>
            <option value="" disabled>Elige un tema</option>
            {PROPOSAL_THEMES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="np-risk">Nivel de riesgo</label>
          <select id="np-risk" name="risk" className="input" value={risk || ""} onChange={(e) => setRisk(Number(e.target.value))} required>
            <option value="" disabled>Elige el riesgo</option>
            {[1, 2, 3, 4, 5].map((r) => <option key={r} value={r}>{r} · {RISK_LABEL[r]}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="np-min">Mínimo a elegir</label>
          <input id="np-min" name="minChoices" type="number" min={1} max={10} className="input" value={minChoices} onChange={(e) => setMin(Number(e.target.value))} />
        </div>
        <div className="field">
          <label htmlFor="np-max">Máximo a elegir</label>
          <input id="np-max" name="maxChoices" type="number" min={1} max={10} className="input" value={maxChoices} onChange={(e) => setMax(Number(e.target.value))} />
        </div>
      </div>

      <div className="field">
        <label htmlFor="np-options">Opciones: una por línea, «SÍMBOLO | qué investigar» (de 2 a 12)</label>
        <textarea id="np-options" name="options" className="input" rows={5} value={options} onChange={(e) => setOptions(e.target.value)} placeholder={"VWCE.DE | Mira el TER y cuántas empresas contiene\nKO | Dividendo, deuda y si el beneficio por acción crece\nBTC-EUR | Volatilidad: ¿aguantarías una caída del 30 %?"} required />
        <p className="m-0 text-xs text-neutral-700">El nombre y el tipo (acción, ETF, cripto, materia prima) se completan solos al guardar comprobando que el valor cotiza.</p>
      </div>

      <div className="field">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor="np-lesson">Lección (de 200 a 8000 caracteres; admite Markdown)</label>
          <div className="flex gap-2">
            {!lesson.trim() && <button type="button" className="btn-ghost text-xs" onClick={() => setLesson(LESSON_TEMPLATE)}>Usar plantilla</button>}
            {lesson.trim() && autoFormat(lesson) !== lesson && <button type="button" className="btn-ghost text-xs" onClick={() => setLesson(autoFormat(lesson))}>Dar formato automático</button>}
            <button type="button" className="btn-ghost text-xs" onClick={() => setPreview((v) => !v)}>{preview ? "Editar" : "Previsualizar"}</button>
          </div>
        </div>
        {preview ? (
          <div className="rounded-lg border border-divider p-4">{lesson.trim() ? <Markdown text={lesson} /> : <p className="m-0 text-sm text-neutral-700">Todavía no has escrito nada.</p>}</div>
        ) : (
          <textarea id="np-lesson" name="lesson" className="input" rows={14} value={lesson} onChange={(e) => setLesson(e.target.value)} required />
        )}
        {preview && <input type="hidden" name="lesson" value={lesson} />}
      </div>

      <div className="field">
        <span className="label">Cómo aparece en el catálogo</span>
        <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" name="visibility" value="signed" defaultChecked /> Firmada: saldrá como <b>{familyName}</b></label>
        <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" name="visibility" value="anonymous" /> Anónima: no se muestra tu familia</label>
      </div>

      {problems.length > 0 && (
        <div role="alert" className="rounded-lg border px-4 py-3 text-[13px]" style={{ borderColor: "#e5a016", background: "var(--color-amber-100)", color: "var(--color-amber-700)" }}>
          <b>Antes de guardar, corrige esto:</b>
          <ul className="m-0 mt-1 pl-5 flex flex-col gap-0.5">{problems.slice(0, 5).map((p) => <li key={p}>{p}</li>)}</ul>
        </div>
      )}
      {(title || lesson || options) && problems.length === 0 && <p className="m-0 text-[13px] text-accent-700">Cumple la normativa del club (los símbolos se comprobarán al guardar).</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled={pending}>{pending ? "Comprobando valores y guardando…" : "Guardar en el catálogo"}</button>
        <Msg state={state} />
      </div>
    </form>
  );
}
