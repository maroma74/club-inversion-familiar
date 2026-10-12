"use client";

import { useActionState } from "react";
import { addContributionAction, payMonthlyAllowanceAction, setAllowanceAction } from "@/app/actions/invest";

function Msg({ state }: { state: { error?: string; ok?: string } | undefined }) {
  if (!state) return null;
  if (state.error) return <p className="text-xs text-red-600">{state.error}</p>;
  if (state.ok) return <p className="text-xs text-green-600">{state.ok}</p>;
  return null;
}

export function AllowanceForm({ current }: { current: number }) {
  const [state, action, pending] = useActionState(setAllowanceAction, undefined);
  return (
    <form action={action} className="mt-1.5">
      <div className="flex gap-2 items-end">
        <div className="field flex-1"><label>Cambiar importe</label><input name="amount" type="number" step="0.01" min="0" defaultValue={current} className="input" required /></div>
        <button className="btn-secondary" style={{ minHeight: 36 }} disabled={pending}>Guardar</button>
      </div>
      <Msg state={state} />
    </form>
  );
}

export function PayAllowanceForm({ defaultMonth, amountLabel }: { defaultMonth: string; amountLabel?: string }) {
  const [state, action, pending] = useActionState(payMonthlyAllowanceAction, undefined);
  return (
    <form action={action} className="space-y-2 mt-1.5">
      <input name="month" type="month" defaultValue={defaultMonth} className="input" required />
      <Msg state={state} />
      <button className="btn-primary blueprint" disabled={pending}>{pending ? "Registrando…" : `Repartir${amountLabel ? ` ${amountLabel}` : " paga"}`}</button>
    </form>
  );
}

export function ContributionForm({ members }: { members: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(addContributionAction, undefined);
  return (
    <form action={action} className="space-y-2">
      <select name="userId" className="input" required>
        {members.map((m) => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-2">
        <input name="amount" type="number" step="0.01" placeholder="Importe €" className="input" required />
        <input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="input" required />
      </div>
      <input name="note" placeholder="Nota (opcional)" className="input" />
      <Msg state={state} />
      <button className="btn-secondary w-full" disabled={pending}>Añadir</button>
    </form>
  );
}
