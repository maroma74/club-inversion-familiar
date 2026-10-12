/** Datos de mercado cripto desde la API pública de CoinGecko (sin clave) y el índice de miedo y codicia de alternative.me. */

export type Coin = {
  id: string;
  symbol: string; // "btc"
  name: string;
  image: string;
  price: number; // EUR
  change24h: number; // en %
  change7d: number; // en %
  marketCap: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  ath: number;
  athChange: number; // % desde máximo histórico
  sparkline: number[]; // 7 días, precio en EUR
  yahooSymbol: string; // "BTC-EUR", para registrar operaciones
};

export type FearGreed = { value: number; label: string; labelEs: string };

const STABLECOINS = new Set(["usdt", "usdc", "dai", "usds", "fdusd", "usde", "tusd", "usd1", "pyusd", "usdd", "busd", "eurc", "eurt", "usdtb", "rlusd"]);
const WRAPPED = new Set(["wbtc", "steth", "wsteth", "weth", "weeth", "cbbtc", "wbnb", "wtrx", "reth", "jitosol", "lbtc", "bnsol", "rseth", "ezeth", "msol"]);
const TTL_MS = 60 * 1000;
const UA = "Mozilla/5.0 (compatible; FinanzasFamilia/1.0)";

let marketCache: { at: number; data: Coin[] } | null = null;
let fgCache: { at: number; data: FearGreed | null } | null = null;

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

type GeckoRow = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  price_change_percentage_24h_in_currency?: number | null;
  price_change_percentage_7d_in_currency?: number | null;
  price_change_percentage_24h?: number | null;
  market_cap: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  ath: number;
  ath_change_percentage: number;
  sparkline_in_7d?: { price: number[] };
};

/** Top criptomonedas por capitalización, en euros, sin stablecoins ni tokens envueltos. Caché de 60 s. */
export async function fetchCryptoMarket(limit = 25): Promise<{ coins: Coin[]; error?: string; updatedAt: Date }> {
  if (marketCache && Date.now() - marketCache.at < TTL_MS) return { coins: marketCache.data.slice(0, limit), updatedAt: new Date(marketCache.at) };
  try {
    const rows: GeckoRow[] = await getJson(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=eur&order=market_cap_desc&per_page=50&page=1&sparkline=true&price_change_percentage=24h%2C7d",
    );
    const coins: Coin[] = rows
      .filter((r) => !STABLECOINS.has(r.symbol.toLowerCase()) && !WRAPPED.has(r.symbol.toLowerCase()))
      .map((r) => ({
        id: r.id,
        symbol: r.symbol,
        name: r.name,
        image: r.image,
        price: r.current_price,
        change24h: r.price_change_percentage_24h_in_currency ?? r.price_change_percentage_24h ?? 0,
        change7d: r.price_change_percentage_7d_in_currency ?? 0,
        marketCap: r.market_cap,
        volume24h: r.total_volume,
        high24h: r.high_24h,
        low24h: r.low_24h,
        ath: r.ath,
        athChange: r.ath_change_percentage,
        sparkline: (r.sparkline_in_7d?.price ?? []).filter((p) => Number.isFinite(p)),
        yahooSymbol: `${r.symbol.toUpperCase()}-EUR`,
      }));
    marketCache = { at: Date.now(), data: coins };
    return { coins: coins.slice(0, limit), updatedAt: new Date() };
  } catch (e) {
    if (marketCache) return { coins: marketCache.data.slice(0, limit), updatedAt: new Date(marketCache.at), error: "No se pudo actualizar; se muestran los últimos datos." };
    return { coins: [], updatedAt: new Date(), error: e instanceof Error ? `No se pudo cargar el mercado cripto (${e.message})` : "No se pudo cargar el mercado cripto" };
  }
}

const FG_ES: Record<string, string> = {
  "Extreme Fear": "Miedo extremo",
  Fear: "Miedo",
  Neutral: "Neutral",
  Greed: "Codicia",
  "Extreme Greed": "Codicia extrema",
};

/** Índice de miedo y codicia (0-100). Se actualiza una vez al día. */
export async function fetchFearGreed(): Promise<FearGreed | null> {
  if (fgCache && Date.now() - fgCache.at < 30 * 60 * 1000) return fgCache.data;
  try {
    const data = await getJson("https://api.alternative.me/fng/?limit=1");
    const row = data?.data?.[0];
    const value = Number(row?.value);
    const result = Number.isFinite(value) ? { value, label: row.value_classification, labelEs: FG_ES[row.value_classification] ?? row.value_classification } : null;
    fgCache = { at: Date.now(), data: result };
    return result;
  } catch {
    return fgCache?.data ?? null;
  }
}
