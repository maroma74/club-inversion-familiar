/**
 * Proveedores de BPA (beneficio por acción diluido) para el PER histórico. Se prueban en orden y gana el primero
 * que tenga datos:
 *  1. SEC EDGAR: trimestres completos de 10+ años para acciones de EE. UU. Público; exige un User-Agent con contacto (SEC_USER_AGENT).
 *  2. Yahoo Finance (fundamentals-timeseries): BPA anual y de los últimos 12 meses de los últimos 3-4 años, para
 *     cualquier mercado (IBEX, Europa, Londres…) y para las de EE. UU. que no publican el concepto estándar en la SEC.
 */
import { quartersFromFacts, ttmFromYahooRows, type QuarterEps, type SecFact, type TtmPoint, type YahooEpsRow } from "./per";

export type EpsFetchResult =
  | { status: "ok"; quarters: QuarterEps[]; ttm?: TtmPoint[]; currency: string }
  | { status: "unavailable"; reason: string }; // el proveedor funciona pero no tiene este valor

export interface EpsProvider {
  id: string;
  /** ¿Puede este proveedor tener datos de este símbolo? (comprobación barata, sin red) */
  supports(symbol: string): boolean;
  /** BPA ajustado con `adjust` (splits). Lanza si hay un error de red; devuelve «unavailable» si no existe. */
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
let tickerMapPending: Promise<Map<string, string>> | null = null;

/** Ticker → CIK de 10 dígitos (company_tickers.json de la SEC), en memoria durante un día y una sola descarga en vuelo. */
async function cikFor(symbol: string): Promise<string | null> {
  if (!tickerMap || Date.now() - tickerMap.at > DAY_MS) {
    if (!tickerMapPending) {
      tickerMapPending = (async () => {
        const j = (await secJson("https://www.sec.gov/files/company_tickers.json", 20000)) as Record<string, { cik_str: number; ticker: string }> | null;
        if (!j) throw new Error("No se pudo leer company_tickers.json");
        const map = new Map(Object.values(j).map((r) => [r.ticker.toUpperCase(), String(r.cik_str).padStart(10, "0")]));
        tickerMap = { at: Date.now(), map };
        return map;
      })().finally(() => { tickerMapPending = null; });
    }
    await tickerMapPending;
  }
  return tickerMap!.map.get(symbol.toUpperCase()) ?? null;
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
    return { status: "ok", quarters, currency: "USD" };
  },
};

type YahooTsValue = { asOfDate?: string; reportedValue?: { raw?: number }; currencyCode?: string };
type YahooTsResult = { annualDilutedEPS?: YahooTsValue[]; trailingDilutedEPS?: YahooTsValue[] };

export const yahooProvider: EpsProvider = {
  id: "yahoo-fundamentals",
  // Acciones de cualquier bolsa (AAPL, SAN.MC, VOW3.DE, LLOY.L). Ni índices (^), ni divisas/futuros (=), ni cripto (-EUR, -USD).
  supports: (symbol) => /^[A-Z0-9][A-Z0-9.\-]{0,11}$/.test(symbol.toUpperCase()) && !/-(EUR|USD|GBP|BTC|ETH)$/.test(symbol.toUpperCase()),
  async fetchQuarterlyEps(symbol, adjust) {
    const period2 = Math.floor(Date.now() / 1000);
    const period1 = period2 - 86400 * 365 * 12;
    const url = `https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(symbol)}?type=annualDilutedEPS,trailingDilutedEPS&period1=${period1}&period2=${period2}`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(12000), cache: "no-store" });
    if (res.status === 404) return { status: "unavailable", reason: "Yahoo Finance no tiene resultados publicados para este valor." };
    if (!res.ok) throw new Error(`Yahoo fundamentals HTTP ${res.status}`);
    const j = (await res.json()) as { timeseries?: { result?: YahooTsResult[] } };
    const rows: YahooEpsRow[] = [];
    let currency: string | null = null;
    for (const r of j.timeseries?.result ?? []) {
      for (const [kind, list] of [["annual", r.annualDilutedEPS], ["trailing", r.trailingDilutedEPS]] as const) {
        for (const v of list ?? []) {
          if (!v.asOfDate || typeof v.reportedValue?.raw !== "number") continue;
          rows.push({ asOfDate: v.asOfDate, value: v.reportedValue.raw, kind });
          if (v.currencyCode) currency = v.currencyCode;
        }
      }
    }
    const ttm = ttmFromYahooRows(rows, adjust);
    if (ttm.length < 3) return { status: "unavailable", reason: "Yahoo Finance publica menos de tres datos de beneficio por acción para este valor." };
    if (!currency) return { status: "unavailable", reason: "Yahoo Finance no indica la divisa del beneficio por acción." };
    return { status: "ok", quarters: [], ttm, currency };
  },
};

export const EPS_PROVIDERS: EpsProvider[] = [edgarProvider, yahooProvider];

/** Proveedores que pueden tener datos del símbolo, en orden de preferencia. */
export const providersFor = (symbol: string): EpsProvider[] => EPS_PROVIDERS.filter((p) => p.supports(symbol));

export const providerFor = (symbol: string): EpsProvider | null => providersFor(symbol)[0] ?? null;
