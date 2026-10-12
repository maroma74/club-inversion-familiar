"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveJournalEntryAction } from "@/app/actions/journal";

type Props = {
  label?: string;
  className?: string;
  symbol?: string;
  side?: "BUY" | "SELL" | "NOTE";
  tradeId?: string;
  title?: string;
};

/** Botón que abre el diálogo «Nueva entrada del diario». */
export function DiaryDialog({ label = "Escribir en el diario", className = "btn-secondary", symbol = "", side = "BUY", tradeId, title = "Nueva entrada del diario" }: Props) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(saveJournalEntryAction, undefined);
  const [why, setWhy] = useState("");
  const [sideSel, setSideSel] = useState<"BUY" | "SELL" | "NOTE">(side);
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) {
      setOpen(false);
      setWhy("");
      router.refresh();
    }
  }, [state, router]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>{label}</button>
      {open && (
        <div className="dialog-backdrop" onClick={() => setOpen(false)}>
          <div className="dialog blueprint" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="dialog-title">{title}</div>
            <form action={action} className="dialog-body flex flex-col gap-3">
              {tradeId && <input type="hidden" name="tradeId" value={tradeId} />}
              <p className="m-0 text-[13px] text-neutral-700">Escribir el porqué antes de que el precio se mueva es la mejor forma de aprender de tus propios aciertos y errores.</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="field">
                  <label>Activo</label>
                  <input name="symbol" className="input uppercase" defaultValue={symbol} placeholder="IBE.MC, VWCE.DE…" maxLength={20} />
                </div>
                <div className="field">
                  <label>Operación</label>
                  <div className="seg flex">
                    {(["BUY", "SELL", "NOTE"] as const).map((s) => (
                      <label key={s} className="seg-opt flex-1 justify-center" data-on={sideSel === s ? "true" : "false"}>
                        <input type="radio" name="side" value={s} checked={sideSel === s} onChange={() => setSideSel(s)} />
                        {s === "BUY" ? "Compra" : s === "SELL" ? "Venta" : "Nota"}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="field">
                <label>¿Por qué?</label>
                <textarea name="why" className="input" value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Qué has visto, qué esperas que pase y en cuánto tiempo" required />
              </div>
              <div className="field">
                <label>¿Qué te haría vender?</label>
                <input name="exit" className="input" placeholder="Un precio, un dato o un plazo" maxLength={300} />
              </div>
              {state?.error && <p className="m-0 text-[13px] text-neutral-800">{state.error}</p>}
              <div className="dialog-actions">
                <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancelar</button>
                <button className="btn-primary" disabled={pending || !why.trim()}>{pending ? "Guardando…" : "Guardar entrada"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
