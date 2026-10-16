"use client";

import { num } from "@/lib/format";
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
  const [sellSymbol, setSellSymbol] = useState("");
  const [qty, setQty] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [price, setPrice] = useState("");
  const [quoteNote, setQuoteNote] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const held = holdings.find((h) => h.symbol === sellSymbol);
  const qtyN = Number(qty.replace(",", "."));
  const priceN = Number(price.replace(",", "."));
  const total = Number.isFinite(qtyN) && Number.isFinite(priceN) && qtyN > 0 && priceN > 0 ? qtyN * priceN : null;
  const overHeld = side === "SELL" && !!held && Number.isFinite(qtyN) && qtyN > held.quantity + 1e-9;

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
      setQuoteNote(`Cotiza en ${q.currency}: ${num(q.price)} ${q.currency} ≈ ${num(q.priceEur)} €. Ajusta el precio al que realmente compraste.`);
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
        <button type="button" aria-pressed={side === "BUY"} onClick={() => setSide("BUY")} className={side === "BUY" ? "btn-primary" : "btn-secondary"}>Comprar</button>
        <button type="button" aria-pressed={side === "SELL"} onClick={() => setSide("SELL")} className={side === "SELL" ? "btn-primary" : "btn-secondary"}>Vender</button>
      </div>
      <input type="hidden" name="side" value={side} />
      <input type="hidden" name="name" value={name} />

      {side === "SELL" && holdings.length > 0 ? (
        <div>
          <label className="label" htmlFor="op-activo">Activo</label>
          <select id="op-activo" name="symbol" className="input" required value={sellSymbol} onChange={(e) => setSellSymbol(e.target.value)}>
            <option value="" disabled>Elige una posición</option>
            {holdings.map((h) => (
              <option key={h.symbol} value={h.symbol}>{h.symbol} · {h.name} ({h.quantity.toLocaleString("es-ES", { maximumFractionDigits: 6 })} uds.)</option>
            ))}
          </select>
        </div>
      ) : (
        <div className="relative">
          <label className="label" htmlFor="op-simbolo">Activo (símbolo o nombre)</label>
          <input
            id="op-simbolo"
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
          <label className="label" htmlFor="op-cantidad">Cantidad</label>
          <input id="op-cantidad" name="quantity" type="number" step="any" min="0" max={side === "SELL" && held ? held.quantity : undefined} required className="input" value={qty} onChange={(e) => setQty(e.target.value)} aria-describedby={side === "SELL" && held ? "op-cantidad-ayuda" : undefined} />
        </div>
        <div>
          <label className="label" htmlFor="op-precio">Precio ({SYMBOLS[currency]})</label>
          <input id="op-precio" name="price" type="number" step="any" min="0" required className="input" value={price} onChange={(e) => setPrice(e.target.value)} />
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
      {side === "SELL" && held && (
        <p id="op-cantidad-ayuda" className="m-0 text-sm text-neutral-700 flex flex-wrap items-center gap-2">
          Tienes {held.quantity.toLocaleString("es-ES", { maximumFractionDigits: 6 })} uds. de {held.symbol}.
          <button type="button" className="btn-ghost" onClick={() => setQty(String(held.quantity))}>Vender todo</button>
          {overHeld && <span className="tag tag-gold">Más de lo que tienes</span>}
        </p>
      )}
      {total !== null && (
        <p className="m-0 text-sm" aria-live="polite">
          {side === "BUY" ? "Pondrás" : "Recibirás"} unos <b className="tabular-nums">{total.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {SYMBOLS[currency]}</b> (cantidad × precio, sin comisión).
        </p>
      )}
      {quoteNote && <p className="text-sm text-neutral-700">{quoteNote}</p>}
      {currency !== "EUR" && <p className="text-sm text-neutral-700">El precio en {currency} se convierte a euros con el tipo de cambio del día de la operación.</p>}
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
      {state?.error && <p role="alert" className="m-0 text-base font-medium p-3 border border-divider rounded-[10px]" style={{ background: "var(--color-amber-100)", color: "var(--color-amber-700)" }}>{state.error}</p>}
      {state?.ok && (
        <p role="status" className="m-0 text-sm text-accent-700">
          {state.ok}.{" "}
          {side === "BUY" && <>Te queda pendiente contar por qué la hiciste: <a href="/inicio">escríbelo en tu diario</a>.</>}
        </p>
      )}
      <button className="btn-primary w-full" disabled={pending || overHeld}>{pending ? "Guardando…" : side === "BUY" ? "Registrar compra" : "Registrar venta"}</button>
    </form>
  );
}

export function ReconcileForm() {
  const [state, action, pending] = useActionState(reconcileAction, undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <button className="btn-secondary py-1 text-xs" disabled={pending}>{pending ? "Recalculando…" : "Recalcular aportaciones propias"}</button>
      {state?.ok && <span role="status" className="text-sm text-accent-700">{state.ok}</span>}
      {state?.error && <span role="alert" className="text-sm font-medium">{state.error}</span>}
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
      {state?.error && <p role="alert" className="m-0 text-sm font-medium">{state.error}</p>}
      {state?.ok && <p role="status" className="m-0 text-sm text-accent-700">{state.ok}</p>}
    </form>
  );
}
