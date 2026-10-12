import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { DEFAULT_CRYPTO_WATCHLIST, DEFAULT_ETF_WATCHLIST, DEFAULT_WATCHLIST, fetchStockQuotes, getWatchlist, INDICES, type WatchKind } from "@/lib/stocks";
import { familyLeaderboard } from "@/lib/portfolio";
import { isCrypto } from "@/lib/prices";
import { eur } from "@/lib/format";
import { Sparkline } from "@/components/Sparkline";
import { PageHeader } from "@/components/ui";
import { AutoRefresh } from "@/app/(app)/inversiones/AutoRefresh";
import { addDefaultWatchlistAction, removeWatchlistAction } from "@/app/actions/watchlist";
import { WatchlistForm } from "@/app/(app)/acciones/WatchlistForm";
import { getClubRecommendations } from "@/lib/club";
import { ActionBadge } from "@/components/ClubRecommendationCard";

const Change = ({ v }: { v: number | null }) =>
  v === null ? <span className="text-slate-400">—</span> : <span className={`tabular-nums font-medium ${v >= 0 ? "text-green-600" : "text-red-600"}`}>{v >= 0 ? "+" : ""}{(v * 100).toFixed(2)} %</span>;

/** Decimales según la magnitud: una criptomoneda de céntimos necesita más que una acción. */
const decimals = (n: number) => (n >= 1000 ? 0 : n >= 1 ? 2 : n >= 0.01 ? 4 : 6);
const fmtPrice = (n: number, currency: string, crypto = false) => {
  const d = crypto ? decimals(n) : 2;
  return currency === "EUR" ? eur(n, d) : `${n.toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d })} ${currency}`;
};
const shortNum = (n: number) => (n >= 100 ? n.toFixed(0) : n >= 1 ? n.toFixed(2) : n.toFixed(4));

const MARKET_STATE: Record<string, string> = { REGULAR: "Abierto", PRE: "Preapertura", POST: "Cierre ampliado", CLOSED: "Cerrado", PREPRE: "Cerrado", POSTPOST: "Cerrado" };

const COPY: Record<WatchKind, { title: string; subtitle: string; listTitle: string; empty: string; base: string; footer: string }> = {
  STOCK: {
    title: "Acciones",
    subtitle: "Índices, lista de seguimiento de la familia, análisis técnico y Recomendación del Club por valor. Cotizaciones de Yahoo Finance (bolsa europea con ~15 min de retraso).",
    listTitle: "Lista de seguimiento de la familia",
    empty: "La lista está vacía. Añade valores con el buscador o empieza con una selección de acciones del IBEX, grandes tecnológicas y un ETF mundial.",
    base: "/acciones",
    footer: "Símbolos de Yahoo Finance: bolsa de Madrid termina en .MC (SAN.MC), Ámsterdam en .AS, Xetra en .DE, Milán en .MI, Londres en .L; las acciones de EE. UU. no llevan sufijo.",
  },
  CRYPTO: {
    title: "Cripto",
    subtitle: "Lista de seguimiento de criptomonedas de la familia con Recomendación del Club, análisis técnico, histórico y noticias por moneda. Cotizaciones de Yahoo Finance en euros, mercado 24/7.",
    listTitle: "Criptomonedas seguidas por la familia",
    empty: "La lista está vacía. Añade monedas con el buscador o empieza con una selección de las principales: Bitcoin, Ethereum, Solana, XRP, BNB, Cardano y más.",
    base: "/cripto",
    footer: "Se usa el par en euros de Yahoo Finance (BTC-EUR, ETH-EUR, SOL-EUR…). Si una moneda no tiene par en euros, escribe el par en dólares (p. ej. NEAR-USD). Las criptomonedas cotizan 24 horas, 7 días a la semana, por eso la variación diaria es de 24 h y la semanal, de 7 velas.",
  },
  ETF: {
    title: "ETF",
    subtitle: "Fondos cotizados: lista de seguimiento de la familia, análisis técnico, Recomendación del Club y ficha del fondo (gestora, TER, patrimonio, principales posiciones). Cotizaciones de Yahoo Finance.",
    listTitle: "ETF seguidos por la familia",
    empty: "La lista está vacía. Añade ETF con el buscador o empieza con una selección de ETF UCITS: mundo, S&P 500, Nasdaq, emergentes, Europa, renta fija y oro.",
    base: "/etf",
    footer: "Usa la cotización en euros del ETF (sufijo .DE para Xetra, .AS para Ámsterdam, .MI para Milán). Los ETF UCITS europeos suelen tener versiones de acumulación (Acc) y distribución (Dist).",
  },
};

