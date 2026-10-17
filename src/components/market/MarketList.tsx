import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { DEFAULT_CRYPTO_WATCHLIST, DEFAULT_ETF_WATCHLIST, DEFAULT_WATCHLIST, fetchStockQuotes, getWatchlist, INDICES, type WatchKind } from "@/lib/stocks";
import { familyLeaderboard } from "@/lib/portfolio";
import { symbolKind } from "@/lib/kinds";
import { DEFAULT_COMMODITY_WATCHLIST, findCommodity } from "@/lib/commodities";
import { getPerSummaries } from "@/lib/perService";
import { PerBadge } from "@/components/PerPanel";
import type { PerSummary } from "@/lib/per";
import { eur, num, signed } from "@/lib/format";
import { Sparkline } from "@/components/Sparkline";
import { PageHeader } from "@/components/ui";
import { AutoRefresh } from "@/app/(app)/inversiones/AutoRefresh";
import { addDefaultWatchlistAction } from "@/app/actions/watchlist";
import { WatchlistForm } from "@/app/(app)/acciones/WatchlistForm";
import { getClubRecommendations } from "@/lib/club";
import { RemoveWatchlistButton } from "./RemoveWatchlistButton";
import { ActionBadge } from "@/components/ClubRecommendationCard";
import { ScoreBar } from "@/components/ScoreBar";

const Change = ({ v }: { v: number | null }) =>
  v === null ? <span className="text-neutral-700">—</span> : <span className={`tabular-nums font-medium ${v >= 0 ? "text-accent-700" : "text-ink"}`}>{signed(v * 100, 2)} %</span>;

