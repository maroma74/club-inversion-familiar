import { test } from "node:test";
import assert from "node:assert/strict";
import {
  analyzePer,
  epsGrowth,
  makeSplitAdjuster,
  median,
  percentileOf,
  perSeries,
  perStats,
  quantile,
  quartersFromFacts,
  ttmFromQuarters,
  valuationScore,
  valuationSignal,
  type EpsGrowth,
  type PerPoint,
  type PerStats,
  type PricePoint,
  type QuarterEps,
  type SecFact,
  type TtmPoint,
} from "./per";
import { PER_CONFIG } from "./perConfig";

const close = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} no es ${b}`);

/** Un año fiscal tipo Microsoft (julio a junio) con los datos que publica EDGAR. */
function fiscalYearFacts(): SecFact[] {
  return [
    { start: "2023-07-01", end: "2023-09-30", val: 2.5, filed: "2023-10-24" }, // Q1
    { start: "2023-10-01", end: "2023-12-31", val: 2.9, filed: "2024-01-30" }, // Q2
    { start: "2023-07-01", end: "2023-12-31", val: 5.4, filed: "2024-01-30" }, // 6 meses acumulados: se ignora
    { start: "2024-01-01", end: "2024-03-31", val: 2.9, filed: "2024-04-25" }, // Q3
    { start: "2023-07-01", end: "2024-03-31", val: 8.3, filed: "2024-04-25" }, // 9 meses acumulados: se ignora
    { start: "2023-07-01", end: "2024-06-30", val: 11.8, filed: "2024-07-30" }, // año completo
  ];
}

test("el cuarto trimestre se obtiene restando los tres primeros al año completo", () => {
  const q = quartersFromFacts(fiscalYearFacts());
  assert.equal(q.length, 4);
  const q4 = q[3];
  assert.equal(q4.derived, true);
  assert.equal(q4.end, "2024-06-30");
  close(q4.eps, 11.8 - (2.5 + 2.9 + 2.9)); // 3,5
  assert.equal(q4.availableFrom, "2024-07-30"); // se conoce cuando se publica el 10-K
  assert.deepEqual(q.map((x) => x.end), ["2023-09-30", "2023-12-31", "2024-03-31", "2024-06-30"]);
});

test("los acumulados de 6 y 9 meses no se cuentan como trimestres", () => {
  const q = quartersFromFacts(fiscalYearFacts());
  assert.ok(q.every((x) => x.eps < 4));
  assert.equal(q.filter((x) => !x.derived).length, 3);
});

test("si un periodo se publica varias veces se usa el valor de la última publicación y la fecha de la primera", () => {
  const facts: SecFact[] = [
    { start: "2024-01-01", end: "2024-03-31", val: 2.9, filed: "2024-04-25" },
    { start: "2024-01-01", end: "2024-03-31", val: 2.95, filed: "2025-04-28" }, // comparativo reexpresado
  ];
  const q = quartersFromFacts([...facts, ...fiscalYearFacts().filter((f) => f.end !== "2024-03-31" || f.start !== "2024-01-01")]);
  const q3 = q.find((x) => x.end === "2024-03-31")!;
  close(q3.eps, 2.95);
  assert.equal(q3.availableFrom, "2024-04-25");
});

test("no se deriva el cuarto trimestre si faltan trimestres del año", () => {
  const facts = fiscalYearFacts().filter((f) => f.end !== "2023-12-31" || f.start !== "2023-10-01");
  const q = quartersFromFacts(facts);
  assert.equal(q.some((x) => x.derived), false);
  assert.equal(q.length, 2);
});

test("el ajuste por splits deja el BPA antiguo en acciones actuales", () => {
  const adjust = makeSplitAdjuster([
    { date: "2021-07-20", ratio: 4 },
    { date: "2024-06-10", ratio: 10 },
  ]);
  close(adjust(8, "2020-05-20"), 8 / 40); // posterior a los dos splits
  close(adjust(8, "2022-05-20"), 8 / 10); // solo el segundo
  close(adjust(8, "2025-01-01"), 8); // ya publicado en acciones actuales
});

test("el ajuste por splits también se aplica al derivar el cuarto trimestre", () => {
  const adjust = makeSplitAdjuster([{ date: "2024-05-01", ratio: 2 }]);
  // Q1-Q3 publicados antes del split y el año completo, después: cada uno se ajusta según su fecha
  const facts: SecFact[] = [
    { start: "2023-07-01", end: "2023-09-30", val: 4, filed: "2023-10-24" },
    { start: "2023-10-01", end: "2023-12-31", val: 4, filed: "2024-01-30" },
    { start: "2024-01-01", end: "2024-03-31", val: 4, filed: "2024-04-25" },
    { start: "2023-07-01", end: "2024-06-30", val: 8, filed: "2024-07-30" }, // ya en acciones nuevas
  ];
  const q = quartersFromFacts(facts, adjust);
  close(q[0].eps, 2);
  close(q[3].eps, 8 - 6); // 2: año en acciones nuevas menos tres trimestres de 2
});

const mkQ = (end: string, eps: number, availableFrom = end): QuarterEps => ({ start: end, end, eps, availableFrom, derived: false });

test("el BPA TTM es la suma de los 4 últimos trimestres", () => {
  const ttm = ttmFromQuarters([mkQ("2023-03-31", 1), mkQ("2023-06-30", 2), mkQ("2023-09-30", 3), mkQ("2023-12-31", 4), mkQ("2024-03-31", 5)]);
  assert.equal(ttm.length, 2);
  close(ttm[0].eps, 10);
  close(ttm[1].eps, 14);
  assert.equal(ttm[1].end, "2024-03-31");
});

test("el BPA TTM se publica cuando se publica el último trimestre de la ventana", () => {
  const ttm = ttmFromQuarters([mkQ("2023-03-31", 1, "2023-04-20"), mkQ("2023-06-30", 2, "2023-07-20"), mkQ("2023-09-30", 3, "2023-10-20"), mkQ("2023-12-31", 4, "2024-01-25")]);
  assert.equal(ttm[0].availableFrom, "2024-01-25");
});

test("con un trimestre que falta no se inventa un BPA TTM", () => {
  const ttm = ttmFromQuarters([mkQ("2023-03-31", 1), mkQ("2023-06-30", 2), mkQ("2023-12-31", 4), mkQ("2024-03-31", 5), mkQ("2024-06-30", 6)]);
  assert.equal(ttm.length, 0); // ninguna ventana de 4 trimestres seguidos
  assert.equal(ttmFromQuarters([mkQ("2023-03-31", 1), mkQ("2023-06-30", 2)]).length, 0);
});

const prices = (rows: [string, number][]): PricePoint[] => rows.map(([date, close]) => ({ date, close }));
const ttm = (rows: [string, string, number][]): TtmPoint[] => rows.map(([end, availableFrom, eps]) => ({ end, availableFrom, eps }));

test("PER = precio / BPA TTM publicado hasta esa fecha", () => {
  const s = perSeries(prices([["2024-01-05", 100], ["2024-02-05", 120], ["2024-05-05", 150]]), ttm([["2023-12-31", "2024-01-30", 5], ["2024-03-31", "2024-04-30", 6]]));
  assert.equal(s[0].per, null); // aún no hay BPA publicado
  assert.equal(s[0].eps, null);
  close(s[1].per!, 120 / 5); // 24: usa el BPA de enero
  close(s[2].per!, 150 / 6); // 25: ya está el de abril
});

test("con BPA TTM negativo o cero el PER no existe", () => {
  const s = perSeries(prices([["2024-02-05", 100], ["2024-05-05", 100]]), ttm([["2023-12-31", "2024-01-30", -2], ["2024-03-31", "2024-04-30", 0]]));
  assert.equal(s[0].per, null);
  assert.equal(s[1].per, null);
  assert.equal(s[0].eps, -2); // el BPA sí se conserva para el gráfico de barras
});

test("percentil, mediana y cuantiles", () => {
  const v = [10, 20, 30, 40, 50];
  close(percentileOf(v, 30), 60); // 3 de 5 valores son ≤ 30
  close(percentileOf(v, 10), 20);
  close(percentileOf(v, 5), 0);
  close(percentileOf(v, 99), 100);
  close(median(v), 30);
  close(median([1, 2, 3, 4]), 2.5);
  close(quantile(v, 0.25), 20);
  close(quantile(v, 0.75), 40);
  assert.ok(Number.isNaN(percentileOf([], 1)));
});

const flat = (per: number, n: number): PerPoint[] => Array.from({ length: n }, (_, i) => ({ date: `2023-01-${String((i % 28) + 1).padStart(2, "0")}`, price: per * 5, eps: 5, per }));

test("estadísticas del PER en el periodo", () => {
  const pts = [...flat(20, 30), ...flat(30, 30), { date: "2024-06-01", price: 50, eps: 5, per: 10 }];
  const s = perStats(pts, 10)!;
  close(s.current, 10);
  assert.equal(s.n, 61);
  close(s.min, 10);
  close(s.max, 30);
  assert.ok(s.percentile < 5);
  close(s.mean, (20 * 30 + 30 * 30 + 10) / 61);
  assert.ok(s.deviationPct < 0);
});

test("sin PER actual o con pocos datos no hay estadísticas", () => {
  assert.equal(perStats([...flat(20, 50), { date: "2024-06-01", price: 5, eps: -1, per: null }]), null); // BPA negativo hoy
  assert.equal(perStats(flat(20, 10)), null); // menos de minPoints
  assert.equal(perStats([]), null);
});

test("crecimiento del BPA TTM frente a hace un año", () => {
  const g = epsGrowth(ttm([["2023-03-31", "x", 8], ["2023-06-30", "x", 9], ["2023-09-30", "x", 10], ["2023-12-31", "x", 11], ["2024-03-31", "x", 12]]))!;
  close(g.current, 12);
  assert.equal(g.yearAgo, 8);
  assert.equal(g.growing, true);
  close(g.growthPct!, 50);
  const caida = epsGrowth(ttm([["2023-03-31", "x", 12], ["2023-06-30", "x", 11], ["2023-09-30", "x", 10], ["2023-12-31", "x", 9], ["2024-03-31", "x", 8]]))!;
  assert.equal(caida.growing, false);
  const corto = epsGrowth(ttm([["2024-03-31", "x", 12]]))!;
  assert.equal(corto.growing, null);
  assert.equal(corto.yearAgo, null);
  assert.equal(epsGrowth([]), null);
});

const stats = (percentile: number): PerStats => ({ current: 20, currentDate: "2024-06-01", mean: 25, median: 25, min: 10, max: 40, p25: 18, p75: 32, percentile, deviationPct: -20, n: 100 });
const growth = (growing: boolean | null): EpsGrowth => ({ current: 10, yearAgo: growing === null ? null : 9, growthPct: growing ? 11 : growing === false ? -10 : null, growing });

test("señal Barata: percentil bajo y BPA creciendo", () => {
  const s = valuationSignal(stats(20), growth(true));
  assert.equal(s.signal, "Barata");
  assert.equal(s.valueTrap, false);
  assert.equal(valuationSignal(stats(25), growth(true)).signal, "Barata"); // el umbral es ≤ 25
});

test("señal Cara: percentil alto", () => {
  assert.equal(valuationSignal(stats(75), growth(true)).signal, "Cara"); // el umbral es ≥ 75
  assert.equal(valuationSignal(stats(90), growth(false)).signal, "Cara");
});

test("señal Neutral entre los umbrales", () => {
  const s = valuationSignal(stats(50), growth(true));
  assert.equal(s.signal, "Neutral");
  assert.equal(s.valueTrap, false);
  assert.equal(valuationSignal(stats(26), growth(true)).signal, "Neutral");
  assert.equal(valuationSignal(stats(74), growth(true)).signal, "Neutral");
});

test("PER bajo con BPA cayendo: Neutral con aviso de posible trampa de valor", () => {
  const s = valuationSignal(stats(10), growth(false));
  assert.equal(s.signal, "Neutral");
  assert.equal(s.valueTrap, true);
  assert.match(s.reason, /trampa de valor/);
});

test("PER bajo sin dato de hace un año: no es Barata y no se acusa de trampa", () => {
  const s = valuationSignal(stats(10), growth(null));
  assert.equal(s.signal, "Neutral");
  assert.equal(s.valueTrap, false);
});

test("sin estadísticas la señal es N/D, y explica el BPA negativo", () => {
  assert.equal(valuationSignal(null, null).signal, "N/D");
  const neg = valuationSignal(null, { current: -1, yearAgo: 2, growthPct: null, growing: false });
  assert.equal(neg.signal, "N/D");
  assert.match(neg.reason, /negativo/);
});

test("los umbrales salen de la configuración", () => {
  const cfg = { ...PER_CONFIG, cheapPercentile: 10, expensivePercentile: 60 };
  assert.equal(valuationSignal(stats(20), growth(true), cfg).signal, "Neutral");
  assert.equal(valuationSignal(stats(65), growth(true), cfg).signal, "Cara");
  assert.equal(valuationSignal(stats(8), growth(true), cfg).signal, "Barata");
});

test("puntuación del bloque de valoración", () => {
  const sig = (p: number, g: boolean | null) => valuationSignal(stats(p), growth(g));
  close(valuationScore(stats(10), sig(10, true))!, PER_CONFIG.scores.cheap);
  close(valuationScore(stats(90), sig(90, true))!, PER_CONFIG.scores.expensive);
  close(valuationScore(stats(10), sig(10, false))!, PER_CONFIG.scores.trap); // trampa de valor: no suma
  close(valuationScore(stats(50), sig(50, true))!, 0);
  assert.ok(valuationScore(stats(30), sig(30, true))! > 0);
  assert.ok(valuationScore(stats(70), sig(70, true))! < 0);
  assert.equal(valuationScore(null, valuationSignal(null, null)), null);
});

test("analyzePer de punta a punta con datos sintéticos", () => {
  // 6 años de precios semanales que suben el doble que el BPA → el PER sube y hoy está en máximos
  const px: PricePoint[] = [];
  for (let i = 0; i < 6 * 52; i++) {
    const d = new Date(Date.UTC(2019, 0, 7) + i * 7 * 86400000).toISOString().slice(0, 10);
    px.push({ date: d, close: 50 + i * 0.5 });
  }
  const t: TtmPoint[] = [];
  for (let y = 0; y < 24; y++) {
    const end = new Date(Date.UTC(2018, 11, 31) + y * 91 * 86400000).toISOString().slice(0, 10);
    t.push({ end, availableFrom: new Date(Date.parse(end) + 25 * 86400000).toISOString().slice(0, 10), eps: 4 + y * 0.1 });
  }
  const a = analyzePer(px, t, "5y");
  assert.ok(a.points.length > 200 && a.points.length < 270);
  assert.ok(a.stats);
  assert.equal(a.summary.range, "5y");
  assert.equal(a.signal.signal, a.summary.signal);
  assert.ok(a.summary.percentile !== null && a.summary.percentile > 80);
  assert.equal(a.signal.signal, "Cara");
  const todo = analyzePer(px, t, "all");
  assert.ok(todo.points.length > a.points.length);
});

test("analyzePer con BPA negativo hoy da N/D y no pinta PER", () => {
  const px: PricePoint[] = Array.from({ length: 120 }, (_, i) => ({ date: new Date(Date.UTC(2022, 0, 3) + i * 7 * 86400000).toISOString().slice(0, 10), close: 10 + i * 0.1 }));
  const a = analyzePer(px, ttm([["2021-12-31", "2022-01-10", 3], ["2023-12-31", "2024-01-10", -1]]), "5y");
  assert.equal(a.summary.signal, "N/D");
  assert.equal(a.summary.per, null);
  assert.equal(a.points[a.points.length - 1].per, null);
  assert.equal(a.summary.score, null);
});

test("la serie TTM de Yahoo mezcla anuales y trailing sin duplicar cierres y el crecimiento se mide por fechas", async () => {
  const { ttmFromYahooRows } = await import("./per");
  const rows = [
    { asOfDate: "2023-12-31", value: 0.65, kind: "annual" as const },
    { asOfDate: "2024-12-31", value: 0.77, kind: "annual" as const },
    { asOfDate: "2024-12-31", value: 0.768, kind: "trailing" as const },
    { asOfDate: "2025-06-30", value: 0.83, kind: "trailing" as const },
    { asOfDate: "2025-12-31", value: 0.9, kind: "trailing" as const },
  ];
  const ttm = ttmFromYahooRows(rows);
  assert.deepEqual(ttm.map((p) => p.end), ["2023-12-31", "2024-12-31", "2025-06-30", "2025-12-31"]);
  assert.equal(ttm[1].eps, 0.768, "el dato trailing manda sobre el anual del mismo cierre");
  assert.equal(ttm[0].availableFrom, "2024-02-29", "un anual se conoce 60 días después del cierre");
  assert.equal(ttm[2].availableFrom, "2025-08-14", "un TTM trimestral, 45 días después");
  const g = epsGrowth(ttm)!;
  assert.equal(g.yearAgo, 0.768, "hace un año = el cierre a 12 meses, aunque haya menos de cinco puntos");
  assert.equal(g.growing, true);
});
