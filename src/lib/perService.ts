import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { providersFor } from "./epsProviders";
import { fetchWeeklySeries } from "./priceSeries";
import { logError } from "./log";
import { analyzePer, makeSplitAdjuster, ttmFromQuarters, type EpsGrowth, type PerPoint, type PerSignal, type PerStats, type PerSummary, type PricePoint, type QuarterEps, type TtmPoint } from "./per";
import { PER_CONFIG, type PerRangeKey } from "./perConfig";

/**
 * PER histórico con caché en base de datos. El BPA se pide a los proveedores (SEC para EE. UU., Yahoo para el resto)
 * y se guarda: se refresca como mucho una vez al día (PER_CONFIG.cacheHours), nunca en cada carga de página.
 * Los precios semanales vienen de Yahoo y se cachean en memoria unas horas.
 */

type Rec = { status: "OK" | "UNAVAILABLE"; quarters: QuarterEps[]; ttm: TtmPoint[]; currency: string | null; summary: PerSummary | null; reason: string | null; fetchedAt: Date };

const inflight = new Map<string, Promise<Rec | null>>();

function fromRow(row: { status: string; quarters: Prisma.JsonValue; ttm: Prisma.JsonValue | null; currency: string | null; summary: Prisma.JsonValue | null; reason: string | null; fetchedAt: Date }): Rec {
  return {
    status: row.status === "OK" ? "OK" : "UNAVAILABLE",
    quarters: (row.quarters ?? []) as unknown as QuarterEps[],
    ttm: (row.ttm ?? []) as unknown as TtmPoint[],
    currency: row.currency,
    summary: (row.summary as unknown as PerSummary | null) ?? null,
    reason: row.reason,
    fetchedAt: row.fetchedAt,
  };
}

/** Serie TTM de un registro: la guardada (Yahoo) o la construida a partir de los trimestres (SEC). */
const ttmOf = (rec: Rec) => (rec.ttm.length ? rec.ttm : ttmFromQuarters(rec.quarters));

/**
 * Precios en la divisa del BPA. Londres cotiza en peniques (GBp) y publica el BPA en libras: se pasan los precios
 * a libras. Cualquier otra diferencia de divisa no se puede comparar y el PER queda «no disponible».
 */
function pricesInEpsCurrency(series: { prices: PricePoint[]; currency: string }, epsCurrency: string): PricePoint[] | null {
  if (series.currency === epsCurrency) return series.prices;
  if (series.currency === "GBp" && epsCurrency === "GBP") return series.prices.map((p) => ({ date: p.date, close: p.close / 100 }));
  return null;
}

