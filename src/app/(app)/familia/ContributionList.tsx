"use client";

import { useActionState, useState } from "react";
import { deleteContributionAction, updateContributionAction } from "@/app/actions/invest";
import { eur, fmtDate } from "@/lib/format";

export type ContributionRow = { id: string; date: string; userName: string; note: string | null; amount: number };

export function ContributionList({ rows, isAdmin }: { rows: ContributionRow[]; isAdmin: boolean }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (rows.length === 0) return <p className="m-0 text-sm text-neutral-700">Todavía no hay aportaciones registradas.</p>;

  return (
    <>
      <p role="status" className="m-0 text-sm text-accent-700 empty:hidden">{notice}</p>
      <div className="overflow-x-auto relative">
        <table className="table">
          <caption className="sr-only">Últimas aportaciones de la familia</caption>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Miembro</th>
              <th>Nota</th>
              <th className="text-right">Importe</th>
              {isAdmin && <th><span className="sr-only">Acciones</span></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((c) =>
              editing === c.id ? (
                <tr key={c.id}>
                  <td colSpan={5} className="py-2">
                    <EditContributionForm row={c} onDone={() => setEditing(null)} />
                  </td>
                </tr>
              ) : (
                <tr key={c.id}>
                  <td className="text-neutral-700 whitespace-nowrap">{fmtDate(c.date)}</td>
                  <td className="font-medium">{c.userName}</td>
                  <td className="text-neutral-700">{c.note ?? ""}</td>
                  <td className="num whitespace-nowrap">{eur(c.amount)}</td>
                  {isAdmin && (
                    <td className="text-right">
                      {confirming === c.id ? (
                        <form
                          action={async (fd: FormData) => {
                            await deleteContributionAction(fd);
                            setConfirming(null);
                            setNotice(`Aportación de ${c.userName} (${eur(c.amount)}, ${fmtDate(c.date)}) borrada.`);
                          }}
                          role="alertdialog"
                          aria-label="Confirmar borrado"
                          className="flex flex-col items-end gap-1.5 max-w-[240px] ml-auto"
                        >
                          <input type="hidden" name="id" value={c.id} />
                          <p className="m-0 text-sm text-right [text-wrap:pretty]">¿Borrar {eur(c.amount)} de {c.userName} del {fmtDate(c.date)}? Cambiará su saldo y no se puede deshacer.</p>
                          <div className="flex gap-2">
                            <button type="button" className="btn-secondary" onClick={() => setConfirming(null)} autoFocus>No, conservarla</button>
                            <button className="btn-primary">Sí, borrar</button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex justify-end gap-1 whitespace-nowrap">
                          <button type="button" onClick={() => { setNotice(null); setEditing(c.id); }} className="btn-ghost" style={{ minHeight: 44 }} aria-label={`Editar aportación de ${c.userName} del ${fmtDate(c.date)}`}>Editar</button>
                          <button type="button" onClick={() => { setNotice(null); setConfirming(c.id); }} className="btn-ghost" style={{ minHeight: 44 }} aria-label={`Borrar aportación de ${c.userName} del ${fmtDate(c.date)}`}>Borrar</button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function EditContributionForm({ row, onDone }: { row: ContributionRow; onDone: () => void }) {
  const [state, action, pending] = useActionState(updateContributionAction, undefined);
  return (
    <form action={action} className="card card-snug flex-row flex-wrap gap-3 items-end">
      <input type="hidden" name="id" value={row.id} />
      <div className="text-sm font-medium self-center mr-2">{row.userName}</div>
      <div className="field">
        <label htmlFor={`fecha-${row.id}`}>Fecha</label>
        <input id={`fecha-${row.id}`} name="date" type="date" defaultValue={row.date} required className="input" />
      </div>
      <div className="field">
        <label htmlFor={`importe-${row.id}`}>Importe (€)</label>
        <input id={`importe-${row.id}`} name="amount" type="number" step="0.01" defaultValue={row.amount} required className="input w-32" />
      </div>
      <div className="field flex-1 min-w-[160px]">
        <label htmlFor={`nota-${row.id}`}>Nota</label>
        <input id={`nota-${row.id}`} name="note" defaultValue={row.note ?? ""} className="input" />
      </div>
      <button type="button" onClick={onDone} className="btn-secondary">{state?.ok ? "Cerrar" : "Cancelar"}</button>
      <button className="btn-primary" disabled={pending}>{pending ? "Guardando…" : "Guardar"}</button>
      {state?.error && <p role="alert" className="m-0 w-full text-sm font-medium">{state.error}</p>}
      {state?.ok && <p role="status" className="m-0 w-full text-sm text-accent-700">{state.ok}</p>}
    </form>
  );
}
