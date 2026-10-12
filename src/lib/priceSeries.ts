/**
 * Serie semanal de cierres (todo el histórico disponible) y splits de una acción, desde el endpoint público
 * de Yahoo Finance. Los cierres de Yahoo ya vienen ajustados por splits (no por dividendos).
 */
import type { PricePoint, Split } from "./per";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const TTL_MS = 6 * 3600 * 1000;
const cache = new Map<string, { at: number; data: WeeklySeries }>();

export type WeeklySeries = { prices: PricePoint[]; splits: Split[]; currency: string };

type ChartJson = {
  chart?: {
    result?: Array<{
      meta?: { currency?: string };
      timestamp?: number[];
      indicators?: { quote?: Array<{ close?: (number | null)[] }> };
      events?: { splits?: Record<string, { date: number; numerator: number; denominator: number }> };
    }>;
  };
};

/** Cierres semanales desde el primer dato. Se piden las fechas (period1=0) y no range=max, que Yahoo degrada a datos trimestrales. */
export async function fetchWeeklySeries(symbol: string): Promise<WeeklySeries | null> {
  const sym = symbol.toUpperCase();
  const hit = cache.get(sym);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?period1=0&period2=${Math.floor(Date.now() / 1000)}&interval=1wk&events=splits`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (!res.ok) return hit?.data ?? null;
    const j = (await res.json()) as ChartJson;
    const r = j.chart?.result?.[0];
    const closes = r?.indicators?.quote?.[0]?.close;
    if (!r?.timestamp || !closes) return hit?.data ?? null;
    const prices: PricePoint[] = [];
    for (let i = 0; i < r.timestamp.length; i++) {
      const c = closes[i];
      if (typeof c === "number" && Number.isFinite(c) && c > 0) prices.push({ date: new Date(r.timestamp[i] * 1000).toISOString().slice(0, 10), close: c });
    }
    const splits: Split[] = Object.values(r.events?.splits ?? {})
      .filter((s) => s.numerator > 0 && s.denominator > 0)
      .map((s) => ({ date: new Date(s.date * 1000).toISOString().slice(0, 10), ratio: s.numerator / s.denominator }))
      .sort((a, b) => a.date.localeCompare(b.date));
    const data: WeeklySeries = { prices, splits, currency: r.meta?.currency ?? "USD" };
    if (cache.size > 100) cache.clear();
    cache.set(sym, { at: Date.now(), data });
    return data;
  } catch {
    return hit?.data ?? null;
  } finally {
    clearTimeout(t);
  }
}
