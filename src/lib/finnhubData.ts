/** Lectura de los datos de analistas de Finnhub. Módulo puro (sin red) para poder probarlo; la descarga está en finnhub.ts. */

export type Consensus = { period: string; strongBuy: number; buy: number; hold: number; sell: number; strongSell: number };
export type Surprise = { period: string; actual: number; estimate: number; beat: boolean };
export type AnalystView = { consensus: Consensus | null; surprises: Surprise[]; nextEarnings: string | null };

export type ConsensusSummary = { total: number; buyPct: number; holdPct: number; sellPct: number; label: "Comprar" | "Mantener" | "Vender" | "Sin consenso" };

/** Resumen del consenso: porcentajes y una palabra. Hace falta un mínimo de analistas para decir algo. */
export function summarizeConsensus(c: Consensus | null, minAnalysts = 3): ConsensusSummary {
  const total = c ? c.strongBuy + c.buy + c.hold + c.sell + c.strongSell : 0;
  if (!c || total < minAnalysts) return { total, buyPct: 0, holdPct: 0, sellPct: 0, label: "Sin consenso" };
  const buyPct = Math.round(((c.strongBuy + c.buy) / total) * 100);
  const sellPct = Math.round(((c.sell + c.strongSell) / total) * 100);
  const holdPct = 100 - buyPct - sellPct;
  const label = buyPct >= 60 ? "Comprar" : sellPct >= 40 ? "Vender" : "Mantener";
  return { total, buyPct, holdPct, sellPct, label };
}

/** Cuántos de los últimos trimestres se batió la previsión de beneficio por acción. */
export function beatCount(surprises: Surprise[]): { beats: number; total: number } {
  return { beats: surprises.filter((s) => s.beat).length, total: surprises.length };
}

type RawRecommendation = { period?: string; strongBuy?: number; buy?: number; hold?: number; sell?: number; strongSell?: number };
type RawEarnings = { period?: string; actual?: number | null; estimate?: number | null };
type RawCalendar = { earningsCalendar?: { date?: string; symbol?: string }[] };

export function parseRecommendation(json: unknown): Consensus | null {
  const list = Array.isArray(json) ? (json as RawRecommendation[]) : [];
  const latest = [...list].filter((r) => r.period).sort((a, b) => String(b.period).localeCompare(String(a.period)))[0];
  if (!latest) return null;
  return { period: String(latest.period), strongBuy: latest.strongBuy ?? 0, buy: latest.buy ?? 0, hold: latest.hold ?? 0, sell: latest.sell ?? 0, strongSell: latest.strongSell ?? 0 };
}

export function parseEarnings(json: unknown): Surprise[] {
  const list = Array.isArray(json) ? (json as RawEarnings[]) : [];
  return list
    .filter((e) => e.period && typeof e.actual === "number" && typeof e.estimate === "number")
    .sort((a, b) => String(b.period).localeCompare(String(a.period)))
    .slice(0, 4)
    .map((e) => ({ period: String(e.period), actual: e.actual as number, estimate: e.estimate as number, beat: (e.actual as number) >= (e.estimate as number) }));
}

export function parseNextEarnings(json: unknown, today: string): string | null {
  const dates = ((json as RawCalendar)?.earningsCalendar ?? []).map((e) => e.date).filter((d): d is string => typeof d === "string" && d >= today).sort();
  return dates[0] ?? null;
}
