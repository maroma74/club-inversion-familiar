"use client";

import { useActionState, useState } from "react";
import { deleteTradeAction, updateTradeAction } from "@/app/actions/invest";
import { eur, fmtDate } from "@/lib/format";
import { BrokerOptions } from "./forms";

export type TradeRow = {
  id: string;
  date: string; // YYYY-MM-DD
  symbol: string;
  name: string;
  side: "BUY" | "SELL";
  quantity: number;
  price: number;
  currency: string;
  fxRate: number;
  fees: number;
  broker: string | null;
  /** Compra hecha al enviar la decisión de la cartera del mes: se puede ajustar al precio real, pero no cambiar de valor ni borrar. */
  monthly?: boolean;
};

const CURRENCIES = ["EUR", "USD", "GBP", "CHF"];

const usd = (n: number) => `${n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;

/** Importe total de la operación (cantidad × precio + comisión) en euros y en dólares. */
function amounts(t: TradeRow, usdPerEur: number | null) {
  const totalEur = t.quantity * t.price * t.fxRate + t.fees;
  // Si la operación fue en dólares, el importe en USD es el real; si no, se convierte al cambio actual.
  const totalUsd = t.currency === "USD" ? t.quantity * t.price + (usdPerEur !== null ? t.fees * usdPerEur : 0) : usdPerEur !== null ? totalEur * usdPerEur : null;
  return { totalEur, totalUsd };
}

export function TradeList({ trades, usdPerEur = null }: { trades: TradeRow[]; usdPerEur?: number | null }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  if (trades.length === 0) return <p className="text-sm text-slate-500">Aún no has registrado ninguna operación.</p>;
  return (
    <div className="overflow-x-auto"><table className="w-full text-sm">
      <thead className="text-xs text-slate-500">
        <tr>
          <th className="text-left py-1 font-medium">Fecha</th>
          <th className="text-left py-1 font-medium">Operación</th>
          <th className="text-right py-1 font-medium">Precio</th>
          <th className="text-right py-1 font-medium">Importe € / $</th>
        </tr>
      </thead>
      <tbody>
        {trades.map((t) =>
          editing === t.id ? (
            <tr key={t.id} className="border-t border-slate-100">
              <td colSpan={4} className="py-2">
                <EditTradeForm trade={t} onDone={() => setEditing(null)} />
              </td>
            </tr>
          ) : confirming === t.id ? (
            <tr key={t.id} className="border-t border-slate-100">
              <td colSpan={4} className="py-2">
                <form action={deleteTradeAction} className="flex flex-wrap items-center justify-between gap-2" role="alertdialog" aria-label="Confirmar borrado">
                  <input type="hidden" name="id" value={t.id} />
                  <p className="m-0 text-sm [text-wrap:pretty]">¿Borrar esta {t.side === "BUY" ? "compra" : "venta"} de {t.symbol} del {fmtDate(t.date)}? Se recalculará tu rentabilidad y no se puede deshacer.</p>
                  <div className="flex gap-2">
                    <button type="button" className="btn-secondary" onClick={() => setConfirming(null)} autoFocus>No, conservarla</button>
                    <button className="btn-primary">Sí, borrar</button>
                  </div>
                </form>
              </td>
            </tr>
          ) : (
            <tr key={t.id} className="border-t border-slate-100 align-top">
              <td className="py-2 text-slate-500 whitespace-nowrap">{fmtDate(t.date)}</td>
              <td className="py-2">
                <span className="tag tag-neutral">{t.side === "BUY" ? "Compra" : "Venta"}</span> <b>{t.symbol}</b>
                <div className="text-xs text-slate-400">{t.broker ?? "Entidad sin indicar"}</div>
                {/* Acciones debajo del valor: la tabla cabe sin desplazamiento horizontal */}
                <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs">
                  <button type="button" onClick={() => setEditing(t.id)} className="text-indigo-600 hover:underline py-1" aria-label={`Editar ${t.side === "BUY" ? "compra" : "venta"} de ${t.symbol}`}>Editar</button>
                  {t.monthly ? (
                    <span className="text-slate-400" title="Las compras de la cartera del mes son el registro de tu decisión: puedes ajustar precio, cantidad o comisión al valor real, pero no borrarlas ni cambiar de valor">Decisión del mes</span>
                  ) : (
                    <button type="button" onClick={() => setConfirming(t.id)} className="text-slate-500 hover:text-red-600 hover:underline py-1" aria-label={`Borrar ${t.side === "BUY" ? "compra" : "venta"} de ${t.symbol}`}>Borrar</button>
                  )}
                </div>
              </td>
              <td className="py-2 text-right tabular-nums">
                <span className="whitespace-nowrap">{t.quantity.toLocaleString("es-ES", { maximumFractionDigits: 6 })} ×</span>{" "}
                <span className="whitespace-nowrap">{t.currency === "EUR" ? eur(t.price) : `${t.price.toLocaleString("es-ES", { maximumFractionDigits: 4 })} ${t.currency}`}</span>
                {t.currency !== "EUR" && <div className="text-xs text-slate-400 whitespace-nowrap">= {eur(t.price * t.fxRate)} / ud.</div>}
                {t.fees > 0 && <div className="text-xs text-slate-400 whitespace-nowrap">comisión {eur(t.fees)}</div>}
              </td>
              <td className="py-2 text-right tabular-nums whitespace-nowrap">
                {(() => {
                  const { totalEur, totalUsd } = amounts(t, usdPerEur);
                  return (
                    <>
                      <div className="font-medium"><span className="sr-only">{t.side === "BUY" ? "Sale " : "Entra "}</span>{t.side === "BUY" ? "−" : "+"}{eur(totalEur)}</div>
                      <div className="text-xs text-slate-500">{totalUsd === null ? "— $" : usd(totalUsd)}{t.currency !== "USD" && usdPerEur !== null ? <span className="text-slate-400" title="Convertido al cambio EUR/USD actual"> (aprox.)</span> : null}</div>
                    </>
                  );
                })()}
              </td>
            </tr>
          ),
        )}
      </tbody>
    </table></div>
  );
}

function EditTradeForm({ trade, onDone }: { trade: TradeRow; onDone: () => void }) {
  const [state, action, pending] = useActionState(updateTradeAction, undefined);
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return (
    <form action={action} className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-3 space-y-2">
      <input type="hidden" name="id" value={trade.id} />
      <input type="hidden" name="name" value={trade.name} />
      {trade.monthly && (
        <p className="m-0 text-xs text-slate-600 [text-wrap:pretty]">Compra de tu decisión de la cartera del mes: ajusta el precio, la cantidad, la comisión o la entidad al valor real de tu bróker. El valor y el tipo de operación no se cambian.</p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <div>
          <label className="label">Tipo</label>
          {trade.monthly ? (
            <><input type="hidden" name="side" value={trade.side} /><div className="input bg-slate-50 text-slate-600">{trade.side === "BUY" ? "Compra" : "Venta"}</div></>
          ) : (
            <select name="side" defaultValue={trade.side} className="input">
              <option value="BUY">Compra</option>
              <option value="SELL">Venta</option>
            </select>
          )}
        </div>
        <div>
          <label className="label">Símbolo</label>
          {trade.monthly ? (
            <><input type="hidden" name="symbol" value={trade.symbol} /><div className="input bg-slate-50 text-slate-600">{trade.symbol}</div></>
          ) : (
            <input name="symbol" defaultValue={trade.symbol} required className="input uppercase" />
          )}
        </div>
        <div>
          <label className="label">Fecha</label>
          <input name="date" type="date" defaultValue={trade.date} max={today} required className="input" />
        </div>
        <div>
          <label className="label">Cantidad</label>
          <input name="quantity" type="number" step="any" min="0" defaultValue={trade.quantity} required className="input" />
        </div>
        <div>
          <label className="label">Precio</label>
          <div className="flex gap-1">
            <input name="price" type="number" step="any" min="0" defaultValue={trade.price} required className="input" />
            <select name="currency" defaultValue={trade.currency} className="input w-auto">
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Comisión (€)</label>
          <input name="fees" type="number" step="any" min="0" defaultValue={trade.fees} className="input" />
        </div>
        <div className="col-span-2 sm:col-span-3">
          <label className="label">Entidad (bróker)</label>
          <input name="broker" list="brokers" defaultValue={trade.broker ?? ""} className="input" placeholder="Trade Republic, Degiro…" maxLength={60} />
          <BrokerOptions />
        </div>
      </div>
      {state?.error && <p role="alert" className="m-0 text-sm font-medium">{state.error}</p>}
      {state?.ok && <p role="status" className="m-0 text-sm text-accent-700">{state.ok}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onDone} className="btn-secondary py-1 text-xs">{state?.ok ? "Cerrar" : "Cancelar"}</button>
        <button className="btn-primary py-1 text-xs" disabled={pending}>{pending ? "Guardando…" : "Guardar cambios"}</button>
      </div>
    </form>
  );
}
