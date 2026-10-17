import "server-only";
import { fetchQuote, isCrypto } from "./prices";
import { findCommodity, isCommodity } from "./commodities";
import { fetchStockQuote } from "./stocks";
import { fetchProfile } from "./fundamentals";

export type SymbolInfo = { symbol: string; name: string; kind: "STOCK" | "ETF" | "CRYPTO" | "COMMODITY" };

/**
 * Nombre y tipo de un valor a partir de su símbolo (cripto, materia prima del catálogo, ETF o acción), comprobando
 * que cotiza. Lo usan la cartera del mes y el repositorio de propuestas para no guardar símbolos inexistentes.
 */
export async function describeSymbol(symbolRaw: string, givenName = ""): Promise<{ ok: true; info: SymbolInfo } | { ok: false; error: string }> {
  const symbol = symbolRaw.toUpperCase();
  let name = givenName.trim().slice(0, 120);
  if (isCrypto(symbol)) {
    try {
      const q = await fetchQuote(symbol);
      if (!name) name = q.name;
    } catch {
      return { ok: false, error: `No se encontró cotización para ${symbol}` };
    }
    return { ok: true, info: { symbol, name, kind: "CRYPTO" } };
  }
  if (isCommodity(symbol)) {
    const q = await fetchStockQuote(symbol);
    if (q.error && q.price === 0) return { ok: false, error: `No se encontró cotización para ${symbol}` };
    return { ok: true, info: { symbol, name: name || findCommodity(symbol)!.name, kind: "COMMODITY" } };
  }
  const q = await fetchStockQuote(symbol);
  if (q.error && q.price === 0) return { ok: false, error: `No se encontró cotización para ${symbol}` };
  if (!name) name = q.name;
  const profile = await fetchProfile(q.symbol);
  return { ok: true, info: { symbol, name, kind: profile.isFund ? "ETF" : "STOCK" } };
}