/** Pide los datos a los proveedores (en orden), calcula el resumen y lo guarda. Lanza si todos fallan por red. */
async function refresh(symbol: string): Promise<Rec | null> {
  const providers = providersFor(symbol);
  if (providers.length === 0) return null;
  const series = await fetchWeeklySeries(symbol);
  if (!series) throw new Error("Sin precios");
  const adjust = makeSplitAdjuster(series.splits);

  let rec: Rec | null = null;
  let providerId = providers[0].id;
  let lastReason = "Datos no disponibles.";
  let lastError: unknown = null;
  for (const provider of providers) {
    try {
      const r = await provider.fetchQuarterlyEps(symbol, adjust);
      providerId = provider.id;
      if (r.status !== "ok") { lastReason = r.reason; continue; }
      const prices = pricesInEpsCurrency(series, r.currency);
      if (!prices) { lastReason = `Cotiza en ${series.currency} y el beneficio por acción está en ${r.currency}: no se pueden comparar.`; continue; }
      const ttm = r.ttm ?? ttmFromQuarters(r.quarters);
      const a = analyzePer(prices, ttm, PER_CONFIG.defaultRange);
      rec = { status: "OK", quarters: r.quarters, ttm: r.ttm ?? [], currency: r.currency, summary: a.summary, reason: null, fetchedAt: new Date() };
      break;
    } catch (e) {
      lastError = e;
      logError("per.provider", e, { symbol, provider: provider.id });
    }
  }
  if (!rec) {
    if (lastError && lastReason === "Datos no disponibles.") throw lastError; // ningún proveedor llegó a responder: fallo de red, no «sin datos»
    rec = { status: "UNAVAILABLE", quarters: [], ttm: [], currency: null, summary: null, reason: lastReason, fetchedAt: new Date() };
  }
  const data = {
    provider: providerId,
    status: rec.status,
    reason: rec.reason,
    quarters: rec.quarters as unknown as Prisma.InputJsonValue,
    ttm: rec.ttm.length ? (rec.ttm as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
    currency: rec.currency,
    summary: rec.summary ? (rec.summary as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
    fetchedAt: rec.fetchedAt,
  };
  await prisma.epsCache.upsert({ where: { symbol }, update: data, create: { symbol, ...data } });
  return rec;
}

/** Datos del símbolo: de la caché si tiene menos de un día; si no, se refrescan (y si falla la red, se sirve lo último guardado). */
async function getRecord(symbolRaw: string): Promise<Rec | null> {
  const symbol = symbolRaw.toUpperCase();
  if (providersFor(symbol).length === 0) return null;
  const row = await prisma.epsCache.findUnique({ where: { symbol } });
  if (row && Date.now() - row.fetchedAt.getTime() < PER_CONFIG.cacheHours * 3600 * 1000) return fromRow(row);
  let p = inflight.get(symbol);
  if (!p) {
    p = refresh(symbol)
      .catch((e) => {
        logError("per.refresh", e, { symbol, cached: Boolean(row) });
        return row ? fromRow(row) : null;
      })
      .finally(() => inflight.delete(symbol));
    inflight.set(symbol, p);
  }
  return p;
}

/** Resumen del PER (rango por defecto) para el listado y la recomendación; null si no aplica o no hay datos. */
export async function getPerSummary(symbol: string): Promise<PerSummary | null> {
  try {
    return (await getRecord(symbol))?.summary ?? null;
  } catch (e) {
    logError("per.summary", e, { symbol });
    return null;
  }
}

/** Resúmenes de varios símbolos con concurrencia limitada. */
export async function getPerSummaries(symbols: string[], concurrency = 4): Promise<Map<string, PerSummary | null>> {
  const out = new Map<string, PerSummary | null>();
  const queue = [...new Set(symbols.map((s) => s.toUpperCase()))].filter((s) => providersFor(s).length > 0);
  await Promise.all(
    Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
      while (queue.length) {
        const s = queue.shift()!;
        out.set(s, await getPerSummary(s));
      }
    }),
  );
  return out;
}

export type PerAnalysis =
  | { available: false; reason: string }
  | { available: true; range: PerRangeKey; points: PerPoint[]; stats: PerStats | null; growth: EpsGrowth | null; signal: PerSignal; quarters: number; updatedAt: string; currency: string };

/** Serie y estadísticas del PER para la ficha, con el precio de hoy y el rango elegido. */
export async function getPerAnalysis(symbol: string, range: PerRangeKey): Promise<PerAnalysis> {
  if (providersFor(symbol).length === 0) return { available: false, reason: "El PER histórico solo está disponible para acciones: no para índices, divisas, criptomonedas ni materias primas." };
  let rec: Rec | null = null;
  try {
    rec = await getRecord(symbol);
  } catch (e) {
    logError("per.analysis", e, { symbol });
    rec = null;
  }
  if (!rec) return { available: false, reason: "No se han podido obtener los resultados en este momento. Se volverá a intentar más tarde." };
  if (rec.status === "UNAVAILABLE") return { available: false, reason: rec.reason ?? "Datos no disponibles." };
  const series = await fetchWeeklySeries(symbol);
  if (!series) return { available: false, reason: "No se ha podido leer el histórico de precios." };
  const prices = pricesInEpsCurrency(series, rec.currency ?? "USD");
  if (!prices) return { available: false, reason: `Cotiza en ${series.currency} y el beneficio por acción está en ${rec.currency}: no se pueden comparar.` };
  const ttm = ttmOf(rec);
  const a = analyzePer(prices, ttm, range);
  return { available: true, range, points: a.points, stats: a.stats, growth: a.growth, signal: a.signal, quarters: rec.quarters.length || ttm.length, updatedAt: rec.fetchedAt.toISOString(), currency: rec.currency ?? "USD" };
}
