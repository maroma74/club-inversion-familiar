/**
 * Cálculo del PER histórico (precio / BPA de los últimos 12 meses) y de la señal de valoración.
 * Funciones puras, sin red ni base de datos: reciben datos y devuelven números, así se pueden probar.
 *
 * Idea: en cada fecha, PER = precio de cierre / BPA TTM publicado hasta esa fecha, donde BPA TTM es la suma
 * de los 4 últimos trimestres de BPA diluido. Si el BPA TTM es 0 o negativo, el PER no existe (null).
 */
import { PER_CONFIG, PER_RANGES, type PerRangeKey } from "./perConfig";

// ---------------------------------------------------------------- datos de entrada

/** Un dato de BPA diluido tal como lo publica la SEC (EDGAR). */
export type SecFact = { start?: string; end: string; val: number; filed: string };

/** BPA de un trimestre ya ajustado a las acciones actuales. */
export type QuarterEps = {
  start: string;
  end: string;
  eps: number;
  availableFrom: string; // primera fecha en que el mercado pudo conocerlo (fecha de la primera publicación)
  derived: boolean; // cuarto trimestre calculado como año completo menos los tres primeros
};

export type TtmPoint = { end: string; availableFrom: string; eps: number };
export type PricePoint = { date: string; close: number };
export type PerPoint = { date: string; price: number; eps: number | null; per: number | null };

const MS_DAY = 86_400_000;
const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / MS_DAY);
const addDays = (d: string, n: number) => new Date(Date.parse(d) + n * MS_DAY).toISOString().slice(0, 10);

// ---------------------------------------------------------------- splits

export type Split = { date: string; ratio: number }; // ratio 4 = 4 acciones por cada una

/**
 * Ajuste por splits del BPA: un dato publicado en `reportedAt` está en las acciones de ese momento, así que se
 * divide por el producto de los splits posteriores a esa fecha para dejarlo en acciones actuales
 * (el precio de Yahoo ya viene ajustado por splits).
 */
export function makeSplitAdjuster(splits: Split[]) {
  return (value: number, reportedAt: string) => {
    let f = 1;
    for (const s of splits) if (s.date > reportedAt && s.ratio > 0) f *= s.ratio;
    return value / f;
  };
}

// ---------------------------------------------------------------- BPA trimestral

type Period = { start: string; end: string; val: number; reportedAt: string; availableFrom: string };

/**
 * Trimestres de BPA diluido a partir de los datos de EDGAR.
 * - Cada periodo aparece en varias publicaciones (10-Q, 10-K, comparativos): se queda con el valor de la última
 *   publicación (ajustado por splits o reexpresiones) y con la fecha de la primera como momento de disponibilidad.
 * - Se usan los periodos de unos 3 meses; los acumulados de 6 y 9 meses se ignoran.
 * - El cuarto trimestre no se publica aparte: se obtiene restando los tres primeros al dato anual.
 */
export function quartersFromFacts(facts: SecFact[], adjust: (v: number, reportedAt: string) => number = (v) => v): QuarterEps[] {
  const periods = new Map<string, Period>();
  for (const f of facts) {
    if (!f.start || !Number.isFinite(f.val) || !f.end || !f.filed) continue;
    const key = `${f.start}|${f.end}`;
    const cur = periods.get(key);
    if (!cur) periods.set(key, { start: f.start, end: f.end, val: f.val, reportedAt: f.filed, availableFrom: f.filed });
    else {
      if (f.filed > cur.reportedAt) {
        cur.val = f.val;
        cur.reportedAt = f.filed;
      }
      if (f.filed < cur.availableFrom) cur.availableFrom = f.filed;
    }
  }
  const all = [...periods.values()];
  const dur = (p: Period) => days(p.start, p.end);
  const quarters = all.filter((p) => dur(p) >= 80 && dur(p) <= 100);
  const annuals = all.filter((p) => dur(p) >= 350 && dur(p) <= 380);

  const out: QuarterEps[] = quarters.map((q) => ({ start: q.start, end: q.end, eps: adjust(q.val, q.reportedAt), availableFrom: q.availableFrom, derived: false }));

  for (const a of annuals) {
    // ¿ya hay un cuarto trimestre publicado que acabe en la misma fecha que el año?
    if (quarters.some((q) => Math.abs(days(q.end, a.end)) <= 5)) continue;
    const inside = quarters.filter((q) => q.start >= addDays(a.start, -5) && q.end < addDays(a.end, -30)).sort((x, y) => x.end.localeCompare(y.end));
    if (inside.length !== 3) continue;
    const q4 = adjust(a.val, a.reportedAt) - inside.reduce((s, q) => s + adjust(q.val, q.reportedAt), 0);
    out.push({ start: addDays(inside[2].end, 1), end: a.end, eps: q4, availableFrom: a.availableFrom, derived: true });
  }
  return out.sort((x, y) => x.end.localeCompare(y.end));
}

