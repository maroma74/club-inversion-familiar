import "server-only";
import { prisma } from "./prisma";
import { getPrices, fxToEur } from "./prices";
import { fetchCryptoHistory, fetchHistory } from "./stocks";
import { firstName, uniqueFirstNames } from "./names";
import { logError } from "./log";
import { getPortfolioFull, type PortfolioFull } from "./monthly";
import { buildReview, type PortfolioReview } from "./monthlyReview";

/** Carteras del mes de la familia que ya salieron del borrador: el historial. */
export async function listPortfolioHistory(familyId: string) {
  return prisma.monthlyPortfolio.findMany({
    where: { familyId, status: { in: ["PUBLISHED", "CLOSED"] } },
    orderBy: { month: "desc" },
    include: { _count: { select: { options: true, decisions: true } }, allocations: { where: { amount: { gt: 0 } }, select: { userId: true } } },
  });
}

/**
 * Cierre en euros de un valor el día en que se publicó la cartera (o el primer día con dato después).
 * Sirve para las opciones que nadie eligió, que no tienen precio de ejecución guardado.
 */
async function priceAtDate(symbol: string, kind: string, date: Date): Promise<number | null> {
  try {
    const hist = kind === "CRYPTO" ? (await fetchCryptoHistory(symbol, "2y"))?.hist ?? null : await fetchHistory(symbol, "2y");
    if (!hist) return null;
    const day = date.toISOString().slice(0, 10);
    const candle = hist.candles.find((c) => c.date >= day) ?? hist.candles[hist.candles.length - 1];
    if (!candle) return null;
    const rate = await fxToEur(hist.currency);
    return candle.close * rate;
  } catch (e) {
    logError("monthlyHistory.priceAt", e, { symbol, kind });
    return null;
  }
}

export type PortfolioReviewPage = { portfolio: PortfolioFull; review: PortfolioReview; since: Date };

/** Cartera completa con su repaso: rendimiento de cada opción y de cada miembro desde la publicación. */
export async function getPortfolioReview(id: string, familyId: string): Promise<PortfolioReviewPage | null> {
  const p = await getPortfolioFull(id, familyId);
  if (!p || p.status === "DRAFT") return null;
  const since = p.publishedAt ?? p.createdAt;
  const names = uniqueFirstNames(p.allocations.map((a) => ({ id: a.user.id, name: a.user.name })));
  const pickedOptionIds = new Set(p.decisions.flatMap((d) => d.choices.filter((c) => c.price !== null && c.price > 0).map((c) => c.optionId)));
  const unpicked = p.options.filter((o) => !pickedOptionIds.has(o.id));

  const [prices, thenEntries] = await Promise.all([
    getPrices(p.options.map((o) => o.symbol), familyId),
    Promise.all(unpicked.map(async (o) => [o.symbol.toUpperCase(), await priceAtDate(o.symbol, o.kind, since)] as const)),
  ]);
  const pricesNow = new Map<string, number>();
  for (const [sym, q] of prices) pricesNow.set(sym.toUpperCase(), q.priceEur);
  const pricesAtPublish = new Map<string, number>();
  for (const [sym, price] of thenEntries) if (price !== null) pricesAtPublish.set(sym, price);

  const review = buildReview({
    options: p.options.map((o) => ({ id: o.id, symbol: o.symbol, name: o.name, kind: o.kind, note: o.note })),
    decisions: p.decisions.map((d) => ({
      id: d.id,
      userId: d.userId,
      userName: names.get(d.userId) ?? firstName(d.user.name),
      argument: d.argument,
      submittedAt: d.submittedAt,
      choices: d.choices.map((c) => ({ id: c.id, optionId: c.optionId, amount: c.amount, price: c.price, quantity: c.quantity, why: c.why, exitCondition: c.exitCondition })),
    })),
    pricesNow,
    pricesAtPublish,
  });
  return { portfolio: p, review, since };
}
