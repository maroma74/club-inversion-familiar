import { prisma } from "./prisma";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
// Caché de precios: 60 s. Yahoo sirve cripto y bolsa de EE. UU. en tiempo real y la mayoría de bolsas europeas con 15 min de retraso.
const TTL_MS = 60 * 1000;

export type Quote = { symbol: string; name: string; price: number; currency: string; priceEur: number };

async function fetchJson(url: string, timeoutMs = 6000) {
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

const fxCache = new Map<string, { rate: number; at: number }>();

export const SUPPORTED_CURRENCIES = ["EUR", "USD", "GBP", "CHF"] as const;

/** Cuántos euros vale una unidad de `currency` ahora mismo. */
export async function fxToEur(currency: string): Promise<number> {
  // Yahoo cotiza algunas acciones de Londres en peniques ("GBp").
  const isPence = currency === "GBp";
  const cur = isPence ? "GBP" : currency.toUpperCase();
  if (cur === "EUR") return 1;
  const cached = fxCache.get(cur);
  let rate: number;
  if (cached && Date.now() - cached.at < TTL_MS) rate = cached.rate;
  else {
    const data = await fetchJson(`https://query1.finance.yahoo.com/v8/finance/chart/${cur}EUR=X?range=1d&interval=1d`);
    rate = Number(data?.chart?.result?.[0]?.meta?.regularMarketPrice);
    if (!Number.isFinite(rate)) throw new Error(`Sin tipo de cambio para ${cur}`);
    fxCache.set(cur, { rate, at: Date.now() });
  }
  return isPence ? rate / 100 : rate;
}

/** Euros por unidad de `currency` en una fecha concreta (cierre de ese día o el anterior disponible). Si falla, usa el tipo actual. */
export async function fxToEurAt(currency: string, date: Date): Promise<number> {
  const cur = currency.toUpperCase();
  if (cur === "EUR") return 1;
  try {
    const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const period2 = Math.floor(day.getTime() / 1000) + 86400;
    const period1 = period2 - 86400 * 8;
    const data = await fetchJson(`https://query1.finance.yahoo.com/v8/finance/chart/${cur}EUR=X?period1=${period1}&period2=${period2}&interval=1d`);
    const closes: Array<number | null> = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
    const last = [...closes].reverse().find((c) => typeof c === "number" && Number.isFinite(c));
    if (last) return last;
  } catch {
    /* sin histórico: caemos al tipo actual */
  }
  return fxToEur(cur);
}

export async function fetchQuote(symbol: string): Promise<Quote> {
  const data = await fetchJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`);
  const meta = data?.chart?.result?.[0]?.meta;
  const price = Number(meta?.regularMarketPrice);
  if (!meta || !Number.isFinite(price)) throw new Error(`No se encontró cotización para ${symbol}`);
  const currency: string = meta.currency ?? "EUR";
  const rate = await fxToEur(currency);
  return {
    symbol: meta.symbol ?? symbol,
    name: meta.longName ?? meta.shortName ?? symbol,
    price,
    currency,
    priceEur: price * rate,
  };
}

export type SearchHit = { symbol: string; name: string; exchange: string; type: string };

export async function searchSymbols(q: string): Promise<SearchHit[]> {
  const data = await fetchJson(`https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=12&newsCount=0&listsCount=0&lang=es-ES&region=ES`);
  const quotes: Array<Record<string, string>> = data?.quotes ?? [];
  return quotes
    .filter((x) => x.symbol && !["FUTURE", "OPTION", "INDEX"].includes(x.quoteType ?? ""))
    .map((x) => ({ symbol: x.symbol, name: x.longname ?? x.shortname ?? x.symbol, exchange: x.exchDisp ?? x.exchange ?? "", type: x.quoteType ?? "" }))
    // Primero la bolsa española, luego los símbolos sin sufijo (EE. UU.) y después el resto.
    .sort((a, b) => rank(a.symbol) - rank(b.symbol));
}

/** Devuelve precios en EUR para los símbolos, usando caché en BD y refrescando los caducados. */
/**
 * Precios en euros de una lista de símbolos: primero los fijados a mano por la familia (si se indica),
 * después la caché compartida de cotizaciones (60 s) y, si está caducada, Yahoo/CoinGecko.
 */
export async function getPrices(symbols: string[], familyId?: string): Promise<Map<string, { priceEur: number; name: string; updatedAt: Date; stale: boolean }>> {
  const out = new Map<string, { priceEur: number; name: string; updatedAt: Date; stale: boolean }>();
  let unique = [...new Set(symbols.map((s) => s.toUpperCase()))];
  if (unique.length === 0) return out;
  if (familyId) {
    const manual = await prisma.manualPrice.findMany({ where: { familyId, symbol: { in: unique } } });
    for (const m of manual) out.set(m.symbol, { priceEur: m.price, name: m.name, updatedAt: m.updatedAt, stale: false });
    unique = unique.filter((s) => !out.has(s));
    if (unique.length === 0) return out;
  }
  const cached = await prisma.priceQuote.findMany({ where: { symbol: { in: unique } } });
  const cachedMap = new Map(cached.map((c) => [c.symbol, c]));
  const now = Date.now();

  await Promise.all(
    unique.map(async (sym) => {
      const c = cachedMap.get(sym);
      if (c && now - c.updatedAt.getTime() < TTL_MS) {
        out.set(sym, { priceEur: c.price, name: c.name, updatedAt: c.updatedAt, stale: false });
        return;
      }
      try {
        const q = await fetchQuote(sym);
        const saved = await prisma.priceQuote.upsert({
          where: { symbol: sym },
          update: { price: q.priceEur, name: q.name, currency: "EUR", updatedAt: new Date() },
          create: { symbol: sym, price: q.priceEur, name: q.name, currency: "EUR" },
        });
        out.set(sym, { priceEur: saved.price, name: saved.name, updatedAt: saved.updatedAt, stale: false });
      } catch {
        if (c) out.set(sym, { priceEur: c.price, name: c.name, updatedAt: c.updatedAt, stale: true });
      }
    }),
  );
  return out;
}

/** Precio manual de un valor para una familia concreta (no afecta a la caché compartida ni a otras familias). */
export async function setManualPrice(familyId: string, symbol: string, name: string, priceEur: number) {
  const sym = symbol.toUpperCase();
  return prisma.manualPrice.upsert({
    where: { familyId_symbol: { familyId, symbol: sym } },
    update: { price: priceEur, name, updatedAt: new Date() },
    create: { familyId, symbol: sym, price: priceEur, name },
  });
}

function rank(symbol: string) {
  if (isCrypto(symbol)) return symbol.endsWith("-EUR") ? 0 : 1; // cripto: primero el par en euros
  if (symbol.endsWith(".MC")) return 0;
  if (!symbol.includes(".")) return 1;
  if (/\.(DE|AS|PA|MI|L|SW)$/.test(symbol)) return 2;
  return 3;
}

/** Yahoo nombra las criptomonedas como BTC-EUR, ETH-USD, SOL-EUR… */
export function isCrypto(symbol: string) {
  return /^[A-Z0-9]{2,10}-(EUR|USD|GBP|USDT)$/.test(symbol.toUpperCase());
}
