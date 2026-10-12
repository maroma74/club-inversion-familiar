"use client";

import { useActionState, useMemo, useState } from "react";
import { submitDecisionAction } from "@/app/actions/monthly";
import { eur } from "@/lib/format";

type Opt = { id: string; symbol: string; name: string; kind: string; note: string | null; price: number | null };

export function DecisionForm({ portfolioId, options, allocation, minChoices, maxChoices }: { portfolioId: string; options: Opt[]; allocation: number; minChoices: number; maxChoices: number }) {
  const [state, action, pending] = useActionState(submitDecisionAction, undefined);
  const [picked, setPicked] = useState<string[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const single = maxChoices === 1;

  function toggle(id: string) {
    setPicked((prev) => {
      let next: string[];
      if (single) next = prev.includes(id) ? [] : [id];
      else if (prev.includes(id)) next = prev.filter((x) => x !== id);
      else if (prev.length >= maxChoices) return prev;
      else next = [...prev, id];
      // Reparto por defecto a partes iguales (editable)
      const share = next.length ? Math.floor((allocation / next.length) * 100) / 100 : 0;
      const a: Record<string, string> = {};
      next.forEach((x, i) => (a[x] = String(i === next.length - 1 ? Math.round((allocation - share * (next.length - 1)) * 100) / 100 : share)));
      setAmounts(a);
      return next;
    });
  }
  const total = useMemo(() => picked.reduce((s, id) => s + (Number(amounts[id]) || 0), 0), [picked, amounts]);
  const remaining = Math.round((allocation - total) * 100) / 100;

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="portfolioId" value={portfolioId} />
      <div className="flex flex-wrap justify-between items-baseline gap-2">
        <h3 className="m-0">Tu decisión</h3>
        <span className="text-[13px] text-neutral-700">
          {single ? "Elige una opción" : `Elige entre ${minChoices} y ${maxChoices} opciones`} · asignado <b className="text-ink">{eur(allocation)}</b> · sin repartir <b className="text-ink">{eur(remaining)}</b>
        </span>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))" }}>
        {options.map((o) => {
          const on = picked.includes(o.id);
          return (
            <div key={o.id} className="card blueprint gap-2" style={{ padding: 16, borderColor: on ? "var(--color-accent)" : "var(--color-divider)" }}>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type={single ? "radio" : "checkbox"} name={`pick_${o.id}`} checked={on} onChange={() => toggle(o.id)} className="mt-1" />
                <span>
                  <span className="font-heading text-[18px]">{o.symbol}</span> <span className="tag tag-neutral ml-1">{o.kind === "ETF" ? "ETF" : o.kind === "CRYPTO" ? "cripto" : "acción"}</span>
                  <span className="block text-[13px] text-neutral-700">{o.name}{o.price !== null ? ` · ${eur(o.price)}` : ""}</span>
                </span>
              </label>
              {on && (
                <div className="flex flex-col gap-2 border-t border-divider pt-2">
                  <div className="field">
                    <label>Importe (€)</label>
                    <input name={`amount_${o.id}`} type="number" step="0.01" min="0" className="input" value={amounts[o.id] ?? ""} onChange={(e) => setAmounts((a) => ({ ...a, [o.id]: e.target.value }))} required />
                  </div>
                  <div className="field">
                    <label>¿Por qué {o.symbol}?</label>
                    <textarea name={`why_${o.id}`} className="input" style={{ minHeight: 70 }} placeholder="Qué has investigado y qué esperas" required minLength={10} />
                  </div>
                  <div className="field">
                    <label>¿Qué te haría vender?</label>
                    <input name={`exit_${o.id}`} className="input" placeholder="Un precio, un dato o un plazo" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="field">
        <label>Tu argumento general (mínimo 20 caracteres)</label>
        <textarea name="argument" className="input" placeholder="Qué has aprendido de la lección del mes y cómo lo aplicas a tu elección" required minLength={20} />
      </div>
      {state?.error && <p className="m-0 text-[13px] text-neutral-800">{state.error}</p>}
      {state?.ok && <p className="m-0 text-[13px] text-accent-700">{state.ok}</p>}
      <div className="flex items-center gap-3 flex-wrap">
        <button className="btn-primary blueprint" disabled={pending || picked.length < minChoices || remaining < -0.01}>{pending ? "Ejecutando compras…" : "Enviar decisión y comprar"}</button>
        <span className="text-xs text-neutral-700">Al enviar se compran los activos a precio de mercado y cada elección queda en tu diario. No se puede cambiar después.</span>
      </div>
    </form>
  );
}
