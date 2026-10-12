"use client";

import { useActionState, useEffect, useState } from "react";
import { addTradeAction, reconcileAction, setManualPriceAction } from "@/app/actions/invest";

type Hit = { symbol: string; name: string; exchange: string; type: string };

const SUPPORTED = ["EUR", "USD", "GBP", "CHF"];

export const BROKERS = ["Trade Republic", "Degiro", "MyInvestor", "Interactive Brokers", "XTB", "eToro", "Scalable Capital", "Revolut", "Renta 4", "Bankinter", "ING", "BBVA", "Santander", "CaixaBank", "Openbank", "Indexa Capital", "Binance", "Coinbase", "Kraken", "Bit2Me"];

/** Lista de entidades habituales para autocompletar el campo «Entidad». */
export function BrokerOptions() {
  return (
    <datalist id="brokers">
      {BROKERS.map((b) => (
        <option key={b} value={b} />
      ))}
    </datalist>
  );
}
const SYMBOLS: Record<string, string> = { EUR: "€", USD: "$", GBP: "£", CHF: "CHF" };

export function TradeForm({ holdings, initialSymbol }: { holdings: { symbol: string; name: string; quantity: number }[]; initialSymbol?: string }) {
  const [state, action, pending] = useActionState(addTradeAction, undefined);
  const [q, setQ] = useState("");
  const [symbol, setSymbol] = useState(initialSymbol?.toUpperCase() ?? "");
  const [name, setName] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [currency, setCurrency] = useState("EUR");
  const [price, setPrice] = useState("");
  const [quoteNote, setQuoteNote] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  /** Al elegir un activo, consulta su cotización para fijar la divisa y sugerir el precio actual. */
  async function loadQuote(sym: string) {
    setQuoteNote("Consultando cotización…");
    try {
      const res = await fetch(`/api/quote?symbol=${encodeURIComponent(sym)}`);
      if (!res.ok) throw new Error();
      const q: { price: number; currency: string; priceEur: number } = await res.json();
      const cur = SUPPORTED.includes(q.currency) ? q.currency : "EUR";
      setCurrency(cur);
      setPrice(cur === q.currency ? String(Math.round(q.price * 10000) / 10000) : String(Math.round(q.priceEur * 10000) / 10000));
      setQuoteNote(`Cotiza en ${q.currency}: ${q.price.toFixed(2)} ${q.currency} ≈ ${q.priceEur.toFixed(2)} €. Ajusta el precio al que realmente compraste.`);
    } catch {
      setQuoteNote("Sin cotización automática: introduce el precio y la divisa a mano.");
    }
  }

  // Símbolo preseleccionado (p. ej. al pulsar «Operar» en el módulo Cripto): consulta su cotización al cargar.
  useEffect(() => {
    if (initialSymbol) loadQuote(initialSymbol.toUpperCase());
  }, [initialSymbol]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/symbols?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        setHits(await res.json());
      } catch {
        /* cancelado */
      }
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setSide("BUY")} className={side === "BUY" ? "btn-primary" : "btn-secondary"}>Comprar</button>
        <button type="button" onClick={() => setSide("SELL")} className={side === "SELL" ? "btn-primary" : "btn-secondary"}>Vender</button>
      </div>
      <input type="hidden" name="side" value={side} />
      <input type="hidden" name="name" value={name} />

      {side === "SELL" && holdings.length > 0 ? (
        <div>
          <label className="label">Activo</label>
          <select name="symbol" className="input" required defaultValue="">
            <option value="" disabled>Elige una posición</option>
            {holdings.map((h) => (
              <option key={h.symbol} value={h.symbol}>{h.symbol} · {h.name} ({h.quantity} uds.)</option>
            ))}
          </select>
        </div>
      ) : (
        <div className="relative">
          <label className="label">Activo (símbolo o nombre)</label>
          <input
            name="symbol"
            className="input uppercase"
            required
            value={symbol}
            onChange={(e) => {
              setSymbol(e.target.value.toUpperCase());
              setQ(e.target.value);
              setName("");
            }}
            placeholder="AAPL, SAN.MC, VWCE.DE, BTC-EUR, Inditex, Bitcoin…"
            autoComplete="off"
            onBlur={() => {
              if (symbol && !name && hits.length === 0) loadQuote(symbol);
            }}
          />
          {hits.length > 0 && q && (
            <ul className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-auto text-sm">
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
                      loadQuote(h.symbol);
                    }}
                  >
                    <b>{h.symbol}</b> <span className="text-slate-600">{h.name}</span> <span className="text-xs text-slate-400">{h.exchange} · {h.type}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {name && <p className="text-xs text-slate-500 mt-1">{name}</p>}
        </div>
      )}

      <div className="grid grid-cols-[1fr_1fr_auto_1fr] gap-2">
        <div>
          <label className="label">Cantidad</label>
          <input name="quantity" type="number" step="any" min="0" required className="input" />
        </div>
        <div>
          <label className="label">Precio ({SYMBOLS[currency]})</label>
          <input name="price" type="number" step="any" min="0" required className="input" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <div>
          <label className="label">Divisa</label>
          <select name="currency" className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {SUPPORTED.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Comisión (€)</label>
          <input name="fees" type="number" step="any" min="0" defaultValue={0} className="input" />
        </div>
      </div>
      {quoteNote && <p className="text-xs text-slate-500">{quoteNote}</p>}
      {currency !== "EUR" && <p className="text-xs text-slate-500">El precio en {currency} se convierte a euros con el tipo de cambio del día de la operación.</p>}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Fecha</label>
          <input name="date" type="date" defaultValue={today} max={today} required className="input" />
        </div>
        <div>
          <label className="label">Entidad (bróker)</label>
          <input name="broker" list="brokers" className="input" placeholder="Trade Republic, Degiro…" maxLength={60} />
          <BrokerOptions />
        </div>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-600">{state.ok}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Guardando…" : side === "BUY" ? "Registrar compra" : "Registrar venta"}</button>
    </form>
  );
}

export function ReconcileForm() {
  const [state, action, pending] = useActionState(reconcileAction, undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <button className="btn-secondary py-1 text-xs" disabled={pending}>{pending ? "Recalculando…" : "Recalcular aportaciones propias"}</button>
      {state?.ok && <span className="text-xs text-green-600">{state.ok}</span>}
      {state?.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  );
}

export function ManualPriceForm() {
  const [state, action, pending] = useActionState(setManualPriceAction, undefined);
  return (
    <form action={action} className="flex gap-2 items-end">
      <div className="flex-1">
        <label className="label">Símbolo</label>
        <input name="symbol" className="input uppercase" placeholder="MIFONDO" required />
      </div>
      <div className="flex-1">
        <label className="label">Precio (€)</label>
        <input name="price" type="number" step="any" min="0" className="input" required />
      </div>
      <button className="btn-secondary" disabled={pending}>Fijar</button>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-xs text-green-600">{state.ok}</p>}
    </form>
  );
}
