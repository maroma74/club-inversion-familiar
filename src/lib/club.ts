/**
 * «Recomendación del Club de inversión»: combina histórico, indicadores, perfil (sector, beta, resultados)
 * y noticias para emitir COMPRAR / MANTENER / VENDER por valor, y guarda una foto diaria en la base de datos
 * para poder ver desde cuándo se mantiene cada opinión y cuándo cambia.
 */
import { prisma } from "./prisma";
import { fetchCryptoHistory, fetchHistory } from "./stocks";
import { analyze } from "./technical";
import { emptyProfile, fetchProfile, type Profile } from "./fundamentals";
import { isCrypto } from "./prices";
import { findCommodity, type Commodity } from "./commodities";
import { fetchCommodityNews } from "./commodityNews";
import { fetchFearGreed, type FearGreed } from "./crypto";
import { baseSymbol, fetchCryptoProfile, type CryptoProfile } from "./cryptoProfile";
import { fetchCryptoNews } from "./cryptoNews";
import { fetchSymbolNews } from "./news";
import { digestNews, type NewsDigest } from "./newsInsights";
import { recommend, type Recommendation } from "./recommend";
import { boundedSet } from "./cache";

export type ClubRecommendation = Recommendation & {
  since: string | null; // fecha desde la que se mantiene la acción actual
  previousAction: string | null; // acción anterior distinta, si la hay
  history: { date: string; action: string; score: number }[];
  profile: Profile;
  newsDigest: NewsDigest | null;
  crypto: CryptoProfile | null; // ficha de la moneda (CoinGecko), solo en criptomonedas y en la vista de detalle
  fearGreed: FearGreed | null; // índice de miedo y codicia, solo en criptomonedas
  newsGeneral: boolean; // las noticias son del mercado cripto en general, no de la moneda
  commodity: Commodity | null; // ficha de la materia prima (catálogo del club)
  usdFallback: boolean; // no hay par en euros en Yahoo y el análisis es sobre el par en dólares
};

const memo = new Map<string, { at: number; data: ClubRecommendation }>();
const TTL_MS = 5 * 60 * 1000;

export async function getClubRecommendation(symbol: string, opts: { withNews?: boolean } = {}): Promise<ClubRecommendation | null> {
  const sym = symbol.toUpperCase();
  const cached = memo.get(sym);
  if (cached && Date.now() - cached.at < TTL_MS && (!opts.withNews || cached.data.newsDigest !== null)) return cached.data;

  const crypto = isCrypto(sym);
  const commodity = crypto ? null : findCommodity(sym);
  const resolved = crypto ? await fetchCryptoHistory(sym, "2y") : null;
  const hist = crypto ? (resolved?.hist ?? null) : await fetchHistory(sym, "2y");
  if (!hist) return null;
  const coinName = hist.name.replace(/\s+(EUR|USD)$/i, "");
  const ticker = baseSymbol(hist.symbol);
  const [profile, newsItems, cryptoProfile, fearGreed, cryptoNews, commodityNews] = await Promise.all([
    crypto || commodity ? Promise.resolve(emptyProfile(sym)) : fetchProfile(sym),
    !crypto && !commodity && opts.withNews ? fetchSymbolNews(sym, hist.name).catch(() => []) : Promise.resolve(null),
    crypto && opts.withNews ? fetchCryptoProfile(hist.symbol, coinName).catch(() => null) : Promise.resolve(null),
    crypto ? fetchFearGreed().catch(() => null) : Promise.resolve(null),
    crypto && opts.withNews ? fetchCryptoNews(coinName, ticker).catch(() => ({ items: [], general: false })) : Promise.resolve(null),
    commodity && opts.withNews ? fetchCommodityNews(commodity).catch(() => ({ items: [], general: false })) : Promise.resolve(null),
  ]);
  const digest = commodityNews ? digestNews(commodityNews.items, commodity!.name) : cryptoNews ? digestNews(cryptoNews.items, coinName) : newsItems ? digestNews(newsItems, sym) : null;
  const analysis = analyze(hist.candles, { crypto });
  const rec = recommend(
    analysis,
    { ticker: hist.symbol, name: crypto ? coinName : commodity ? commodity.name : hist.name, currency: hist.currency === "GBp" ? "GBX" : hist.currency },
    {
      sector: profile.sector,
      industry: profile.industry,
      beta: profile.beta,
      earningsDate: profile.earningsDate,
      news: digest?.items.slice(0, 3).map((n) => ({ title: n.title, publisher: n.publisher, publishedAt: n.publishedAt })) ?? [],
      newsTone: digest?.tone ?? null,
      newsSummary: digest?.summary ?? null,
      isFund: profile.isFund,
      isCrypto: crypto,
      isCommodity: !!commodity,
      commodityGroup: commodity?.group ?? null,
      cryptoRank: cryptoProfile?.rank ?? null,
      fearGreed: fearGreed ? { value: fearGreed.value, labelEs: fearGreed.labelEs } : null,
    },
  );

  // Foto diaria, solo de valores que alguna familia sigue, tiene en cartera o propone (evita llenar la tabla con símbolos sueltos)
  const today = new Date();
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
  const followed =
    (await prisma.watchlistItem.findFirst({ where: { symbol: sym }, select: { id: true } })) ??
    (await prisma.trade.findFirst({ where: { symbol: sym }, select: { id: true } })) ??
    (await prisma.monthlyOption.findFirst({ where: { symbol: sym }, select: { id: true } }));
  try {
    if (followed) await prisma.clubRecommendation.upsert({
      where: { symbol_date: { symbol: sym, date: day } },
      update: { action: rec.action, bias: rec.bias, score: rec.total, confidence: rec.confidence, rr: rec.plan.rr },
      create: { symbol: sym, date: day, action: rec.action, bias: rec.bias, score: rec.total, confidence: rec.confidence, rr: rec.plan.rr },
    });
  } catch {
    /* la foto es opcional */
  }
  const rows = await prisma.clubRecommendation.findMany({ where: { symbol: sym }, orderBy: { date: "desc" }, take: 60 });
  let since: string | null = null;
  let previousAction: string | null = null;
  for (const r of rows) {
    if (r.action === rec.action) since = r.date.toISOString().slice(0, 10);
    else {
      previousAction = r.action;
      break;
    }
  }
  const data: ClubRecommendation = {
    ...rec,
    since,
    previousAction,
    history: rows.slice().reverse().map((r) => ({ date: r.date.toISOString().slice(0, 10), action: r.action, score: r.score })),
    profile,
    newsDigest: digest,
    crypto: cryptoProfile,
    fearGreed,
    commodity,
    newsGeneral: commodityNews?.general ?? cryptoNews?.general ?? false,
    usdFallback: resolved?.fallback ?? false,
  };
  boundedSet(memo, sym, { at: Date.now(), data });
  return data;
}

/** Recomendaciones de varios símbolos con concurrencia limitada (Yahoo tolera ráfagas moderadas). */
export async function getClubRecommendations(symbols: string[], concurrency = 4): Promise<Map<string, ClubRecommendation>> {
  const out = new Map<string, ClubRecommendation>();
  const queue = [...new Set(symbols.map((s) => s.toUpperCase()))];
  await Promise.all(
    Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
      while (queue.length) {
        const sym = queue.shift()!;
        try {
          const r = await getClubRecommendation(sym);
          if (r) out.set(sym, r);
        } catch {
          /* se omite el símbolo */
        }
      }
    }),
  );
  return out;
}
