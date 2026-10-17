/**
 * Contexto macro: qué series se muestran y cómo se leen las respuestas del BCE y de FRED.
 * Módulo puro (sin red ni base de datos) para poder probarlo; la descarga está en macro.ts.
 */

export type MacroItem = {
  id: string;
  label: string;
  value: number; // en %
  asOf: string; // fecha o mes del último dato
  source: "BCE" | "Eurostat" | "FRED";
  note: string; // qué significa, en una frase para la familia
};

export type EcbSeries = { id: string; path: string; label: string; source: "BCE" | "Eurostat"; note: string };

/** Series del portal de datos del BCE (sin clave). El orden es el de la tarjeta. */
export const ECB_SERIES: EcbSeries[] = [
  { id: "ecb-dfr", path: "FM/D.U2.EUR.4F.KR.DFR.LEV", label: "Tipo de depósito del BCE", source: "BCE", note: "Lo que el BCE paga a los bancos por guardar su dinero: marca el suelo de los tipos en la zona euro. Si sube, los depósitos rinden más y a las empresas endeudadas les cuesta más financiarse." },
  { id: "euribor-12m", path: "FM/M.U2.EUR.RT.MM.EURIBOR1YD_.HSTA", label: "Euríbor a 12 meses", source: "BCE", note: "El tipo al que se prestan los bancos entre sí a un año: la referencia de la mayoría de hipotecas variables en España." },
  { id: "hicp-ea", path: "ICP/M.U2.N.000000.4.ANR", label: "Inflación en la zona euro", source: "Eurostat", note: "Cuánto han subido los precios en los últimos 12 meses. El objetivo del BCE es el 2 %: por encima, suele subir los tipos; por debajo, bajarlos." },
  { id: "hicp-es", path: "ICP/M.ES.N.000000.4.ANR", label: "Inflación en España", source: "Eurostat", note: "La subida de precios en España en los últimos 12 meses. Una inversión que rinde menos que esto pierde poder de compra." },
];

export type FredSeries = { id: string; series: string; label: string; note: string; yoy?: boolean };

/** Series de FRED (Reserva Federal de San Luis; necesita clave gratuita). */
export const FRED_SERIES: FredSeries[] = [
  { id: "fed-funds", series: "FEDFUNDS", label: "Tipo de la Reserva Federal", note: "El tipo oficial de EE. UU. Mueve el dólar, los bonos y la valoración de las empresas tecnológicas que más tienen las familias." },
  { id: "us-10y", series: "DGS10", label: "Bono de EE. UU. a 10 años", note: "Lo que paga el Estado americano por financiarse a diez años: la «rentabilidad sin riesgo» con la que se compara cualquier inversión." },
  { id: "us-cpi", series: "CPIAUCSL", label: "Inflación en EE. UU.", note: "Subida de precios en EE. UU. en los últimos 12 meses (IPC).", yoy: true },
];

type EcbJson = {
  dataSets?: { series?: Record<string, { observations?: Record<string, (number | null)[]> }> }[];
  structure?: { dimensions?: { observation?: { values?: { id: string }[] }[] } };
};

/** Última observación de una respuesta `format=jsondata` del BCE: fecha (o mes) y valor. */
export function parseEcbObservation(json: unknown): { asOf: string; value: number } | null {
  const j = json as EcbJson;
  const series = j?.dataSets?.[0]?.series;
  const dates = j?.structure?.dimensions?.observation?.[0]?.values;
  if (!series || !dates) return null;
  const first = Object.values(series)[0];
  const obs = first?.observations;
  if (!obs) return null;
  const entries = Object.entries(obs)
    .map(([i, v]) => ({ asOf: dates[Number(i)]?.id, value: v?.[0] }))
    .filter((o): o is { asOf: string; value: number } => typeof o.asOf === "string" && typeof o.value === "number" && Number.isFinite(o.value));
  if (entries.length === 0) return null;
  return entries[entries.length - 1];
}

type FredJson = { observations?: { date: string; value: string }[] };

/**
 * Última observación de FRED (`sort_order=desc`). Con `yoy`, variación interanual: el último dato frente al de
 * 12 meses antes (hace falta pedir al menos 13 observaciones). Los huecos («.») se saltan.
 */
export function parseFredObservation(json: unknown, yoy = false): { asOf: string; value: number } | null {
  const obs = ((json as FredJson)?.observations ?? []).map((o) => ({ date: o.date, value: Number(o.value) })).filter((o) => Number.isFinite(o.value));
  if (obs.length === 0) return null;
  if (!yoy) return { asOf: obs[0].date, value: obs[0].value };
  const last = obs[0];
  const yearAgo = obs.find((o) => o.date <= shiftMonths(last.date, -12));
  if (!yearAgo || yearAgo.value <= 0) return null;
  return { asOf: last.date, value: Math.round((last.value / yearAgo.value - 1) * 1000) / 10 };
}

function shiftMonths(ymd: string, months: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1 + months, d || 1));
  return date.toISOString().slice(0, 10);
}

/** «2026-10-17» → «17/10/2026»; «2025-12» → «dic 2025». */
export function macroAsOfLabel(asOf: string): string {
  if (/^\d{4}-\d{2}$/.test(asOf)) {
    const [y, m] = asOf.split("-").map(Number);
    return `${new Intl.DateTimeFormat("es-ES", { month: "short" }).format(new Date(y, m - 1, 1)).replace(".", "")} ${y}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
    const [y, m, d] = asOf.split("-");
    return `${d}/${m}/${y}`;
  }
  return asOf;
}
