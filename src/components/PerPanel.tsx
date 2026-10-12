import Link from "next/link";
import { getPerAnalysis } from "@/lib/perService";
import { isPerRange, PER_CONFIG, PER_RANGES, type PerRangeKey } from "@/lib/perConfig";
import { fmtDate } from "@/lib/format";
import { PerCharts } from "./PerCharts";

const n1 = (v: number) => v.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const n2 = (v: number) => v.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Etiqueta de la señal de valoración con los colores de la marca: Barata esmeralda, Neutral ámbar, Cara azul marino. */
export function PerBadge({ signal, small = false }: { signal: string; small?: boolean }) {
  const style =
    signal === "Barata"
      ? { background: "linear-gradient(135deg, #10b981, #059669)", color: "#ffffff", border: "1px solid transparent" }
      : signal === "Cara"
        ? { background: "#0e2138", color: "#f8fafc", border: "1px solid #0e2138" }
        : signal === "Neutral"
          ? { background: "var(--color-amber-100)", color: "var(--color-amber-700)", border: "1px solid #e5a016" }
          : { background: "transparent", color: "var(--color-text-muted)", border: "1px solid var(--color-divider)" };
  return (
    <span className="inline-flex items-center font-heading" style={{ ...style, fontSize: small ? 11 : 16, letterSpacing: "0.04em", padding: small ? "2px 10px" : "5px 16px", lineHeight: 1.3, borderRadius: 999, fontWeight: 800 }}>
      {signal}
    </span>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card blueprint gap-0.5" style={{ padding: "12px 14px" }}>
      <div className="text-[11px] tracking-[0.08em] uppercase text-neutral-700">{label}</div>
      <div className="figure text-[22px]">{value}</div>
      {hint && <div className="text-[11px] text-neutral-700">{hint}</div>}
    </div>
  );
}

/**
 * Valoración por PER histórico de una acción: tarjeta resumen con la señal, selector de periodo y tres gráficos
 * apilados (precio, BPA TTM y PER con media y percentiles). Solo acciones de EE. UU.; para el resto explica por qué no hay datos.
 */
export async function PerPanel({ symbol, perRange, hrefFor }: { symbol: string; perRange?: string; hrefFor: (range: PerRangeKey) => string }) {
  const range: PerRangeKey = isPerRange(perRange) ? perRange : PER_CONFIG.defaultRange;
  const a = await getPerAnalysis(symbol, range);
  const periodLabel = PER_RANGES[range].years === null ? "todo el histórico" : `${PER_RANGES[range].years} ${PER_RANGES[range].years === 1 ? "año" : "años"}`;

  return (
    <section className="card gap-4 mb-4" style={{ padding: 24 }} aria-labelledby="per-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-[70ch]">
          <div className="card-kicker text-[11px] font-medium">Valoración</div>
          <h2 id="per-title" className="mt-1 mb-1 text-[24px]">PER histórico: ¿está barata respecto a su propia historia?</h2>
          <p className="m-0 text-xs text-neutral-700">El PER (precio / beneficio por acción de los últimos 12 meses) dice cuántos años de beneficio pagas por la acción. Comparar el PER de hoy con el de su propia historia ayuda a ver si el mercado la paga más cara o más barata que de costumbre.</p>
        </div>
        {a.available && (
          <div className="flex flex-wrap gap-1" role="group" aria-label="Periodo del PER">
            {(Object.keys(PER_RANGES) as PerRangeKey[]).map((k) => (
              <Link key={k} href={hrefFor(k)} scroll={false} className={k === range ? "btn-primary py-1 text-xs" : "btn-secondary py-1 text-xs"} aria-current={k === range ? "true" : undefined}>
                {PER_RANGES[k].label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {!a.available ? (
        <p className="m-0 text-sm text-neutral-700 rounded-lg border border-divider px-4 py-3">{a.reason}</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <PerBadge signal={a.signal.signal} />
            <span className="text-[14px] max-w-[70ch]">{a.signal.reason}</span>
          </div>

          {a.signal.valueTrap && (
            <div role="alert" className="rounded-lg border px-4 py-3 text-sm" style={{ borderColor: "#e5a016", background: "var(--color-amber-100)", color: "var(--color-amber-700)" }}>
              <b>Posible trampa de valor.</b> El PER es bajo, pero el beneficio por acción de los últimos 12 meses cae frente al de hace un año: la acción puede estar barata porque el negocio empeora. Revisa por qué baja el beneficio antes de verla como una oportunidad.
            </div>
          )}

          {a.stats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="PER actual" value={`${n1(a.stats.current)}×`} hint={`a ${fmtDate(a.stats.currentDate)}`} />
              <Stat label={`Media (${periodLabel})`} value={`${n1(a.stats.mean)}×`} hint={`mediana ${n1(a.stats.median)}×`} />
              <Stat label="Percentil" value={`${a.stats.percentile.toFixed(0)}`} hint="0 = el más barato del periodo, 100 = el más caro" />
              <Stat label="Frente a la media" value={`${a.stats.deviationPct >= 0 ? "+" : "−"}${Math.abs(a.stats.deviationPct).toFixed(1)} %`} hint={`rango ${n1(a.stats.min)}× a ${n1(a.stats.max)}×`} />
              <Stat label="BPA últimos 12 meses" value={a.growth ? `${n2(a.growth.current)} $` : "N/D"} hint={a.growth?.growthPct != null ? `${a.growth.growthPct >= 0 ? "+" : "−"}${Math.abs(a.growth.growthPct).toFixed(1)} % frente a hace un año` : a.growth?.growing === true ? "creciendo frente a hace un año" : a.growth?.growing === false ? "cayendo frente a hace un año" : "sin dato de hace un año"} />
              <Stat label="Zona barata (P25)" value={`${n1(a.stats.p25)}×`} hint={`por debajo: percentil ≤ ${PER_CONFIG.cheapPercentile}`} />
              <Stat label="Zona cara (P75)" value={`${n1(a.stats.p75)}×`} hint={`por encima: percentil ≥ ${PER_CONFIG.expensivePercentile}`} />
              <Stat label="Datos" value={`${a.stats.n}`} hint="semanas con PER válido" />
            </div>
          ) : null}

          <PerCharts
            points={a.points.map((p) => ({ date: p.date, price: p.price, eps: p.eps, per: p.per }))}
            band={a.stats ? { mean: a.stats.mean, p25: a.stats.p25, p75: a.stats.p75, min: a.stats.min, max: a.stats.max } : null}
            currency="USD"
          />

          <div className="text-xs text-neutral-700 space-y-1">
            <p className="m-0"><b>Cómo leerlo.</b> La línea de puntos verde y la zona verde marcan el percentil {PER_CONFIG.cheapPercentile}: por debajo, la acción ha estado más barata que en el {100 - PER_CONFIG.cheapPercentile} % del periodo. La zona azul marca el percentil {PER_CONFIG.expensivePercentile}: por encima, más cara que en el {PER_CONFIG.expensivePercentile} % del periodo. Solo se pinta el PER cuando el beneficio es positivo.</p>
            <p className="m-0">Compara la acción solo con su propia historia, no con otras empresas ni con su sector. Un PER bajo no es una orden de compra: puede ser una trampa de valor. El beneficio es el contable (GAAP) que publica la empresa en la SEC, y puede incluir partidas extraordinarias que distorsionan un año. Datos: SEC EDGAR y Yahoo Finance, actualizados como mucho una vez al día ({a.quarters} trimestres de BPA, últimos datos {fmtDate(a.updatedAt)}).</p>
          </div>
        </>
      )}
    </section>
  );
}
