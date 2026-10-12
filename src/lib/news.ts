/** Noticias financieras por símbolo desde el buscador público de Yahoo Finance. */

export type NewsItem = { id: string; title: string; publisher: string; link: string; publishedAt: Date; symbols: string[]; thumbnail: string | null };

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
import { boundedSet } from "./cache";
const cache = new Map<string, { at: number; items: NewsItem[] }>();
const TTL_MS = 5 * 60 * 1000;

type YahooNews = { uuid?: string; title?: string; publisher?: string; link?: string; providerPublishTime?: number; thumbnail?: { resolutions?: Array<{ url: string; width: number }> } };

async function newsFor(query: string, label: string): Promise<NewsItem[]> {
  const cached = cache.get(query);
  if (cached && Date.now() - cached.at < TTL_MS) return cached.items;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(`https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=0&newsCount=10&listsCount=0&lang=es-ES&region=ES`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const items: NewsItem[] = ((data?.news ?? []) as YahooNews[])
      .filter((n) => n.title && n.link)
      .map((n) => ({
        id: n.uuid ?? n.link!,
        title: n.title!,
        publisher: n.publisher ?? "",
        link: n.link!,
        publishedAt: new Date((n.providerPublishTime ?? 0) * 1000),
        symbols: [label],
        thumbnail: n.thumbnail?.resolutions?.slice().sort((a, b) => a.width - b.width)[0]?.url ?? null,
      }));
    boundedSet(cache, query, { at: Date.now(), items });
    return items;
  } catch {
    return cached?.items ?? [];
  } finally {
    clearTimeout(t);
  }
}

/** Noticias de un único símbolo (hasta 10). Si el ticker devuelve pocas, se busca también por el nombre de la empresa. */
export async function fetchSymbolNews(symbol: string, name?: string): Promise<NewsItem[]> {
  const sym = symbol.toUpperCase();
  let items = await newsFor(sym, sym);
  if (items.length < 3 && name) {
    // "Banco Santander, S.A." → "Banco Santander"; "Industria de Diseño Textil, S.A." → "Industria de Diseño Textil"
    const short = name.replace(/,?\s*(S\.?A\.?|N\.?V\.?|PLC|Inc\.?|Corp\.?|Corporation|AG|SE|Ltd\.?)\s*$/i, "").trim();
    const extra = await newsFor(short, sym);
    const seen = new Set(items.map((i) => i.id));
    items = [...items, ...extra.filter((i) => !seen.has(i.id))];
  }
  return items.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime()).slice(0, 10);
}

/** Noticias de los símbolos indicados (máximo 8 símbolos) más titulares generales de mercado, sin duplicados y ordenadas por fecha. */
export async function fetchNews(symbols: string[], limit = 12): Promise<NewsItem[]> {
  const unique = [...new Set(symbols.map((s) => s.toUpperCase()))].slice(0, 8);
  const queries: Array<[string, string]> = unique.map((s) => [s, s]);
  queries.push(["IBEX 35", "Mercado"]);
  const lists = await Promise.all(queries.map(([q, label]) => newsFor(q, label)));
  const byId = new Map<string, NewsItem>();
  for (const list of lists) {
    for (const n of list) {
      const prev = byId.get(n.id);
      if (prev) prev.symbols = [...new Set([...prev.symbols, ...n.symbols])];
      else byId.set(n.id, { ...n });
    }
  }
  return [...byId.values()].sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime()).slice(0, limit);
}
