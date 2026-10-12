/**
 * Noticias de materias primas: RSS públicos gratuitos de mercados (Investing.com, Expansión en español),
 * energía (OilPrice, Natural Gas Intelligence), metales (Mining.com) y CNBC, filtrados por las palabras clave
 * de cada materia prima, más la búsqueda de noticias de Yahoo por nombre. Si apenas hay titulares propios se
 * completan con los de mercados de materias primas en general, avisándolo.
 */
import { readFeed, yahooNews } from "./cryptoNews";
import type { NewsItem } from "./news";
import type { Commodity } from "./commodities";

const FEEDS: { name: string; url: string }[] = [
  { name: "Investing.com", url: "https://www.investing.com/rss/commodities.rss" },
  { name: "Expansión", url: "https://e00-expansion.uecdn.es/rss/mercados/materias-primas.xml" },
  { name: "OilPrice", url: "https://oilprice.com/rss/main" },
  { name: "Mining.com", url: "https://www.mining.com/feed/" },
  { name: "Natural Gas Intelligence", url: "https://www.naturalgasintel.com/feed/" },
  { name: "CNBC", url: "https://www.cnbc.com/id/10000664/device/rss/rss.html" },
];

/** Fuentes cuyos titulares son de materias primas en general (sirven de relleno si no hay propios). */
const GENERAL_SOURCES = new Set(["Investing.com", "Expansión"]);

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const mentions = (text: string, keywords: string[]) =>
  keywords.some((k) => new RegExp(`(^|[^\\p{L}\\p{N}])${esc(k)}($|[^\\p{L}\\p{N}])`, "iu").test(text));

export type CommodityNews = { items: NewsItem[]; general: boolean };

export async function fetchCommodityNews(c: Commodity): Promise<CommodityNews> {
  const [lists, yahoo] = await Promise.all([Promise.all(FEEDS.map(readFeed)), yahooNews(c.newsQuery)]);
  const all = lists.flat();

  const own = new Map<string, NewsItem>();
  for (const it of all) {
    if (mentions(it.text, c.keywords)) {
      const { text, ...rest } = it;
      void text;
      own.set(it.id, { ...rest, symbols: [c.symbol] });
    }
  }
  for (const n of yahoo) if (!own.has(n.id)) own.set(n.id, { ...n, symbols: [c.symbol] });

  let items = [...own.values()];
  let general = false;
  if (items.length < 4) {
    const seen = new Set(items.map((i) => i.id));
    const market = all
      .filter((i) => !seen.has(i.id) && GENERAL_SOURCES.has(i.publisher))
      .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
      .slice(0, 6 - items.length)
      .map(({ text, ...rest }) => (void text, { ...rest, symbols: ["Materias primas"] }));
    if (market.length) general = items.length === 0;
    items = [...items, ...market];
  }
  return { items: items.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime()).slice(0, 10), general };
}
