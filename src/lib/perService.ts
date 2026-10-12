import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { providerFor } from "./epsProviders";
import { fetchWeeklySeries } from "./priceSeries";
import { analyzePer, makeSplitAdjuster, ttmFromQuarters, type EpsGrowth, type PerPoint, type PerSignal, type PerStats, type PerSummary, type QuarterEps } from "./per";
import { PER_CONFIG, type PerRangeKey } from "./perConfig";

/**
 * PER histórico con caché en base de datos. Los resultados trimestrales (BPA) se piden a la SEC y se guardan:
 * se refrescan como mucho una vez al día (PER_CONFIG.cacheHours), nunca en cada carga de página.
 * Los precios semanales vienen de Yahoo y se cachean en memoria unas horas.
 */

type Rec = { status: "OK" | "UNAVAILABLE"; quarters: QuarterEps[]; summary: PerSummary | null; reason: string | null; fetchedAt: Date };

const inflight = new Map<string, Promise<Rec | null>>();

function fromRow(row: { status: string; quarters: Prisma.JsonValue; summary: Prisma.JsonValue | null; reason: string | null; fetchedAt: Date }): Rec {
  return { status: row.status === "OK" ? "OK" : "UNAVAILABLE", quarters: (row.quarters ?? []) as unknown as QuarterEps[], summary: (row.summary as unknown as PerSummary | null) ?? null, reason: row.reason, fetchedAt: row.fetchedAt };
}

/** Pide los datos al proveedor, calcula el resumen y lo guarda. Lanza si hay un fallo de red. */
async function refresh(symbol: string): Promise<Rec | null> {
  const provider = providerFor(symbol);
  if (!provider) return null;
  const series = await fetchWeeklySeries(symbol);
  if (!series) throw new Error("Sin precios");
  let rec: Rec;
  if (series.currency !== "USD") {
    rec = { status: "UNAVAILABLE", quarters: [], summary: null, reason: `Cotiza en ${series.currency}: el BPA de la SEC está en dólares y no se pueden comparar.`, fetchedAt: new Date() };
  } else {
    const r = await provider.fetchQuarterlyEps(symbol, makeSplitAdjuster(series.splits));
    if (r.status === "ok") {
      const a = analyzePer(series.prices, ttmFromQuarters(r.quarters), PER_CONFIG.defaultRange);
      rec = { status: "OK", quarters: r.quarters, summary: a.summary, reason: null, fetchedAt: new Date() };
    } else {
      rec = { status: "UNAVAILABLE", quarters: [], summary: null, reason: r.reason, fetchedAt: new Date() };
    }
  }
  const data = {
    provider: provider.id,
    status: rec.status,
    reason: rec.reason,
    quarters: rec.quarters as unknown as Prisma.InputJsonValue,
    summary: rec.summary ? (rec.summary as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
    fetchedAt: rec.fetchedAt,
  };
  await prisma.epsCache.upsert({ where: { symbol }, update: data, create: { symbol, ...data } });
  return rec;
}

/** Datos del símbolo: de la caché si tiene menos de un día; si no, se refrescan (y si falla la red, se sirve lo último guardado). */
async function getRecord(symbolRaw: string): Promise<Rec | null> {
  const symbol = symbolRaw.toUpperCase();
  if (!providerFor(symbol)) return null;
  const row = await prisma.epsCache.findUnique({ where: { symbol } });
  if (row && Date.now() - row.fetchedAt.getTime() < PER_CONFIG.cacheHours * 3600 * 1000) return fromRow(row);
  let p = inflight.get(symbol);
  if (!p) {
    p = refresh(symbol)
      .catch(() => (row ? fromRow(row) : null))
      .finally(() => inflight.delete(symbol));
    inflight.set(symbol, p);
  }
  return p;
}

/** Resumen del PER (rango por defecto) para el listado y la recomendación; null si no aplica o no hay datos. */
export async function getPerSummary(symbol: string): Promise<PerSummary | null> {
  try {
    return (await getRecord(symbol))?.summary ?? null;
  } catch {
    return null;
  }
}

/** Resúmenes de varios símbolos con concurrencia limitada. */
export async function getPerSummaries(symbols: string[], concurrency = 4): Promise<Map<string, PerSummary | null>> {
  const out = new Map<string, PerSummary | null>();
  const queue = [...new Set(symbols.map((s) => s.toUpperCase()))].filter((s) => providerFor(s));
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
  | { available: true; range: PerRangeKey; points: PerPoint[]; stats: PerStats | null; growth: EpsGrowth | null; signal: PerSignal; quarters: number; updatedAt: string };

/** Serie y estadísticas del PER para la ficha, con el precio de hoy y el rango elegido. */
export async function getPerAnalysis(symbol: string, range: PerRangeKey): Promise<PerAnalysis> {
  if (!providerFor(symbol)) return { available: false, reason: "El PER histórico solo está disponible para acciones de EE. UU. (datos de la SEC). Para valores de otros mercados no hay datos de resultados trimestrales gratuitos." };
  let rec: Rec | null = null;
  try {
    rec = await getRecord(symbol);
  } catch {
    rec = null;
  }
  if (!rec) return { available: false, reason: "No se han podido obtener los resultados trimestrales en este momento. Se volverá a intentar más tarde." };
  if (rec.status === "UNAVAILABLE") return { available: false, reason: rec.reason ?? "Datos no disponibles." };
  const series = await fetchWeeklySeries(symbol);
  if (!series) return { available: false, reason: "No se ha podido leer el histórico de precios." };
  const a = analyzePer(series.prices, ttmFromQuarters(rec.quarters), range);
  return { available: true, range, points: a.points, stats: a.stats, growth: a.growth, signal: a.signal, quarters: rec.quarters.length, updatedAt: rec.fetchedAt.toISOString() };
}
