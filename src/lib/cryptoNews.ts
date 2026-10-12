/**
 * Noticias de criptomonedas. Yahoo Finance no indexa titulares por par (BTC-EUR), así que se combinan
 * fuentes públicas gratuitas: los RSS de Cointelegraph, CoinDesk, Decrypt, Bitcoin Magazine y CriptoNoticias
 * (en español) filtrados por la moneda, más la búsqueda de noticias de Yahoo por nombre. Si apenas hay
 * titulares de la moneda se completan con los del mercado cripto en general, marcados como tales.
 */
import { boundedSet } from "./cache";
import type { NewsItem } from "./news";

const UA = "Mozilla/5.0 (compatible; FinanzasFamilia/1.0)";
const TTL_MS = 5 * 60 * 1000;

const FEEDS: { name: string; url: string }[] = [
  { name: "Cointelegraph", url: "https://cointelegraph.com/rss" },
  { name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
  { name: "Decrypt", url: "https://decrypt.co/feed" },
  { name: "Bitcoin Magazine", url: "https://bitcoinmagazine.com/.rss/full/" },
  { name: "CriptoNoticias", url: "https://www.criptonoticias.com/feed/" },
];

type FeedItem = NewsItem & { text: string };
const feedCache = new Map<string, { at: number; items: FeedItem[] }>();

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tag = (block: string, name: string) => block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"))?.[1] ?? "";

async function readFeed(feed: { name: string; url: string }): Promise<FeedItem[]> {
  const cached = feedCache.get(feed.url);
  if (cached && Date.now() - cached.at < TTL_MS) return cached.items;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 7000);
  try {
    const res = await fetch(feed.url, { headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, text/xml" }, signal: ctrl.signal, cache: "no-store", redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const items: FeedItem[] = [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/g)]
      .map((m) => m[0])
      .map((block) => {
        const title = decode(tag(block, "title"));
        const link = decode(tag(block, "link")) || decode(block.match(/<link[^>]*href="([^"]+)"/)?.[1] ?? "");
        const date = new Date(decode(tag(block, "pubDate")) || decode(tag(block, "dc:date")));
        const desc = decode(tag(block, "description")).slice(0, 400);
        return { id: link || title, title, publisher: feed.name, link, publishedAt: isNaN(date.getTime()) ? new Date(0) : date, symbols: [], thumbnail: null, text: `${title} ${desc}` };
      })
      .filter((i) => i.title && /^https?:\/\//i.test(i.link));
    boundedSet(feedCache, feed.url, { at: Date.now(), items }, 20);
    return items;
  } catch {
    return cached?.items ?? [];
  } finally {
    clearTimeout(t);
  }
}

async function yahooNews(query: string): Promise<NewsItem[]> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(`https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=0&newsCount=10&listsCount=0&lang=en-US&region=US`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36", Accept: "application/json" },
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return ((data?.news ?? []) as Array<{ uuid?: string; title?: string; publisher?: string; link?: string; providerPublishTime?: number }>)
      .filter((n) => n.title && n.link && /^https?:\/\//i.test(n.link))
      .map((n) => ({ id: n.uuid ?? n.link!, title: n.title!, publisher: n.publisher ?? "Yahoo Finance", link: n.link!, publishedAt: new Date((n.providerPublishTime ?? 0) * 1000), symbols: [], thumbnail: null }));
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * ¿Menciona el texto a la moneda? El nombre se busca sin distinguir mayúsculas; el ticker solo en mayúsculas
 * y como palabra suelta (así «LINK» o «DOT» no coinciden con palabras corrientes ni «ETH» con «method»).
 */
function mentions(text: string, name: string, ticker: string) {
  const byName = name.length >= 3 && new RegExp(`\\b${esc(name)}\\b`, "i").test(text);
  const byTicker = ticker.length >= 2 && new RegExp(`(^|[^A-Za-z0-9])\\$?${esc(ticker)}($|[^A-Za-z0-9])`).test(text);
  return byName || byTicker;
}

const ALIASES: Record<string, string[]> = { BTC: ["Bitcoin"], ETH: ["Ethereum", "Ether"], XRP: ["Ripple"], BNB: ["Binance Coin"], DOGE: ["Dogecoin"], SOL: ["Solana"], ADA: ["Cardano"] };

export type CryptoNews = { items: NewsItem[]; general: boolean };

/**
 * Titulares recientes de una moneda (hasta 10). `general` indica que, por falta de titulares propios,
 * se han completado con noticias del mercado cripto.
 */
export async function fetchCryptoNews(name: string, ticker: string): Promise<CryptoNews> {
  const clean = name.replace(/\s+(EUR|USD)$/i, "").trim();
  const names = [...new Set([clean, ...(ALIASES[ticker.toUpperCase()] ?? [])])];
  const [lists, yahoo] = await Promise.all([Promise.all(FEEDS.map(readFeed)), yahooNews(clean)]);
  const all = lists.flat();

  const own = new Map<string, NewsItem>();
  for (const it of all) {
    if (names.some((n) => mentions(it.text, n, ticker.toUpperCase()))) {
      const { text, ...rest } = it;
      void text;
      own.set(it.id, { ...rest, symbols: [ticker.toUpperCase()] });
    }
  }
  for (const n of yahoo) if (!own.has(n.id)) own.set(n.id, { ...n, symbols: [ticker.toUpperCase()] });

  let items = [...own.values()];
  let general = false;
  if (items.length < 4) {
    // Pocas noticias propias: se añaden titulares recientes del mercado cripto (no son de la moneda).
    const seen = new Set(items.map((i) => i.id));
    const market = all
      .filter((i) => !seen.has(i.id))
      .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
      .slice(0, 6 - items.length)
      .map(({ text, ...rest }) => (void text, { ...rest, symbols: ["Mercado cripto"] }));
    if (market.length) general = items.length === 0;
    items = [...items, ...market];
  }
  return { items: items.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime()).slice(0, 10), general };
}
