"use client";

import { firstName } from "@/lib/names";

import { useActionState, useEffect, useState } from "react";
import { addOptionAction, createPortfolioAction, publishAction, setAllocationsAction, updatePortfolioAction } from "@/app/actions/monthly";
import { adoptProposalAction } from "@/app/actions/proposals";
import { autoFormat, LESSON_TEMPLATE, Markdown } from "@/components/Markdown";

function Msg({ state }: { state: { error?: string; ok?: string } | undefined }) {
  if (!state) return null;
  if (state.error) return <p className="m-0 text-[13px] text-neutral-800">{state.error}</p>;
  if (state.ok) return <p className="m-0 text-[13px] text-accent-700">{state.ok}</p>;
  return null;
}

type Details = { id?: string; month: string; title: string; lesson: string; minChoices: number; maxChoices: number; deadline: string };

export function PortfolioDetailsForm({ initial, locked = false }: { initial: Details; locked?: boolean }) {
  const [state, action, pending] = useActionState(initial.id ? updatePortfolioAction : createPortfolioAction, undefined);
  const [lesson, setLesson] = useState(initial.lesson);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  return (
    <form action={action} className="flex flex-col gap-3">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))" }}>
        <div className="field"><label>Mes</label><input name="month" type="month" defaultValue={initial.month} className="input" required disabled={locked} /></div>
        <div className="field"><label>Mínimo a elegir</label><input name="minChoices" type="number" min={1} max={10} defaultValue={initial.minChoices} className="input" disabled={locked} /></div>
        <div className="field"><label>Máximo a elegir</label><input name="maxChoices" type="number" min={1} max={10} defaultValue={initial.maxChoices} className="input" disabled={locked} /></div>
        <div className="field"><label>Fecha límite (opcional)</label><input name="deadline" type="date" defaultValue={initial.deadline} className="input" disabled={locked} /></div>
      </div>
      <div className="field"><label>Título</label><input name="title" defaultValue={initial.title} className="input" placeholder="Octubre: dividendos frente a crecimiento" maxLength={120} required disabled={locked} /></div>
      <div className="field">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
          <label className="m-0">Lección del mes: explica la propuesta, qué deben investigar y qué quieres que aprendan</label>
          <div className="flex items-center gap-2">
            {!locked && mode === "edit" && !lesson.trim() && (
              <button type="button" className="btn-ghost text-xs" onClick={() => setLesson(LESSON_TEMPLATE)}>Usar plantilla</button>
            )}
            {!locked && mode === "edit" && lesson.trim() && autoFormat(lesson) !== lesson && (
              <button type="button" className="btn-ghost text-xs" onClick={() => setLesson(autoFormat(lesson))} title="Convierte el texto en títulos, listas y citas que puedes ajustar">Dar formato automático</button>
            )}
            <div className="seg">
              <label className="seg-opt" data-on={mode === "edit" ? "true" : "false"}>
                <input type="radio" name="_mode" checked={mode === "edit"} onChange={() => setMode("edit")} />Editar
              </label>
              <label className="seg-opt" data-on={mode === "preview" ? "true" : "false"}>
                <input type="radio" name="_mode" checked={mode === "preview"} onChange={() => setMode("preview")} />Previsualizar
              </label>
            </div>
          </div>
        </div>
        {/* El textarea se mantiene siempre montado para que el valor viaje con el formulario */}
        <textarea
          name="lesson"
          value={lesson}
          onChange={(e) => setLesson(e.target.value)}
          className="input"
          style={{ minHeight: 260, fontFamily: "var(--font-numeric)", fontSize: 13, display: mode === "edit" ? "block" : "none" }}
          placeholder={"## Objetivo del mes\nEscribe la lección con formato: títulos con #, **negrita**, listas con -, citas con > y tablas con |."}
          required
          disabled={locked}
        />
        {mode === "preview" && (
          <div className="card blueprint gap-3" style={{ padding: 28, borderColor: "var(--color-accent)" }}>
            <div className="card-kicker">Lección del mes · así la verán los miembros</div>
            {lesson.trim() ? <Markdown text={lesson} /> : <p className="m-0 text-sm text-neutral-700">Todavía no has escrito nada.</p>}
          </div>
        )}
        {mode === "edit" && (
          <p className="m-0 mt-1.5 text-xs text-neutral-700">
            Escribe con naturalidad: las líneas cortas sueltas se convierten en títulos, «Idea clave:» o «Importante:» en destacados, las preguntas en bloques de reflexión y las cifras y símbolos se resaltan solos. Si quieres más control:<code className="md-code">## Título</code> · <code className="md-code">**negrita**</code> · <code className="md-code">*cursiva*</code> · <code className="md-code">- lista</code> · <code className="md-code">1. numerada</code> · <code className="md-code">&gt; cita destacada</code> · <code className="md-code">| tabla |</code> · <code className="md-code">[enlace](https://…)</code> · línea en blanco entre párrafos.
          </p>
        )}
      </div>
      {!locked && (
        <div className="flex items-center gap-3">
          <button className="btn-primary" disabled={pending}>{pending ? "Guardando…" : initial.id ? "Guardar cambios" : "Crear borrador"}</button>
          <Msg state={state} />
        </div>
      )}
    </form>
  );
}

