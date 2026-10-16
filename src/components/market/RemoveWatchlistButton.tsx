"use client";

import { useState } from "react";
import { removeWatchlistAction } from "@/app/actions/watchlist";

/** «Quitar» pide confirmar: la lista de seguimiento es de toda la familia y quitar un valor la cambia para todos. */
export function RemoveWatchlistButton({ symbol, label }: { symbol: string; label: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button type="button" className="btn-ghost min-h-[44px] md:min-h-0" onClick={() => setConfirming(true)} aria-label={`Dejar de seguir ${label}`}>
        Quitar
      </button>
    );
  }
  return (
    <form action={removeWatchlistAction} role="alertdialog" aria-label={`Confirmar: dejar de seguir ${label}`} className="inline-flex flex-wrap items-center justify-end gap-1.5">
      <input type="hidden" name="symbol" value={symbol} />
      <span className="text-sm">¿Dejar de seguir {label} para toda la familia?</span>
      <button type="button" className="btn-secondary" onClick={() => setConfirming(false)} autoFocus>No</button>
      <button className="btn-primary">Sí, quitar</button>
    </form>
  );
}
