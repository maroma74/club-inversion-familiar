/**
 * Proveedores de BPA trimestral (beneficio por acción diluido) para el PER histórico.
 * La interfaz es intercambiable: hoy solo hay uno, SEC EDGAR, para acciones de EE. UU.; para el resto de
 * valores la ficha muestra «datos no disponibles». Para añadir otro mercado basta con otro objeto que cumpla
 * `EpsProvider` y añadirlo a `EPS_PROVIDERS`.
 *
 * Sin claves: EDGAR es público, pero exige un User-Agent con un contacto. Se toma de SEC_USER_AGENT.
 */
import { quartersFromFacts, type QuarterEps, type SecFact } from "./per";

export type EpsFetchResult =
  | { status: "ok"; quarters: QuarterEps[] }
  | { status: "unavailable"; reason: string }; // el proveedor funciona pero no tiene este valor

export interface EpsProvider {
  id: string;
  /** ¿Puede este proveedor tener datos de este símbolo? (comprobación barata, sin red) */
  supports(symbol: string): boolean;
  /** Trimestres de BPA ajustados con `adjust` (splits). Lanza si hay un error de red; devuelve «unavailable» si no existe. */
  fetchQuarterlyEps(symbol: string, adjust: (value: number, reportedAt: string) => number): Promise<EpsFetchResult>;
}

const SEC_USER_AGENT = () => process.env.SEC_USER_AGENT?.trim() || "ClubInversionFamiliar/1.0 (club@clubdeinversionfamiliar.com)";
const DAY_MS = 24 * 3600 * 1000;

async function secJson(url: string, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { "User-Agent": SEC_USER_AGENT(), Accept: "application/json" }, signal: ctrl.signal, cache: "no-store" });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`SEC HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

let tickerMap: { at: number; map: Map<string, string> } | null = null;

/** Ticker → CIK de 10 dígitos (company_tickers.json de la SEC), en memoria durante un día. */
async function cikFor(symbol: string): Promise<string | null> {
  if (!tickerMap || Date.now() - tickerMap.at > DAY_MS) {
    const j = (await secJson("https://www.sec.gov/files/company_tickers.json", 20000)) as Record<string, { cik_str: number; ticker: string }> | null;
    if (!j) throw new Error("No se pudo leer company_tickers.json");
    tickerMap = { at: Date.now(), map: new Map(Object.values(j).map((r) => [r.ticker.toUpperCase(), String(r.cik_str).padStart(10, "0")])) };
  }
  return tickerMap.map.get(symbol.toUpperCase()) ?? null;
}

type ConceptFact = { start?: string; end: string; val: number; filed: string };

export const edgarProvider: EpsProvider = {
  id: "sec-edgar",
  // Tickers de EE. UU.: letras y, como mucho, una clase tras guion (BRK-B). Los símbolos con sufijo de bolsa (.MC, .DE) no.
  supports: (symbol) => /^[A-Z]{1,5}(-[A-Z])?$/.test(symbol.toUpperCase()),
  async fetchQuarterlyEps(symbol, adjust) {
    const cik = await cikFor(symbol);
    if (!cik) return { status: "unavailable", reason: "La SEC no tiene una empresa con ese símbolo (puede ser un ETF o un valor extranjero)." };
    const j = (await secJson(`https://data.sec.gov/api/xbrl/companyconcept/CIK${cik}/us-gaap/EarningsPerShareDiluted.json`)) as { units?: Record<string, ConceptFact[]> } | null;
    const facts = j?.units?.["USD/shares"];
    if (!facts?.length) return { status: "unavailable", reason: "La empresa no publica BPA diluido en dólares en la SEC." };
    const quarters = quartersFromFacts(facts as SecFact[], adjust);
    if (quarters.length < 4) return { status: "unavailable", reason: "Menos de 4 trimestres de BPA publicados." };
    return { status: "ok", quarters };
  },
};

export const EPS_PROVIDERS: EpsProvider[] = [edgarProvider];

export const providerFor = (symbol: string): EpsProvider | null => EPS_PROVIDERS.find((p) => p.supports(symbol)) ?? null;