type Hit = { symbol: string; name: string; exchange: string; type: string };

export function AddOptionForm({ portfolioId }: { portfolioId: string }) {
  const [state, action, pending] = useActionState(addOptionAction, undefined);
  const [q, setQ] = useState("");
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/symbols?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        setHits(await res.json());
      } catch {
        /* cancelado */
      }
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);
  return (
    <form
      action={(fd) => {
        action(fd);
        setSymbol("");
        setName("");
        setQ("");
      }}
      className="flex flex-col gap-2"
    >
      <input type="hidden" name="id" value={portfolioId} />
      <input type="hidden" name="name" value={name} />
      <div className="grid gap-2" style={{ gridTemplateColumns: "minmax(200px, 1fr) 2fr auto" }}>
        <div className="relative">
          <input name="symbol" value={symbol} onChange={(e) => { setSymbol(e.target.value.toUpperCase()); setQ(e.target.value); setName(""); }} className="input uppercase" placeholder="Símbolo o nombre" autoComplete="off" required />
          {hits.length > 0 && q && (
            <ul className="absolute z-10 mt-1 w-[360px] max-w-[90vw] bg-paper border border-divider max-h-56 overflow-auto text-sm list-none m-0 p-0">
              {hits.map((h) => (
                <li key={h.symbol}>
                  <button type="button" className="w-full text-left px-3 py-2 hover:bg-surface" onClick={() => { setSymbol(h.symbol); setName(h.name); setQ(""); setHits([]); }}>
                    <b>{h.symbol}</b> <span className="text-neutral-700">{h.name}</span> <span className="text-xs text-neutral-600">{h.exchange} · {h.type}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <input name="note" className="input" placeholder="Qué investigar o por qué está en la lista (opcional)" maxLength={300} />
        <button className="btn-secondary" disabled={pending}>{pending ? "Añadiendo…" : "Añadir opción"}</button>
      </div>
      <Msg state={state} />
    </form>
  );
}

export function AllocationsForm({ portfolioId, members, decidedIds }: { portfolioId: string; members: { id: string; name: string; amount: number }[]; decidedIds: string[] }) {
  const [state, action, pending] = useActionState(setAllocationsAction, undefined);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={portfolioId} />
      <div className="overflow-x-auto"><table className="table">
        <thead><tr><th>Miembro</th><th className="text-right">Importe este mes (€)</th></tr></thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id}>
              <td>{firstName(m.name)}{decidedIds.includes(m.id) && <span className="tag tag-accent ml-2">ya ha decidido</span>}</td>
              <td className="text-right"><input name={`amount_${m.id}`} type="number" step="0.01" min="0" defaultValue={m.amount} className="input w-32 ml-auto text-right" disabled={decidedIds.includes(m.id)} /></td>
            </tr>
          ))}
        </tbody>
      </table></div>
      <div className="flex items-center gap-3">
        <button className="btn-secondary" disabled={pending}>{pending ? "Guardando…" : "Guardar importes"}</button>
        <Msg state={state} />
      </div>
    </form>
  );
}

export function PublishForm({ portfolioId, disabledReason }: { portfolioId: string; disabledReason: string | null }) {
  const [state, action, pending] = useActionState(publishAction, undefined);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={portfolioId} />
      <button className="btn-primary blueprint" disabled={pending || !!disabledReason} onClick={(e) => { if (!confirm("Al publicar se registra la paga de cada miembro y podrán empezar a decidir. ¿Continuar?")) e.preventDefault(); }}>
        {pending ? "Publicando…" : "Publicar cartera y repartir la paga"}
      </button>
      {disabledReason && <p className="m-0 text-xs text-neutral-700">{disabledReason}</p>}
      <Msg state={state} />
    </form>
  );
}

/** Botón de las propuestas sugeridas en Carteras: crea el borrador de ese mes directamente desde el repositorio. */
export function UseSuggestionForm({ proposalId, month, label }: { proposalId: string; month: string; label: string }) {
  const [state, action, pending] = useActionState(adoptProposalAction, undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="proposalId" value={proposalId} />
      <input type="hidden" name="month" value={month} />
      <button className="btn-primary py-1.5 text-xs" disabled={pending}>{pending ? "Creando…" : `Usar para ${label}`}</button>
      {state?.error && <span role="alert" className="text-xs text-neutral-800">{state.error}</span>}
    </form>
  );
}
