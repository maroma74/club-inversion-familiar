/**
 * Repaso de una cartera del mes ya decidida: cuánto ha rendido cada opción desde que se publicó, cómo le ha ido
 * a cada miembro con lo que eligió y qué habría pasado eligiendo la mejor opción. Módulo puro (sin red ni base
 * de datos) para poder probarlo; los precios de entonces y de ahora los trae monthlyHistory.ts.
 */

export type ReviewOptionInput = { id: string; symbol: string; name: string; kind: string; note: string | null };
export type ReviewChoiceInput = { id: string; optionId: string; amount: number; price: number | null; quantity: number | null; why: string; exitCondition: string | null };
export type ReviewDecisionInput = { id: string; userId: string; userName: string; argument: string; submittedAt: Date; choices: ReviewChoiceInput[] };

export type OptionReview = {
  id: string;
  symbol: string;
  name: string;
  kind: string;
  note: string | null;
  priceNow: number | null; // en euros
  priceThen: number | null; // en euros: media de lo que pagaron los miembros o, si nadie la eligió, el cierre al publicarse
  changePct: number | null; // rendimiento desde entonces
  pickedBy: string[]; // nombres de quienes la eligieron
  rank: number | null; // 1 = la que más ha subido
};

export type PickReview = {
  id: string;
  optionId: string;
  symbol: string;
  name: string;
  amount: number;
  priceThen: number | null;
  priceNow: number | null;
  quantity: number | null;
  valueNow: number | null;
  changePct: number | null;
  why: string;
  exitCondition: string | null;
};

export type DecisionReview = {
  id: string;
  userId: string;
  userName: string;
  argument: string;
  submittedAt: Date;
  picks: PickReview[];
  invested: number;
  valueNow: number | null;
  changePct: number | null;
  bestAlternative: { symbol: string; changePct: number; valueIfBest: number } | null; // qué habría dado la mejor opción con el mismo dinero
  rank: number | null; // puesto entre los miembros por rendimiento
};

export type PortfolioReview = { options: OptionReview[]; decisions: DecisionReview[]; best: OptionReview | null };

const r2 = (n: number) => Math.round(n * 100) / 100;

export function buildReview(input: {
  options: ReviewOptionInput[];
  decisions: ReviewDecisionInput[];
  pricesNow: Map<string, number>; // símbolo → precio actual en euros
  pricesAtPublish: Map<string, number>; // símbolo → cierre en euros el día de la publicación (para las no elegidas)
}): PortfolioReview {
  const { options, decisions, pricesNow, pricesAtPublish } = input;

  const optionReviews: OptionReview[] = options.map((o) => {
    const sym = o.symbol.toUpperCase();
    const picks = decisions.flatMap((d) => d.choices.filter((c) => c.optionId === o.id).map((c) => ({ d, c })));
    const paid = picks.map((p) => p.c.price).filter((p): p is number => p !== null && p > 0);
    const priceThen = paid.length ? paid.reduce((a, b) => a + b, 0) / paid.length : (pricesAtPublish.get(sym) ?? null);
    const priceNow = pricesNow.get(sym) ?? null;
    const changePct = priceThen && priceNow ? priceNow / priceThen - 1 : null;
    return { id: o.id, symbol: o.symbol, name: o.name, kind: o.kind, note: o.note, priceNow, priceThen, changePct, pickedBy: picks.map((p) => p.d.userName), rank: null };
  });
  const ranked = optionReviews.filter((o) => o.changePct !== null).sort((a, b) => (b.changePct as number) - (a.changePct as number));
  ranked.forEach((o, i) => { o.rank = i + 1; });
  const best = ranked[0] ?? null;

  const decisionReviews: DecisionReview[] = decisions.map((d) => {
    const picks: PickReview[] = d.choices.map((c) => {
      const o = optionReviews.find((x) => x.id === c.optionId);
      const priceNow = o?.priceNow ?? null;
      const priceThen = c.price;
      const quantity = c.quantity ?? (priceThen && priceThen > 0 ? c.amount / priceThen : null);
      const valueNow = quantity !== null && priceNow !== null ? quantity * priceNow : null;
      const changePct = priceThen && priceNow ? priceNow / priceThen - 1 : null;
      return { id: c.id, optionId: c.optionId, symbol: o?.symbol ?? "", name: o?.name ?? "", amount: c.amount, priceThen, priceNow, quantity, valueNow, changePct, why: c.why, exitCondition: c.exitCondition };
    });
    const invested = picks.reduce((a, p) => a + p.amount, 0);
    const complete = picks.length > 0 && picks.every((p) => p.valueNow !== null);
    const valueNow = complete ? r2(picks.reduce((a, p) => a + (p.valueNow as number), 0)) : null;
    const changePct = valueNow !== null && invested > 0 ? valueNow / invested - 1 : null;
    const bestAlternative = best && best.changePct !== null && invested > 0 ? { symbol: best.symbol, changePct: best.changePct, valueIfBest: r2(invested * (1 + best.changePct)) } : null;
    return { id: d.id, userId: d.userId, userName: d.userName, argument: d.argument, submittedAt: d.submittedAt, picks, invested, valueNow, changePct, bestAlternative, rank: null };
  });
  const byResult = decisionReviews.filter((d) => d.changePct !== null).sort((a, b) => (b.changePct as number) - (a.changePct as number));
  byResult.forEach((d, i) => { d.rank = i + 1; });

  return { options: optionReviews, decisions: decisionReviews, best };
}