/** BPA TTM: suma de 4 trimestres consecutivos, disponible desde que se publicó el último de ellos. */
export function ttmFromQuarters(quarters: QuarterEps[]): TtmPoint[] {
  const qs = [...quarters].sort((a, b) => a.end.localeCompare(b.end));
  const out: TtmPoint[] = [];
  for (let i = 3; i < qs.length; i++) {
    const w = qs.slice(i - 3, i + 1);
    let consecutive = true;
    for (let j = 1; j < 4; j++) {
      const gap = days(w[j - 1].end, w[j].end);
      if (gap < 70 || gap > 110) consecutive = false;
    }
    if (!consecutive) continue; // faltan datos: mejor no inventar
    out.push({ end: w[3].end, availableFrom: w.reduce((m, q) => (q.availableFrom > m ? q.availableFrom : m), ""), eps: w.reduce((s, q) => s + q.eps, 0) });
  }
  return out;
}

// ---------------------------------------------------------------- BPA desde Yahoo (anual y últimos 12 meses)

export type YahooEpsRow = { asOfDate: string; value: number; kind: "annual" | "trailing" };

/**
 * Serie de BPA de los últimos 12 meses a partir de los datos de Yahoo: los puntos «trailing» ya son TTM y los
 * anuales lo son a cierre de ejercicio. Se consideran conocidos por el mercado unas semanas después del cierre
 * (publicación de resultados): 45 días los trimestrales, 60 los anuales. `adjust` deja el BPA en acciones actuales.
 */
export function ttmFromYahooRows(rows: YahooEpsRow[], adjust: (value: number, reportedAt: string) => number = (v) => v): TtmPoint[] {
  const byEnd = new Map<string, TtmPoint>();
  for (const r of rows) {
    if (!r.asOfDate || !Number.isFinite(r.value)) continue;
    const availableFrom = addDays(r.asOfDate, r.kind === "annual" ? 60 : 45);
    const point = { end: r.asOfDate, availableFrom, eps: adjust(r.value, availableFrom) };
    const prev = byEnd.get(r.asOfDate);
    if (!prev || (prev && r.kind === "trailing")) byEnd.set(r.asOfDate, point); // el dato TTM manda sobre el anual del mismo cierre
  }
  return [...byEnd.values()].sort((a, b) => a.end.localeCompare(b.end));
}

// ---------------------------------------------------------------- serie PER

/** PER en cada fecha de precio con el último BPA TTM publicado hasta ese día. BPA ≤ 0 o sin dato → per null. */
export function perSeries(prices: PricePoint[], ttm: TtmPoint[]): PerPoint[] {
  const sorted = [...ttm].sort((a, b) => a.availableFrom.localeCompare(b.availableFrom) || a.end.localeCompare(b.end));
  const out: PerPoint[] = [];
  let k = -1;
  for (const p of [...prices].sort((a, b) => a.date.localeCompare(b.date))) {
    while (k + 1 < sorted.length && sorted[k + 1].availableFrom <= p.date) k++;
    const eps = k >= 0 ? sorted[k].eps : null;
    out.push({ date: p.date, price: p.close, eps, per: eps !== null && eps > 0 && p.close > 0 ? p.close / eps : null });
  }
  return out;
}

