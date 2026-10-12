/**
 * Ficha de una criptomoneda desde la API pública de CoinGecko (sin clave): descripción, categorías,
 * puesto por capitalización, oferta circulante y máxima, máximo histórico y enlaces. Se cachea 6 horas.
 */
import { boundedSet } from "./cache";
import { fetchCryptoMarket } from "./crypto";

export type CryptoProfile = {
  id: string;
  name: string;
  symbol: string;
  rank: number | null;
  categories: string[];
  description: string | null; // en inglés (CoinGecko)
  website: string | null;
  genesisDate: string | null;
  hashingAlgorithm: string | null;
  marketCap: number | null; // EUR
  volume24h: number | null; // EUR
  circulatingSupply: number | null;
  totalSupply: number | null;
  maxSupply: number | null;
  ath: number | null; // EUR
  athDate: string | null;
  athChange: number | null; // % desde el máximo histórico
  atl: number | null;
  change30d: number | null; // %
  change1y: number | null; // %
};

const UA = "Mozilla/5.0 (compatible; FinanzasFamilia/1.0)";
const TTL_MS = 6 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; data: CryptoProfile | null }>();

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

/** Símbolo base de un par de Yahoo: «BTC-EUR» → «BTC»; «UNI7083-EUR» → «UNI». */
export function baseSymbol(yahooSymbol: string) {
  return yahooSymbol.toUpperCase().replace(/-(EUR|USD|GBP|USDT)$/, "").replace(/\d{3,}$/, "");
}

/** Id de CoinGecko de una moneda: primero la lista de mercado en caché y, si no está, el buscador. */
async function resolveId(base: string, name: string | undefined): Promise<string | null> {
  const market = await fetchCryptoMarket(50).catch(() => ({ coins: [] as { id: string; symbol: string }[] }));
  const inMarket = market.coins.find((c) => c.symbol.toUpperCase() === base);
  if (inMarket) return inMarket.id;
  try {
    const q = (name ?? base).replace(/\s+(EUR|USD)$/i, "");
    const data = await getJson(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`);
    const coins = (data?.coins ?? []) as Array<{ id: string; name: string; symbol: string; market_cap_rank: number | null }>;
    const exact = coins.filter((c) => c.symbol.toUpperCase() === base || c.name.toLowerCase() === q.toLowerCase());
    const pool = exact.length ? exact : coins;
    pool.sort((a, b) => (a.market_cap_rank ?? 1e9) - (b.market_cap_rank ?? 1e9));
    return pool[0]?.id ?? null;
  } catch {
    return null;
  }
}

type GeckoCoin = {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank?: number | null;
  categories?: string[];
  description?: { en?: string };
  links?: { homepage?: string[] };
  genesis_date?: string | null;
  hashing_algorithm?: string | null;
  market_data?: {
    market_cap?: { eur?: number };
    total_volume?: { eur?: number };
    circulating_supply?: number | null;
    total_supply?: number | null;
    max_supply?: number | null;
    ath?: { eur?: number };
    ath_date?: { eur?: string };
    ath_change_percentage?: { eur?: number };
    atl?: { eur?: number };
    price_change_percentage_30d_in_currency?: { eur?: number };
    price_change_percentage_1y_in_currency?: { eur?: number };
  };
};

const stripHtml = (s: string) => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

export async function fetchCryptoProfile(yahooSymbol: string, name?: string): Promise<CryptoProfile | null> {
  const base = baseSymbol(yahooSymbol);
  const cached = cache.get(base);
  if (cached && Date.now() - cached.at < TTL_MS) return cached.data;
  try {
    const id = await resolveId(base, name);
    if (!id) throw new Error("sin id");
    const c: GeckoCoin = await getJson(`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`, 10000);
    const m = c.market_data ?? {};
    const home = c.links?.homepage?.find((h) => h && /^https?:\/\//i.test(h)) ?? null;
    const profile: CryptoProfile = {
      id: c.id,
      name: c.name,
      symbol: c.symbol.toUpperCase(),
      rank: c.market_cap_rank ?? null,
      categories: (c.categories ?? []).filter(Boolean).slice(0, 4),
      description: c.description?.en ? stripHtml(c.description.en) || null : null,
      website: home,
      genesisDate: c.genesis_date ?? null,
      hashingAlgorithm: c.hashing_algorithm ?? null,
      marketCap: m.market_cap?.eur ?? null,
      volume24h: m.total_volume?.eur ?? null,
      circulatingSupply: m.circulating_supply ?? null,
      totalSupply: m.total_supply ?? null,
      maxSupply: m.max_supply ?? null,
      ath: m.ath?.eur ?? null,
      athDate: m.ath_date?.eur ? m.ath_date.eur.slice(0, 10) : null,
      athChange: m.ath_change_percentage?.eur ?? null,
      atl: m.atl?.eur ?? null,
      change30d: m.price_change_percentage_30d_in_currency?.eur ?? null,
      change1y: m.price_change_percentage_1y_in_currency?.eur ?? null,
    };
    boundedSet(cache, base, { at: Date.now(), data: profile });
    return profile;
  } catch {
    // Con límite de peticiones de CoinGecko se sirve la última ficha conocida; si no la hay, la ficha queda vacía.
    return cached?.data ?? null;
  }
}
