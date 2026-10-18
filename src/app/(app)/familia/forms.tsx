"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addContributionAction, payMonthlyAllowanceAction, setAllowanceAction } from "@/app/actions/invest";
import { renameFamilyAction } from "@/app/actions/family";
import { eur } from "@/lib/format";

function Msg({ state }: { state: { error?: string; ok?: string } | undefined }) {
  if (!state) return null;
  if (state.error) {
    return (
      <p role="alert" className="m-0 text-sm font-medium p-2.5 border border-divider rounded-[10px]" style={{ background: "var(--color-amber-100)", color: "var(--color-amber-700)" }}>
        {state.error}
      </p>
    );
  }
  if (state.ok) return <p role="status" className="m-0 text-sm text-accent-700">{state.ok}</p>;
  return null;
}

/** Nombre de la familia con botón «Editar» (solo el presidente): al pulsarlo, campo en línea con Guardar y Cancelar. */
export function FamilyNameEditor({ name }: { name: string }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(renameFamilyAction, undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);
  // Al guardar bien se vuelve a la vista normal con el nombre nuevo
  useEffect(() => { if (state?.ok) setEditing(false); }, [state]);

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="card-kicker">{name}</span>
        <button type="button" className="btn-ghost text-xs py-0.5" onClick={() => setEditing(true)} aria-label={`Editar el nombre de la familia (${name})`}>Editar</button>
        {state?.ok && <span role="status" className="text-xs text-accent-700">{state.ok}</span>}
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-wrap items-end gap-2 mb-3" onKeyDown={(e) => { if (e.key === "Escape") setEditing(false); }}>
      <div className="field">
        <label htmlFor="familia-nombre">Nombre de la familia</label>
        <input ref={inputRef} id="familia-nombre" name="name" defaultValue={name} required minLength={2} maxLength={60} className="input w-[min(100%,320px)]" autoComplete="off" />
      </div>
      <button className="btn-primary" disabled={pending}>{pending ? "Guardando…" : "Guardar"}</button>
      <button type="button" className="btn-ghost" onClick={() => setEditing(false)} disabled={pending}>Cancelar</button>
      {state?.error && <p role="alert" className="m-0 w-full text-sm text-neutral-800">{state.error}</p>}
    </form>
  );
}

export function AllowanceForm({ current }: { current: number }) {
  const [state, action, pending] = useActionState(setAllowanceAction, undefined);
  return (
    <form action={action} className="mt-1.5 flex flex-col gap-2">
      <div className="flex gap-2 items-end">
        <div className="field flex-1"><label htmlFor="paga-importe">Cambiar importe (€ por persona)</label><input id="paga-importe" name="amount" type="number" step="0.01" min="0" defaultValue={current} className="input" required /></div>
        <button className="btn-secondary" disabled={pending}>Guardar</button>
      </div>
      <Msg state={state} />
    </form>
  );
}

export function PayAllowanceForm({ defaultMonth, allowance, memberCount }: { defaultMonth: string; allowance: number; memberCount: number }) {
  const [state, action, pending] = useActionState(payMonthlyAllowanceAction, undefined);
  const summary = `Se registrará ${eur(allowance)} a cada miembro que aún no la tenga (hasta ${memberCount} ${memberCount === 1 ? "persona" : "personas"}).`;
  return (
    <form
      action={action}
      className="flex flex-col gap-2 mt-1.5"
      onSubmit={(e) => {
        const month = new FormData(e.currentTarget).get("month");
        if (!window.confirm(`¿Repartir la paga de ${month}? ${summary}`)) e.preventDefault();
      }}
    >
      <div className="field">
        <label htmlFor="paga-mes">Mes de la paga</label>
        <input id="paga-mes" name="month" type="month" defaultValue={defaultMonth} max={defaultMonth} className="input" required />
      </div>
      <p className="m-0 text-sm text-neutral-700">{summary}</p>
      <Msg state={state} />
      <button className="btn-primary" disabled={pending}>{pending ? "Registrando…" : "Repartir la paga"}</button>
    </form>
  );
}

export function ContributionForm({ members }: { members: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(addContributionAction, undefined);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="field">
        <label htmlFor="ap-miembro">Miembro</label>
        <select id="ap-miembro" name="userId" className="input" required>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="field">
          <label htmlFor="ap-importe">Importe (€)</label>
          <input id="ap-importe" name="amount" type="number" step="0.01" className="input" required />
        </div>
        <div className="field">
          <label htmlFor="ap-fecha">Fecha</label>
          <input id="ap-fecha" name="date" type="date" defaultValue={today} max={today} className="input" required />
        </div>
      </div>
      <div className="field">
        <label htmlFor="ap-nota">Nota (opcional)</label>
        <input id="ap-nota" name="note" className="input" />
      </div>
      <Msg state={state} />
      <button className="btn-secondary w-full" disabled={pending}>{pending ? "Añadiendo…" : "Añadir aportación"}</button>
    </form>
  );
}