export async function MarketList({ kind, embedded = false }: { kind: WatchKind; embedded?: boolean }) {
  const user = await requireUser();
  const c = COPY[kind];
  const [watchlist, ranking] = await Promise.all([getWatchlist(user.familyId, kind), familyLeaderboard(user.familyId)]);

  // Valores en cartera (cripto o no, según la sección) que no estén en ninguna lista: en Acciones y Cripto se muestran siempre.
  const crypto = kind === "CRYPTO";
  const held = new Map<string, string[]>();
  for (const r of ranking) for (const h of r.holdings) if (isCrypto(h.symbol) === crypto) held.set(h.symbol, [...(held.get(h.symbol) ?? []), r.userName]);
  const listSymbols = new Set(watchlist.map((w) => w.symbol));
  const allListed = new Set((await getWatchlist(user.familyId)).map((w) => w.symbol));
  const extra = kind !== "ETF" ? [...held.keys()].filter((s) => !allListed.has(s)) : [];
  const symbols = [...watchlist.map((w) => w.symbol), ...extra];

  const [indices, quotes, club] = await Promise.all([crypto ? Promise.resolve([]) : fetchStockQuotes(INDICES.map((i) => i.symbol)), fetchStockQuotes(symbols), getClubRecommendations(symbols)]);
  const names = new Map(watchlist.map((w) => [w.symbol, w.name]));
  const defaults = kind === "ETF" ? DEFAULT_ETF_WATCHLIST : kind === "CRYPTO" ? DEFAULT_CRYPTO_WATCHLIST : DEFAULT_WATCHLIST;

  return (
    <>
      {!embedded && (
        <PageHeader title={c.title} subtitle={c.subtitle}>
          <AutoRefresh />
        </PageHeader>
      )}

      {!crypto && <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {INDICES.map((idx, i) => {
          const q = indices[i];
          return (
            <Link key={idx.symbol} href={`${c.base}/${encodeURIComponent(idx.symbol)}`} className="card py-3 hover:border-indigo-300">
              <div className="text-xs text-slate-500">{idx.name}</div>
              <div className="text-lg font-bold tabular-nums">{q.price ? q.price.toLocaleString("es-ES", { maximumFractionDigits: 0 }) : "—"}</div>
              <div className="text-xs"><Change v={q.price ? q.change1d : null} /> <span className="text-slate-400">hoy</span></div>
            </Link>
          );
        })}
      </div>}

      <div className="card p-0 overflow-hidden mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-slate-100">
          <div>
            <h2 className="font-semibold">{c.listTitle}</h2>
            <p className="text-xs text-slate-500">{watchlist.length} valores seguidos{extra.length ? ` · ${extra.length} más por estar en cartera` : ""}. Pulsa un valor para ver su análisis técnico y la Recomendación del Club.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`${c.base}/ranking`} className="btn-secondary py-1 text-xs">Ranking del Club</Link>
            <WatchlistForm kind={kind} />
          </div>
        </div>
        {watchlist.length < 3 && (
          <div className="px-5 py-4 text-sm text-slate-600 bg-indigo-50/50 border-b border-slate-100 flex flex-wrap items-center gap-3">
            <p>{watchlist.length === 0 ? c.empty : c.empty.replace("La lista está vacía.", "La lista tiene pocos valores.")}</p>
            <form action={addDefaultWatchlistAction}>
              <input type="hidden" name="kind" value={kind} />
              <button className="btn-primary py-1">Añadir {defaults.length} sugeridos</button>
            </form>
          </div>
        )}
        {symbols.length === 0 ? null : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-500 bg-slate-50">
                <tr>
                  <th className="text-left px-5 py-2 font-medium">Valor</th>
                  <th className="text-right px-2 py-2 font-medium">Precio</th>
                  <th className="text-right px-2 py-2 font-medium">{crypto ? "24 h" : "Hoy"}</th>
                  <th className="text-left px-2 py-2 font-medium">Club de inversión</th>
                  <th className="text-right px-2 py-2 font-medium hidden sm:table-cell">{crypto ? "7 d" : "1 sem."}</th>
                  <th className="text-right px-2 py-2 font-medium hidden sm:table-cell">{crypto ? "30 d" : "1 mes"}</th>
                  <th className="px-2 py-2 font-medium hidden md:table-cell">{crypto ? "Últimos 30 días" : "Último mes"}</th>
                  <th className="text-right px-2 py-2 font-medium hidden lg:table-cell">Rango 52 sem.</th>
                  {!crypto && <th className="text-left px-2 py-2 font-medium hidden lg:table-cell">Mercado</th>}
                  <th className="px-5 py-2" />
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => {
                  const owners = held.get(q.symbol);
                  const pos52 = q.high52 && q.low52 && q.high52 > q.low52 ? (q.price - q.low52) / (q.high52 - q.low52) : null;
                  const rec = club.get(q.symbol);
                  return (
                    <tr key={q.symbol} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-5 py-2">
                        <Link href={`${c.base}/${encodeURIComponent(q.symbol)}`} className="font-medium text-indigo-700 hover:underline">{names.get(q.symbol) ?? q.name}</Link>
                        {owners && <span className="badge bg-indigo-100 text-indigo-700 ml-2" title={owners.join(", ")}>en cartera</span>}
                        <div className="text-xs text-slate-400">{q.symbol} · {q.exchange}{q.error ? ` · ${q.error}` : ""}</div>
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums font-medium whitespace-nowrap">
                        {q.price ? fmtPrice(q.price, q.currency, crypto) : "—"}
                        {q.price && q.currency !== "EUR" ? <div className="text-xs text-slate-400">{eur(q.priceEur, crypto ? decimals(q.priceEur) : 2)}</div> : null}
                      </td>
                      <td className="px-2 py-2 text-right whitespace-nowrap"><Change v={q.price ? q.change1d : null} /></td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        {rec ? (
                          <Link href={`${c.base}/${encodeURIComponent(q.symbol)}`} title={`${rec.bias} · confianza ${rec.confidence}`} className="inline-flex items-center gap-1.5">
                            <ActionBadge action={rec.action} small />
                            <span className={`text-xs tabular-nums font-medium ${rec.total >= 0.3 ? "text-green-600" : rec.total <= -0.3 ? "text-red-600" : "text-slate-500"}`}>{rec.total > 0 ? "+" : ""}{rec.total.toFixed(2)}</span>
                            {rec.daysToEarnings !== null && rec.daysToEarnings >= 0 && rec.daysToEarnings <= 10 && <span className="text-[10px] text-amber-700" title={`Resultados el ${rec.earningsDate}`}>📅</span>}
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-400">N/D</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right whitespace-nowrap hidden sm:table-cell"><Change v={q.change1w} /></td>
                      <td className="px-2 py-2 text-right whitespace-nowrap hidden sm:table-cell"><Change v={q.change1m} /></td>
                      <td className="px-2 py-2 hidden md:table-cell"><Sparkline data={q.sparkline} positive={(q.change1m ?? 0) >= 0} /></td>
                      <td className="px-2 py-2 hidden lg:table-cell">
                        {pos52 !== null ? (
                          <div className="w-28 ml-auto">
                            <div className="h-1.5 bg-slate-100 rounded-full relative"><div className="absolute top-0 h-1.5 w-1.5 rounded-full bg-indigo-600" style={{ left: `calc(${Math.min(Math.max(pos52, 0), 1) * 100}% - 3px)` }} /></div>
                            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5 tabular-nums"><span>{shortNum(q.low52!)}</span><span>{shortNum(q.high52!)}</span></div>
                          </div>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      {!crypto && <td className="px-2 py-2 text-xs text-slate-500 hidden lg:table-cell">{MARKET_STATE[q.marketState] ?? q.marketState}</td>}
                      <td className="px-5 py-2 text-right whitespace-nowrap">
                        <Link href={`/operaciones?activo=${encodeURIComponent(q.symbol)}#operar`} className="text-xs text-indigo-600 hover:underline mr-3">Operar</Link>
                        {listSymbols.has(q.symbol) && (
                          <form action={removeWatchlistAction} className="inline">
                            <input type="hidden" name="symbol" value={q.symbol} />
                            <button className="text-xs text-slate-400 hover:text-red-600" title="Dejar de seguir">Quitar</button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-xs text-slate-400">{c.footer}</p>
    </>
  );
}
