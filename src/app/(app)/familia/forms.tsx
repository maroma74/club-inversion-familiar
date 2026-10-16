"use client";

import { useActionState } from "react";
import { addContributionAction, payMonthlyAllowanceAction, setAllowanceAction } from "@/app/actions/invest";
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
