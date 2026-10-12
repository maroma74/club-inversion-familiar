// Comprueba el cálculo del PER con datos reales (SEC EDGAR + Yahoo Finance), sin base de datos. Uso: npm run per:check -- MSFT AAPL
import { edgarProvider } from "../src/lib/epsProviders";
import { fetchWeeklySeries } from "../src/lib/priceSeries";
import { analyzePer, makeSplitAdjuster, ttmFromQuarters, perSeries } from "../src/lib/per";

async function main() {
  const symbols = process.argv.slice(2);
  for (const sym of symbols) {
    const series = await fetchWeeklySeries(sym);
    if (!series) { console.log(sym, "sin precios"); continue; }
    const adjust = makeSplitAdjuster(series.splits);
    const r = await edgarProvider.fetchQuarterlyEps(sym, adjust);
    if (r.status !== "ok") { console.log(sym, "no disponible:", r.reason); continue; }
    const ttm = ttmFromQuarters(r.quarters);
    console.log(`\n=== ${sym}: ${series.prices.length} semanas, ${r.quarters.length} trimestres (${r.quarters.filter((q) => q.derived).length} derivados), ${ttm.length} TTM, splits: ${series.splits.map((s) => `${s.date} x${s.ratio}`).join(", ") || "ninguno"}`);
    console.log("últimos trimestres:", r.quarters.slice(-6).map((q) => `${q.end} ${q.eps.toFixed(2)}${q.derived ? "*" : ""}`).join(" | "));
    console.log("últimos BPA TTM:", ttm.slice(-4).map((t) => `${t.end} ${t.eps.toFixed(2)} (desde ${t.availableFrom})`).join(" | "));
    const all = perSeries(series.prices, ttm);
    // PER medio por año
    const byYear = new Map<string, number[]>();
    for (const p of all) if (p.per !== null) byYear.set(p.date.slice(0, 4), [...(byYear.get(p.date.slice(0, 4)) ?? []), p.per]);
    console.log("PER por año (mín–media–máx):", [...byYear.entries()].map(([y, v]) => `${y}: ${Math.min(...v).toFixed(1)}–${(v.reduce((a, b) => a + b, 0) / v.length).toFixed(1)}–${Math.max(...v).toFixed(1)}`).join("  "));
    for (const range of ["1y", "3y", "5y", "10y", "all"] as const) {
      const a = analyzePer(series.prices, ttm, range);
      const s = a.stats;
      console.log(`${range.padEnd(3)} PER actual ${s?.current.toFixed(1)} | media ${s?.mean.toFixed(1)} | mediana ${s?.median.toFixed(1)} | mín ${s?.min.toFixed(1)} | máx ${s?.max.toFixed(1)} | p25 ${s?.p25.toFixed(1)} p75 ${s?.p75.toFixed(1)} | percentil ${s?.percentile.toFixed(0)} | desv. ${s?.deviationPct.toFixed(1)}% | n ${s?.n} | señal ${a.signal.signal}${a.signal.valueTrap ? " (trampa)" : ""} | crec. BPA ${a.growth?.growthPct?.toFixed(1) ?? "N/D"}%`);
    }
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
