"use client";

import { useActionState, useState } from "react";
import { deleteContributionAction, updateContributionAction } from "@/app/actions/invest";
import { eur, fmtDate } from "@/lib/format";

export type ContributionRow = { id: string; date: string; userName: string; note: string | null; amount: number };

export function ContributionList({ rows, isAdmin }: { rows: ContributionRow[]; isAdmin: boolean }) {
  const [editing, setEditing] = useState<string | null>(null);
  if (rows.length === 0) return <p className="text-sm text-slate-500">Todavía no hay aportaciones registradas.</p>;
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map((c) =>
          editing === c.id ? (
            <tr key={c.id} className="border-t border-slate-100">
              <td colSpan={5} className="py-2">
                <EditContributionForm row={c} onDone={() => setEditing(null)} />
              </td>
            </tr>
          ) : (
            <tr key={c.id} className="border-t border-slate-100">
              <td className="py-1.5 text-slate-500 whitespace-nowrap">{fmtDate(c.date)}</td>
              <td className="py-1.5 font-medium">{c.userName}</td>
              <td className="py-1.5 text-slate-500">{c.note ?? ""}</td>
              <td className="py-1.5 text-right tabular-nums">{eur(c.amount)}</td>
              {isAdmin && (
                <td className="py-1.5 text-right whitespace-nowrap">
                  <button type="button" onClick={() => setEditing(c.id)} className="text-xs text-indigo-600 hover:underline mr-3">Editar</button>
                  <form action={deleteContributionAction} className="inline">
                    <input type="hidden" name="id" value={c.id} />
                    <button className="text-xs text-slate-400 hover:text-red-600">Borrar</button>
                  </form>
                </td>
              )}
            </tr>
          ),
        )}
      </tbody>
    </table>
  );
}

function EditContributionForm({ row, onDone }: { row: ContributionRow; onDone: () => void }) {
  const [state, action, pending] = useActionState(updateContributionAction, undefined);
  return (
    <form action={action} className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-3 flex flex-wrap gap-2 items-end">
      <input type="hidden" name="id" value={row.id} />
      <div className="text-sm font-medium self-center mr-2">{row.userName}</div>
      <div>
        <label className="label">Fecha</label>
        <input name="date" type="date" defaultValue={row.date} required className="input" />
      </div>
      <div>
        <label className="label">Importe (€)</label>
        <input name="amount" type="number" step="0.01" defaultValue={row.amount} required className="input w-32" />
      </div>
      <div className="flex-1 min-w-[160px]">
        <label className="label">Nota</label>
        <input name="note" defaultValue={row.note ?? ""} className="input" />
      </div>
      <button type="button" onClick={onDone} className="btn-secondary py-1 text-xs">{state?.ok ? "Cerrar" : "Cancelar"}</button>
      <button className="btn-primary py-1 text-xs" disabled={pending}>{pending ? "Guardando…" : "Guardar"}</button>
      {state?.error && <p className="w-full text-xs text-red-600">{state.error}</p>}
      {state?.ok && <p className="w-full text-xs text-green-600">{state.ok}</p>}
    </form>
  );
}