// ---------------------------------------------------------------- estadísticas

/** Percentil de `x` dentro de `values`: % de valores iguales o inferiores. */
export function percentileOf(values: number[], x: number): number {
  if (values.length === 0) return NaN;
  return (values.filter((v) => v <= x).length / values.length) * 100;
}

/** Cuantil (0 a 1) con interpolación lineal. */
export function quantile(values: number[], q: number): number {
  if (values.length === 0) return NaN;
  const s = [...values].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

export const median = (values: number[]) => quantile(values, 0.5);

export type PerStats = {
  current: number;
  currentDate: string;
  mean: number;
  median: number;
  min: number;
  max: number;
  p25: number;
  p75: number;
  percentile: number; // percentil del PER actual en el periodo (0 = el más bajo, 100 = el más alto)
  deviationPct: number; // % de diferencia del PER actual respecto a la media
  n: number; // puntos con PER válido
};

/** Fecha de inicio de un rango contando hacia atrás desde la última fecha (null = sin límite). */
export function rangeStart(lastDate: string, range: PerRangeKey): string | null {
  const years = PER_RANGES[range].years;
  if (years === null) return null;
  const d = new Date(Date.parse(lastDate));
  d.setUTCFullYear(d.getUTCFullYear() - years);
  return d.toISOString().slice(0, 10);
}

/**
 * Estadísticas del PER en el periodo. Devuelve null si el PER actual no existe (BPA ≤ 0) o hay menos
 * puntos válidos que `minPoints`.
 */
export function perStats(points: PerPoint[], minPoints = PER_CONFIG.minPoints): PerStats | null {
  const last = points[points.length - 1];
  if (!last || last.per === null) return null;
  const vals = points.map((p) => p.per).filter((v): v is number => v !== null);
  if (vals.length < minPoints) return null;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  return {
    current: last.per,
    currentDate: last.date,
    mean,
    median: median(vals),
    min: Math.min(...vals),
    max: Math.max(...vals),
    p25: quantile(vals, 0.25),
    p75: quantile(vals, 0.75),
    percentile: percentileOf(vals, last.per),
    deviationPct: (last.per / mean - 1) * 100,
    n: vals.length,
  };
}

// ---------------------------------------------------------------- crecimiento del BPA y señal

export type EpsGrowth = { current: number; yearAgo: number | null; growthPct: number | null; growing: boolean | null };

/** BPA TTM actual frente al de hace 4 trimestres (≈1 año). `growing` es null si no hay dato de hace un año. */
export function epsGrowth(ttm: TtmPoint[]): EpsGrowth | null {
  const s = [...ttm].sort((a, b) => a.end.localeCompare(b.end));
  const cur = s[s.length - 1];
  if (!cur) return null;
  // «Hace un año» por fechas, no por posición: la serie puede ser trimestral (SEC) o anual (Yahoo)
  // Se admite entre 10 y 15 meses atrás (algunas empresas publican el TTM a fechas irregulares) y se elige el más cercano a 12.
  const prev = s
    .filter((p) => { const d = days(p.end, cur.end); return d >= 300 && d <= 460; })
    .sort((a, b) => Math.abs(days(a.end, cur.end) - 365) - Math.abs(days(b.end, cur.end) - 365))[0] ?? null;
  return {
    current: cur.eps,
    yearAgo: prev ? prev.eps : null,
    growthPct: prev && prev.eps > 0 ? (cur.eps / prev.eps - 1) * 100 : null,
    growing: prev ? cur.eps > prev.eps : null,
  };
}

export type PerSignalKind = "Barata" | "Neutral" | "Cara" | "N/D";
export type PerSignal = { signal: PerSignalKind; valueTrap: boolean; reason: string };

/**
 * Señal de valoración:
 * - Barata: percentil ≤ umbral bajo Y BPA TTM creciendo frente a hace un año.
 * - Cara: percentil ≥ umbral alto.
 * - Neutral: el resto. Si el PER es bajo pero el BPA cae (o no se conoce), no es «Barata»: se avisa de posible trampa de valor.
 */
export function valuationSignal(stats: PerStats | null, growth: EpsGrowth | null, cfg = PER_CONFIG): PerSignal {
  if (!stats) return { signal: "N/D", valueTrap: false, reason: growth && growth.current <= 0 ? "BPA de los últimos 12 meses negativo o cero: el PER no se puede calcular." : "Histórico insuficiente para valorar." };
  const low = stats.percentile <= cfg.cheapPercentile;
  if (stats.percentile >= cfg.expensivePercentile) return { signal: "Cara", valueTrap: false, reason: `PER en el percentil ${stats.percentile.toFixed(0)} de su historia: más caro que la mayor parte del periodo.` };
  if (low && growth?.growing === true) return { signal: "Barata", valueTrap: false, reason: `PER en el percentil ${stats.percentile.toFixed(0)} y beneficio por acción creciendo.` };
  if (low) {
    const why = growth?.growing === false ? "el beneficio por acción de los últimos 12 meses está cayendo" : "no se puede confirmar que el beneficio por acción crezca";
    return { signal: "Neutral", valueTrap: growth?.growing === false, reason: `PER bajo (percentil ${stats.percentile.toFixed(0)}), pero ${why}: posible trampa de valor.` };
  }
  return { signal: "Neutral", valueTrap: false, reason: `PER en el percentil ${stats.percentile.toFixed(0)}: dentro de lo habitual de su historia.` };
}

/** Puntuación (-2 a +2) del bloque «Valoración (PER)» de la recomendación; null si no hay señal. */
export function valuationScore(stats: PerStats | null, sig: PerSignal, cfg = PER_CONFIG): number | null {
  if (!stats || sig.signal === "N/D") return null;
  if (sig.signal === "Barata") return cfg.scores.cheap;
  if (sig.signal === "Cara") return cfg.scores.expensive;
  if (stats.percentile <= cfg.cheapPercentile) return cfg.scores.trap; // PER bajo con BPA que no crece
  const span = cfg.expensivePercentile - cfg.cheapPercentile;
  const mid = (cfg.cheapPercentile + cfg.expensivePercentile) / 2;
  return Math.round(((mid - stats.percentile) / (span / 2)) * cfg.scores.neutralSlope * 100) / 100;
}

// ---------------------------------------------------------------- resumen

export type PerSummary = {
  range: PerRangeKey;
  asOf: string;
  per: number | null;
  percentile: number | null;
  mean: number | null;
  deviationPct: number | null;
  epsGrowthPct: number | null;
  signal: PerSignalKind;
  valueTrap: boolean;
  reason: string;
  score: number | null; // puntuación del bloque de la recomendación
};

/** Todo junto para un periodo: puntos, estadísticas, señal y resumen. */
export function analyzePer(prices: PricePoint[], ttm: TtmPoint[], range: PerRangeKey = PER_CONFIG.defaultRange, cfg = PER_CONFIG) {
  const all = perSeries(prices, ttm);
  const lastDate = all[all.length - 1]?.date ?? "";
  const from = lastDate ? rangeStart(lastDate, range) : null;
  const points = from ? all.filter((p) => p.date >= from) : all;
  const stats = perStats(points, cfg.minPoints);
  const growth = epsGrowth(ttm);
  const signal = valuationSignal(stats, growth, cfg);
  const score = valuationScore(stats, signal, cfg);
  const summary: PerSummary = {
    range,
    asOf: lastDate,
    per: stats?.current ?? null,
    percentile: stats?.percentile ?? null,
    mean: stats?.mean ?? null,
    deviationPct: stats?.deviationPct ?? null,
    epsGrowthPct: growth?.growthPct ?? null,
    signal: signal.signal,
    valueTrap: signal.valueTrap,
    reason: signal.reason,
    score,
  };
  return { points, stats, growth, signal, summary };
}
