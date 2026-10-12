/** Cotizaciones e histórico de acciones e índices desde el endpoint público de Yahoo Finance. */
import { prisma } from "./prisma";
import { fxToEur } from "./prices";
import type { Candle } from "./technical";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const TTL_MS = 60 * 1000;

export const INDICES = [
  { symbol: "^IBEX", name: "IBEX 35" },
  { symbol: "^STOXX50E", name: "Euro Stoxx 50" },
  { symbol: "^GDAXI", name: "DAX" },
  { symbol: "^GSPC", name: "S&P 500" },
  { symbol: "^IXIC", name: "Nasdaq" },
  { symbol: "^DJI", name: "Dow Jones" },
];

/** Sugerencias cuando la lista de seguimiento está vacía. */
export const DEFAULT_WATCHLIST = [
  { symbol: "SAN.MC", name: "Banco Santander" },
  { symbol: "ITX.MC", name: "Inditex" },
  { symbol: "IBE.MC", name: "Iberdrola" },
  { symbol: "BBVA.MC", name: "BBVA" },
  { symbol: "TEF.MC", name: "Telefónica" },
  { symbol: "REP.MC", name: "Repsol" },
  { symbol: "AMS.MC", name: "Amadeus" },
  { symbol: "AAPL", name: "Apple" },
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "NVDA", name: "NVIDIA" },
  { symbol: "AMZN", name: "Amazon" },
  { symbol: "GOOGL", name: "Alphabet" },
  { symbol: "TSLA", name: "Tesla" },
  { symbol: "ASML.AS", name: "ASML" },
  { symbol: "VWCE.DE", name: "Vanguard FTSE All-World (ETF)" },
];

export type StockQuote = {
  symbol: string;
  name: string;
  price: number;
  currency: string;
  priceEur: number;
  change1d: number;
  change1w: number | null;
  change1m: number | null;
  high52: number | null;
  low52: number | null;
  sparkline: number[];
  exchange: string;
  marketState: string;
  error?: string;
};

export type History = { symbol: string; name: string; currency: string; exchange: string; candles: Candle[] };

import { boundedSet } from "./cache";
const quoteCache = new Map<string, { at: number; data: StockQuote }>();
const historyCache = new Map<string, { at: number; data: History }>();

async function getJson(url: string, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: ctrl.signal, cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

type ChartJson = {
  chart?: {
    result?: Array<{
      meta: Record<string, unknown>;
      timestamp?: number[];
      indicators?: { quote?: Array<{ open: (number | null)[]; high: (number | null)[]; low: (number | null)[]; close: (number | null)[]; volume: (number | null)[] }> };
    }>;
    error?: { description?: string } | null;
  };
};

function toCandles(data: ChartJson): Candle[] {
  const r = data.chart?.result?.[0];
  const q = r?.indicators?.quote?.[0];
  if (!r?.timestamp || !q) return [];
  const out: Candle[] = [];
  for (let i = 0; i < r.timestamp.length; i++) {
    const c = q.close[i];
    if (c === null || c === undefined) continue;
    out.push({
      date: new Date(r.timestamp[i] * 1000).toISOString().slice(0, 10),
      open: q.open[i] ?? c,
      high: q.high[i] ?? c,
      low: q.low[i] ?? c,
      close: c,
      volume: q.volume[i] ?? 0,
    });
  }
  return out;
}

export async function fetchStockQuote(symbol: string): Promise<StockQuote> {
  const sym = symbol.toUpperCase();
  const cached = quoteCache.get(sym);
  if (cached && Date.now() - cached.at < TTL_MS) return cached.data;
  try {
    const data: ChartJson = await getJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=3mo&interval=1d`);
    const meta = data.chart?.result?.[0]?.meta;
    const price = Number(meta?.regularMarketPrice);
    if (!meta || !Number.isFinite(price)) throw new Error(data.chart?.error?.description ?? "sin datos");
    const candles = toCandles(data);
    const closes = candles.map((c) => c.close);
    // Cierre de referencia para la variación diaria. `chartPreviousClose` es el cierre anterior al INICIO del rango,
    // así que no sirve. Si la última vela es la sesión en curso (su cierre coincide con el precio actual),
    // el cierre anterior es la penúltima vela; si no, la última.
    const lastClose = closes[closes.length - 1];
    const lastIsLive = closes.length > 1 && Math.abs(lastClose - price) / price < 0.0005;
    const prevFromCandles = lastIsLive ? closes[closes.length - 2] : lastClose;
    const prev = typeof meta.previousClose === "number" ? meta.previousClose : prevFromCandles ?? price;
    // Variación a N sesiones, contando desde el último cierre completo.
    const base = lastIsLive ? closes.slice(0, -1) : closes;
    const ref = (sessions: number) => (base.length >= sessions ? price / base[base.length - sessions] - 1 : null);
    const currency = String(meta.currency ?? "EUR");
    // Estado del mercado: abierto si la hora actual cae dentro de la sesión regular de hoy.
    const regular = (meta.currentTradingPeriod as { regular?: { start?: number; end?: number } } | undefined)?.regular;
    const nowS = Date.now() / 1000;
    const marketState = regular?.start && regular?.end ? (nowS >= regular.start && nowS <= regular.end ? "REGULAR" : "CLOSED") : "";
    let rate = 1;
    try {
      rate = await fxToEur(currency);
    } catch {
      /* sin cambio: mostramos la divisa original */
    }
    const quote: StockQuote = {
      symbol: String(meta.symbol ?? sym),
      name: String(meta.longName ?? meta.shortName ?? sym),
      price,
      currency: currency === "GBp" ? "GBX" : currency,
      priceEur: price * rate,
      change1d: prev > 0 ? price / prev - 1 : 0,
      change1w: ref(5),
      change1m: ref(21),
      high52: typeof meta.fiftyTwoWeekHigh === "number" ? meta.fiftyTwoWeekHigh : null,
      low52: typeof meta.fiftyTwoWeekLow === "number" ? meta.fiftyTwoWeekLow : null,
      sparkline: closes.slice(-22),
      exchange: String(meta.exchangeName ?? ""),
      marketState,
    };
    boundedSet(quoteCache, sym, { at: Date.now(), data: quote });
    return quote;
  } catch (e) {
    if (cached) return { ...cached.data, error: "sin actualizar" };
    return { symbol: sym, name: sym, price: 0, currency: "EUR", priceEur: 0, change1d: 0, change1w: null, change1m: null, high52: null, low52: null, sparkline: [], exchange: "", marketState: "", error: e instanceof Error ? e.message : "sin datos" };
  }
}

export async function fetchStockQuotes(symbols: string[]): Promise<StockQuote[]> {
  return Promise.all([...new Set(symbols.map((s) => s.toUpperCase()))].map(fetchStockQuote));
}

export type Range = "3m" | "6m" | "1y" | "2y" | "5y";
const RANGE_PARAM: Record<Range, string> = { "3m": "3mo", "6m": "6mo", "1y": "1y", "2y": "2y", "5y": "5y" };

/** Histórico diario. Para calcular la media de 200 sesiones se piden siempre al menos 2 años y luego se recorta. */
export async function fetchHistory(symbol: string, range: Range = "1y"): Promise<History | null> {
  const sym = symbol.toUpperCase();
  const key = `${sym}:${range === "5y" ? "5y" : "2y"}`;
  const cached = historyCache.get(key);
  let hist: History | undefined = cached && Date.now() - cached.at < 5 * TTL_MS ? cached.data : undefined;
  if (!hist) {
    try {
      const data: ChartJson = await getJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=${range === "5y" ? "5y" : "2y"}&interval=1d`, 12000);
      const meta = data.chart?.result?.[0]?.meta;
      const candles = toCandles(data);
      if (!meta || candles.length < 30) return null;
      hist = { symbol: String(meta.symbol ?? sym), name: String(meta.longName ?? meta.shortName ?? sym), currency: String(meta.currency ?? "EUR"), exchange: String(meta.exchangeName ?? ""), candles };
      boundedSet(historyCache, key, { at: Date.now(), data: hist }, 150);
    } catch {
      return null;
    }
  }
  return hist;
}

