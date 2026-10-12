/**
 * Configuración del módulo «PER histórico»: umbrales de la señal de valoración, peso en la recomendación
 * y caché. Todo en un sitio para poder ajustarlo sin tocar el cálculo.
 * El peso también se puede cambiar con la variable de entorno PER_WEIGHT (0 a 0,4).
 */

export type PerRangeKey = "1y" | "3y" | "5y" | "10y" | "all";

/** Años de cada rango del selector (null = todo el histórico disponible). */
export const PER_RANGES: Record<PerRangeKey, { label: string; years: number | null }> = {
  "1y": { label: "1A", years: 1 },
  "3y": { label: "3A", years: 3 },
  "5y": { label: "5A", years: 5 },
  "10y": { label: "10A", years: 10 },
  all: { label: "Todo", years: null },
};

export const isPerRange = (r: string | undefined): r is PerRangeKey => !!r && r in PER_RANGES;

function envWeight(): number {
  const raw = Number(process.env.PER_WEIGHT);
  if (process.env.PER_WEIGHT === undefined || process.env.PER_WEIGHT === "" || !Number.isFinite(raw)) return 0.15;
  return Math.min(0.4, Math.max(0, raw));
}

export const PER_CONFIG = {
  /** Rango por defecto de la ficha y del resumen del listado. */
  defaultRange: "5y" as PerRangeKey,
  /** Percentil (0-100) por debajo del cual el PER se considera bajo respecto a su historia. */
  cheapPercentile: 25,
  /** Percentil por encima del cual se considera alto. */
  expensivePercentile: 75,
  /** Puntos semanales mínimos con PER válido en el periodo para dar señal (unos 10 meses). */
  minPoints: 40,
  /** Peso del bloque «Valoración (PER)» en la recomendación; los otros cuatro se reescalan para sumar 1. */
  recommendationWeight: envWeight(),
  /** Puntuación (de -2 a +2) del bloque según la señal. */
  scores: {
    cheap: 1.5, // barata: PER bajo y BPA creciendo
    trap: 0, // PER bajo pero BPA cayendo: no suma, avisa
    expensive: -1.5,
    neutralSlope: 0.75, // entre los umbrales: +0,75 en el percentil bajo, 0 en la mediana, -0,75 en el alto
  },
  /** Los resultados trimestrales cambian poco: se refrescan como mucho una vez al día. */
  cacheHours: 24,
};