/** Decimales según la magnitud: una criptomoneda de céntimos necesita más que una acción. */
const decimals = (n: number) => (n >= 1000 ? 0 : n >= 1 ? 2 : n >= 0.01 ? 4 : 6);
const fmtPrice = (n: number, currency: string, crypto = false) => {
  const d = crypto ? decimals(n) : 2;
  return currency === "EUR" ? eur(n, d) : `${n.toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d })} ${currency}`;
};
const shortNum = (n: number) => (n >= 100 ? num(n, 0) : n >= 1 ? num(n, 2) : num(n, 4));

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
  COMMODITY: {
    title: "Materias primas",
    subtitle: "Lista de seguimiento de materias primas de la familia: metales, energía, agrícolas y ganadería, con Recomendación del Club, análisis técnico, histórico y noticias por materia prima. Precios de los futuros continuos de Yahoo Finance, en dólares.",
    listTitle: "Materias primas seguidas por la familia",
    empty: "La lista está vacía. Añade materias primas con el buscador o empieza con una selección: oro, plata, platino, cobre, petróleo, gas natural, trigo, maíz, soja, café y cacao.",
    base: "/materias-primas",
    footer: "Los precios son los del futuro continuo de cada materia prima (contrato más próximo): al cambiar de contrato puede haber un salto de precio. Se muestran en dólares y su equivalente en euros. Para invertir de forma sencilla se usan ETC o ETF de materias primas (por ejemplo, oro físico), que se siguen en la sección ETF.",
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

export async function MarketList({ kind, embedded = false, sort }: { kind: WatchKind; embedded?: boolean; sort?: string }) {
  const user = await requireUser();
  const c = COPY[kind];
  const [watchlist, ranking] = await Promise.all([getWatchlist(user.familyId, kind), familyLeaderboard(user.familyId)]);

  // Valores en cartera (cripto o no, según la sección) que no estén en ninguna lista: en Acciones y Cripto se muestran siempre.
  const crypto = kind === "CRYPTO";
  const commodity = kind === "COMMODITY";
  const fine = crypto || commodity; // más decimales según la magnitud del precio
  const heldKind = kind === "ETF" ? "STOCK" : kind;
  const held = new Map<string, string[]>();
  for (const r of ranking) for (const h of r.holdings) if (symbolKind(h.symbol) === heldKind) held.set(h.symbol, [...(held.get(h.symbol) ?? []), r.userName]);
  const listSymbols = new Set(watchlist.map((w) => w.symbol));
  const allListed = new Set((await getWatchlist(user.familyId)).map((w) => w.symbol));
  const extra = kind !== "ETF" ? [...held.keys()].filter((s) => !allListed.has(s)) : [];
  const symbols = [...watchlist.map((w) => w.symbol), ...extra];

  const showPer = kind === "STOCK";
  const [indices, quotes, club, perMap] = await Promise.all([fine ? Promise.resolve([]) : fetchStockQuotes(INDICES.map((i) => i.symbol)), fetchStockQuotes(symbols), getClubRecommendations(symbols), showPer ? getPerSummaries(symbols) : Promise.resolve(new Map<string, PerSummary | null>())]);
  // «PER vs histórico» ordenable: de más barata (percentil bajo) a más cara, o al revés; los que no tienen dato, al final
  const perSort = showPer && (sort === "per" || sort === "per_desc") ? sort : null;
  const orderedQuotes = perSort
    ? [...quotes].sort((x, y) => {
        const px = perMap.get(x.symbol.toUpperCase())?.percentile ?? null;
        const py = perMap.get(y.symbol.toUpperCase())?.percentile ?? null;
        if (px === null && py === null) return 0;
        if (px === null) return 1;
        if (py === null) return -1;
        return perSort === "per" ? px - py : py - px;
      })
    : quotes;
  const names = new Map(watchlist.map((w) => [w.symbol, w.name]));
  const defaults = kind === "ETF" ? DEFAULT_ETF_WATCHLIST : kind === "CRYPTO" ? DEFAULT_CRYPTO_WATCHLIST : kind === "COMMODITY" ? DEFAULT_COMMODITY_WATCHLIST : DEFAULT_WATCHLIST;

  return (
    <>
      {!embedded && (
        <PageHeader title={c.title} subtitle={c.subtitle}>
          <AutoRefresh />
        </PageHeader>
      )}

      {!fine && <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {INDICES.map((idx, i) => {
          const q = indices[i];
          return (
            <Link key={idx.symbol} href={`${c.base}/${encodeURIComponent(idx.symbol)}`} className="card py-3 hover:border-indigo-300">
              <div className="text-xs text-neutral-700">{idx.name}</div>
              <div className="text-lg font-bold tabular-nums">{q.price ? q.price.toLocaleString("es-ES", { maximumFractionDigits: 0 }) : "—"}</div>
              <div className="text-xs"><Change v={q.price ? q.change1d : null} /> <span className="text-neutral-700">hoy</span></div>
            </Link>
          );
        })}
      </div>}

      <div className="card p-0 overflow-hidden mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-divider">
          <div>
            <h2 className="font-semibold">{c.listTitle}</h2>
            <p className="text-xs text-neutral-700">{watchlist.length} valores seguidos{extra.length ? ` · ${extra.length} más por estar en cartera` : ""}. Pulsa un valor para ver su análisis técnico y la Recomendación del Club.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`${c.base}/ranking`} className="btn-secondary py-1 text-xs">Ranking del Club</Link>
            <WatchlistForm kind={kind} />
          </div>
        </div>
        {watchlist.length < 3 && (
          <div className="px-5 py-4 text-sm text-slate-600 bg-indigo-50/50 border-b border-divider flex flex-wrap items-center gap-3">
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
              <thead className="text-xs text-neutral-700 bg-[var(--color-surface-2)]">
                <tr>
                  <th className="text-left px-5 py-2 font-medium">Valor</th>
                  <th className="text-right px-2 py-2 font-medium">Precio</th>
                  <th className="text-right px-2 py-2 font-medium">{crypto ? "24 h" : "Hoy"}</th>
                  <th className="text-left px-2 py-2 font-medium">Club de inversión</th>
                  {showPer && (
                    <th className="text-left px-2 py-2 font-medium whitespace-nowrap hidden min-[1100px]:table-cell" aria-sort={perSort === "per" ? "ascending" : perSort === "per_desc" ? "descending" : "none"}>
                      <Link href={`${c.base}?orden=${perSort === "per" ? "per_desc" : "per"}`} className="no-underline text-inherit hover:underline" title="Ordenar por PER frente a su historia: de más barata a más cara">
                        PER vs histórico {perSort === "per" ? "▲" : perSort === "per_desc" ? "▼" : ""}
                      </Link>
                    </th>
                  )}
                  {/* Las columnas secundarias entran según el ancho real que deja la barra lateral (medido: 1 sem./1 mes desde 1240 px, gráfica desde 1400, rango 52 desde 1536) para que la tabla no obligue a desplazar en portátiles */}
                  <th className="text-right px-2 py-2 font-medium hidden min-[1240px]:table-cell">{crypto ? "7 d" : "1 sem."}</th>
                  <th className="text-right px-2 py-2 font-medium hidden min-[1240px]:table-cell">{crypto ? "30 d" : "1 mes"}</th>
                  <th className="px-2 py-2 font-medium hidden min-[1400px]:table-cell">{crypto ? "Últimos 30 días" : "Último mes"}</th>
                  <th className="text-right px-2 py-2 font-medium hidden 2xl:table-cell">Rango 52 sem.</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {orderedQuotes.map((q) => {
                  const owners = held.get(q.symbol);
                  const pos52 = q.high52 && q.low52 && q.high52 > q.low52 ? (q.price - q.low52) / (q.high52 - q.low52) : null;
                  const rec = club.get(q.symbol);
                  return (
                    <tr key={q.symbol} className="border-t border-divider hover:bg-[var(--color-surface-2)]">
                      <td className="px-5 py-2">
                        <Link href={`${c.base}/${encodeURIComponent(q.symbol)}`} className="font-medium text-accent-700 hover:underline">{names.get(q.symbol) ?? q.name}</Link>
                        {owners && <span className="tag tag-accent ml-2" title={owners.join(", ")}>en cartera</span>}
                        <div className="text-xs text-neutral-700">{q.symbol} · {findCommodity(q.symbol)?.group ?? q.exchange}{q.error ? ` · ${q.error}` : ""}</div>
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums font-medium whitespace-nowrap">
                        {q.price ? fmtPrice(q.price, q.currency, fine) : "—"}
                        {q.price && q.currency !== "EUR" ? <div className="text-xs text-neutral-700">{eur(q.priceEur, fine ? decimals(q.priceEur) : 2)}</div> : null}
                      </td>
                      <td className="px-2 py-2 text-right whitespace-nowrap"><Change v={q.price ? q.change1d : null} /></td>
                      <td className="px-2 py-2">
                        {rec ? (
                          <Link href={`${c.base}/${encodeURIComponent(q.symbol)}`} title={`${rec.bias} · confianza ${rec.confidence}`} className="inline-flex flex-col gap-1 no-underline text-inherit">
                            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                              <ActionBadge action={rec.action} small total={rec.total} />
                              <span className={`text-xs tabular-nums font-medium ${rec.total >= 0.3 ? "text-accent-700" : rec.total <= -0.3 ? "text-ink" : "text-neutral-700"}`}>{signed(rec.total, 2)}</span>
                            </span>
                            <ScoreBar total={rec.total} blocks={rec.blocks} />
                            {/* El aviso de resultados va en su propia línea: en la fila del veredicto ensanchaba la columna y obligaba a desplazar la tabla */}
                            {rec.daysToEarnings !== null && rec.daysToEarnings >= 0 && rec.daysToEarnings <= 10 && <span className="tag tag-gold self-start whitespace-nowrap" title={`Resultados el ${rec.earningsDate}`}>Resultados en {rec.daysToEarnings} d</span>}
                          </Link>
                        ) : (
                          <span className="text-xs text-neutral-700">N/D</span>
                        )}
                      </td>
                      {showPer && (
                        <td className="px-2 py-2 whitespace-nowrap hidden min-[1100px]:table-cell">
                          {(() => {
                            const per = perMap.get(q.symbol.toUpperCase());
                            if (!per || per.signal === "N/D" || per.per === null) return <span className="text-xs text-neutral-700" title={per?.reason ?? "Sin datos de beneficio por acción para este valor"}>N/D</span>;
                            return (
                              <Link href={`${c.base}/${encodeURIComponent(q.symbol)}#per-title`} className="no-underline text-inherit" title={per.reason}>
                                <span className="inline-flex items-center gap-1.5">
                                  <PerBadge signal={per.signal} small />
                                  <span className="text-xs tabular-nums font-medium">P{per.percentile?.toFixed(0)}</span>
                                </span>
                                <div className="text-[11px] text-neutral-700 tabular-nums">PER {per.per.toLocaleString("es-ES", { maximumFractionDigits: 1 })}×{per.valueTrap ? " · posible trampa" : ""}</div>
                              </Link>
                            );
                          })()}
                        </td>
                      )}
                      <td className="px-2 py-2 text-right whitespace-nowrap hidden min-[1240px]:table-cell"><Change v={q.change1w} /></td>
                      <td className="px-2 py-2 text-right whitespace-nowrap hidden min-[1240px]:table-cell"><Change v={q.change1m} /></td>
                      <td className="px-2 py-2 hidden min-[1400px]:table-cell"><Sparkline data={q.sparkline} positive={(q.change1m ?? 0) >= 0} /></td>
                      <td className="px-2 py-2 hidden 2xl:table-cell">
                        {pos52 !== null ? (
                          <div className="w-28 ml-auto">
                            <div className="h-1.5 bg-[var(--color-neutral-300)] rounded-full relative"><div className="absolute top-0 h-1.5 w-1.5 rounded-full bg-accent-600" style={{ left: `calc(${Math.min(Math.max(pos52, 0), 1) * 100}% - 3px)` }} /></div>
                            <div className="flex justify-between text-[11px] text-neutral-700 mt-0.5 tabular-nums"><span>{shortNum(q.low52!)}</span><span>{shortNum(q.high52!)}</span></div>
                          </div>
                        ) : <span className="text-neutral-700">—</span>}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <Link href={`/operaciones?activo=${encodeURIComponent(q.symbol)}#operar`} className="btn-ghost min-h-[44px] md:min-h-0">Operar</Link>
                        {listSymbols.has(q.symbol) && user.role === "ADMIN" && <RemoveWatchlistButton symbol={q.symbol} label={names.get(q.symbol) ?? q.name} />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-xs text-neutral-700">{c.footer}</p>
    </>
  );
}
