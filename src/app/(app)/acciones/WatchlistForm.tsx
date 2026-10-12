"use client";

import { useActionState, useEffect, useState } from "react";
import { addWatchlistAction } from "@/app/actions/watchlist";

type Hit = { symbol: string; name: string; exchange: string; type: string };

export function WatchlistForm({ kind = "STOCK" }: { kind?: "STOCK" | "ETF" }) {
  const [state, action, pending] = useActionState(addWatchlistAction, undefined);
  const [q, setQ] = useState("");
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/symbols?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const all: Hit[] = await res.json();
        setHits(all.filter((h) => h.type !== "CRYPTOCURRENCY" && (kind === "ETF" ? h.type === "ETF" || h.type === "MUTUALFUND" : h.type !== "ETF")));
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
      action={(fd) => {
        action(fd);
        setSymbol("");
        setName("");
        setQ("");
      }}
      className="flex items-start gap-2"
    >
      <div className="relative">
        <input
          name="symbol"
          value={symbol}
          onChange={(e) => {
            setSymbol(e.target.value.toUpperCase());
            setQ(e.target.value);
            setName("");
          }}
          placeholder={kind === "ETF" ? "Añadir: MSCI World, VWCE.DE, SXR8.DE…" : "Añadir: Inditex, SAN.MC, NVDA…"}
          className="input w-64 uppercase"
          autoComplete="off"
          required
        />
        <input type="hidden" name="name" value={name} />
        <input type="hidden" name="kind" value={kind} />
        {hits.length > 0 && q && (
          <ul className="absolute z-10 mt-1 w-80 bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-auto text-sm">
            {hits.map((h) => (
              <li key={h.symbol}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-slate-50"
                  onClick={() => {
                    setSymbol(h.symbol);
                    setName(h.name);
                    setQ("");
                    setHits([]);
                  }}
                >
                  <b>{h.symbol}</b> <span className="text-slate-600">{h.name}</span> <span className="text-xs text-slate-400">{h.exchange}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {state?.error && <p className="text-xs text-red-600 mt-1">{state.error}</p>}
        {state?.ok && !pending && <p className="text-xs text-green-600 mt-1">{state.ok}</p>}
      </div>
      <button className="btn-secondary" disabled={pending}>{pending ? "Añadiendo…" : "Seguir"}</button>
    </form>
  );
}