/** Número de sesiones que se muestran en el gráfico para cada rango. */
export const RANGE_SESSIONS: Record<Range, number> = { "3m": 63, "6m": 126, "1y": 252, "2y": 504, "5y": 1260 };
export const RANGE_LABEL: Record<Range, string> = { "3m": "3 meses", "6m": "6 meses", "1y": "1 año", "2y": "2 años", "5y": "5 años" };
export const isRange = (r: string | undefined): r is Range => !!r && r in RANGE_PARAM;

export type WatchKind = "STOCK" | "ETF";

/** Sugerencias de ETF (UCITS cotizados en Europa) cuando la lista está vacía. */
export const DEFAULT_ETF_WATCHLIST = [
  { symbol: "VWCE.DE", name: "Vanguard FTSE All-World (Acc)" },
  { symbol: "IWDA.AS", name: "iShares Core MSCI World (Acc)" },
  { symbol: "SXR8.DE", name: "iShares Core S&P 500 (Acc)" },
  { symbol: "VUAA.DE", name: "Vanguard S&P 500 (Acc)" },
  { symbol: "SXRV.DE", name: "iShares Nasdaq 100 (Acc)" },
  { symbol: "IS3N.DE", name: "iShares Core MSCI EM IMI (Acc)" },
  { symbol: "EXSA.DE", name: "iShares STOXX Europe 600" },
  { symbol: "SMEA.MI", name: "iShares Core MSCI Europe (Acc)" },
  { symbol: "IUSN.DE", name: "iShares MSCI World Small Cap" },
  { symbol: "QDVE.DE", name: "iShares S&P 500 Information Technology" },
  { symbol: "XAIX.DE", name: "Xtrackers Artificial Intelligence & Big Data" },
  { symbol: "VHYL.AS", name: "Vanguard FTSE All-World High Dividend" },
  { symbol: "AGGH.MI", name: "iShares Core Global Aggregate Bond EUR hedged" },
  { symbol: "VAGF.DE", name: "Vanguard Global Aggregate Bond EUR hedged" },
  { symbol: "4GLD.DE", name: "Xetra-Gold (ETC oro físico)" },
];

export async function getWatchlist(familyId: string, kind?: WatchKind) {
  return prisma.watchlistItem.findMany({ where: { familyId, ...(kind ? { kind } : {}) }, orderBy: { createdAt: "asc" } });
}
