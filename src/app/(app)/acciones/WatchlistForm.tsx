"use client";

import { useActionState, useEffect, useState } from "react";
import { addWatchlistAction } from "@/app/actions/watchlist";

type Hit = { symbol: string; name: string; exchange: string; type: string };

export function WatchlistForm({ kind = "STOCK" }: { kind?: "STOCK" | "ETF" | "CRYPTO" | "COMMODITY" }) {
  const [state, action, pending] = useActionState(addWatchlistAction, undefined);
  const [q, setQ] = useState("");
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);

  // El campo se vacía solo cuando se ha añadido de verdad; si falla, se conserva lo escrito.
  useEffect(() => {
    if (state?.ok) {
      setSymbol("");
      setName("");
      setQ("");
    }
  }, [state]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/symbols?q=${encodeURIComponent(q)}${kind === "COMMODITY" ? "&kind=COMMODITY" : ""}`, { signal: ctrl.signal });
        const all: Hit[] = await res.json();
        if (kind === "COMMODITY") {
          setHits(all.filter((h) => h.type === "FUTURE"));
        } else if (kind === "CRYPTO") {
          // Primero los pares en euros (que son los que se usan para valorar la cartera)
          setHits(all.filter((h) => h.type === "CRYPTOCURRENCY").sort((a, b) => Number(b.symbol.endsWith("-EUR")) - Number(a.symbol.endsWith("-EUR"))));
        } else {
          setHits(all.filter((h) => h.type !== "CRYPTOCURRENCY" && h.type !== "FUTURE" && (kind === "ETF" ? h.type === "ETF" || h.type === "MUTUALFUND" : h.type !== "ETF")));
        }
      } catch {
        /* cancelado */
      }
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, kind]);

  return (
    <form
      action={action}
      className="flex flex-wrap items-start gap-2"
    >
      <div className="relative w-full sm:w-auto">
        <input
          name="symbol"
          value={symbol}
          onChange={(e) => {
            setSymbol(e.target.value.toUpperCase());
            setQ(e.target.value);
            setName("");
          }}
          placeholder={kind === "ETF" ? "Añadir: MSCI World, VWCE.DE, SXR8.DE…" : kind === "CRYPTO" ? "Añadir: Bitcoin, ETH-EUR, SOL…" : kind === "COMMODITY" ? "Añadir: oro, petróleo, café, GC=F…" : "Añadir: Inditex, SAN.MC, NVDA…"}
          className="input w-full sm:w-64 uppercase" aria-label="Buscar un valor para seguir"
          autoComplete="off"
          required
        />
        <input type="hidden" name="name" value={name} />
        <input type="hidden" name="kind" value={kind} />
        {hits.length > 0 && q && (
          <ul className="absolute z-10 mt-1 w-full sm:w-80 border border-divider rounded-lg max-h-56 overflow-auto text-sm">
            {hits.map((h) => (
              <li key={h.symbol}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 min-h-[44px] hover:bg-[var(--color-surface-2)]"
                  onClick={() => {
                    setSymbol(h.symbol);
                    setName(h.name);
                    setQ("");
                    setHits([]);
                  }}
                >
                  <b>{h.symbol}</b> <span className="text-neutral-700">{h.name}</span> <span className="text-xs text-neutral-700">{h.exchange}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {state?.error && <p role="alert" className="m-0 mt-1 text-sm font-medium">{state.error}</p>}
        {state?.ok && !pending && <p role="status" className="m-0 mt-1 text-sm text-accent-700">{state.ok}</p>}
      </div>
      <button className="btn-secondary" disabled={pending}>{pending ? "Añadiendo…" : "Seguir"}</button>
    </form>
  );
}
