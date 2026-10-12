import { prisma } from "./prisma";
import { getPrices } from "./prices";

export type Holding = {
  symbol: string;
  name: string;
  quantity: number;
  avgCost: number; // coste medio por unidad en EUR
  invested: number; // coste total de la posición
  price: number | null;
  value: number;
  pnl: number;
  pnlPct: number;
  stale: boolean;
  updatedAt: Date | null;
  brokers: string[]; // entidades donde se han ejecutado las compras de esta posición
};

export type PortfolioSummary = {
  userId: string;
  userName: string;
  contributed: number; // dinero recibido (aportaciones)
  cash: number; // efectivo sin invertir
  invested: number; // coste de las posiciones abiertas
  marketValue: number; // valor de las posiciones
  totalValue: number; // cash + marketValue
  realized: number; // ganancias realizadas (ventas)
  pnl: number; // totalValue - contributed
  returnPct: number; // pnl / contributed
  holdings: Holding[];
  trades: number;
  contributions: { date: Date; amount: number; note: string | null }[];
  missingPrices: string[];
};

export async function computePortfolio(userId: string, opts: { excludeTradeId?: string } = {}): Promise<PortfolioSummary> {
  const [user, contributions, trades] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } }),
    prisma.contribution.findMany({ where: { userId }, orderBy: { date: "asc" } }),
    prisma.trade.findMany({
      where: { userId, ...(opts.excludeTradeId ? { id: { not: opts.excludeTradeId } } : {}) },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const contributed = contributions.reduce((a, c) => a + c.amount, 0);
  let cash = contributed;
  let realized = 0;
  const pos = new Map<string, { symbol: string; name: string; qty: number; cost: number; brokers: Set<string> }>();

  for (const t of trades) {
    const sym = t.symbol.toUpperCase();
    const p = pos.get(sym) ?? { symbol: sym, name: t.name, qty: 0, cost: 0, brokers: new Set<string>() };
    if (t.broker) p.brokers.add(t.broker);
    // Precio por unidad en euros (el precio se guarda en la divisa de la operación con su tipo de cambio).
    const priceEur = t.price * t.fxRate;
    if (t.side === "BUY") {
      p.qty += t.quantity;
      p.cost += t.quantity * priceEur + t.fees;
      cash -= t.quantity * priceEur + t.fees;
    } else {
      const avg = p.qty > 0 ? p.cost / p.qty : 0;
      const sold = Math.min(t.quantity, p.qty);
      realized += sold * (priceEur - avg) - t.fees;
      p.qty -= sold;
      p.cost -= sold * avg;
      cash += t.quantity * priceEur - t.fees;
    }
    if (t.name) p.name = t.name;
    pos.set(sym, p);
  }

  const open = [...pos.values()].filter((p) => p.qty > 1e-9);
  const prices = await getPrices(open.map((p) => p.symbol));
  const missingPrices: string[] = [];
  const holdings: Holding[] = open.map((p) => {
    const q = prices.get(p.symbol);
    const price = q?.priceEur ?? null;
    if (price === null) missingPrices.push(p.symbol);
    const value = price !== null ? p.qty * price : p.cost;
    return {
      symbol: p.symbol,
      name: q?.name && q.name !== p.symbol ? q.name : p.name,
      quantity: p.qty,
      avgCost: p.cost / p.qty,
      invested: p.cost,
      price,
      value,
      pnl: value - p.cost,
      pnlPct: p.cost > 0 ? (value - p.cost) / p.cost : 0,
      stale: q?.stale ?? true,
      updatedAt: q?.updatedAt ?? null,
      brokers: [...p.brokers],
    };
  });
  holdings.sort((a, b) => b.value - a.value);

  const invested = holdings.reduce((a, h) => a + h.invested, 0);
  const marketValue = holdings.reduce((a, h) => a + h.value, 0);
  const totalValue = cash + marketValue;
  const pnl = totalValue - contributed;

  return {
    userId,
    userName: user.name,
    contributed,
    cash,
    invested,
    marketValue,
    totalValue,
    realized,
    pnl,
    returnPct: contributed > 0 ? pnl / contributed : 0,
    holdings,
    trades: trades.length,
    contributions: contributions.map((c) => ({ date: c.date, amount: c.amount, note: c.note })),
    missingPrices,
  };
}

export const OWN_CONTRIBUTION_PREFIX = "Aportación propia";

/**
 * Recalcula las «aportaciones propias» de un miembro a partir de su historial.
 * Se borran las automáticas y se reconstruyen reproduciendo en orden cronológico las aportaciones
 * manuales (paga, regalos) y las operaciones: cuando una compra supera el efectivo disponible,
 * la diferencia se anota como aportación propia en la fecha de esa compra. Así, editar o borrar
 * una operación nunca deja aportaciones huérfanas ni efectivo negativo.
 */
export async function reconcileOwnContributions(userId: string): Promise<{ created: { symbol: string; amount: number; date: Date }[]; removed: number }> {
  const removed = await prisma.contribution.deleteMany({ where: { userId, note: { startsWith: OWN_CONTRIBUTION_PREFIX } } });
  const [manual, trades] = await Promise.all([
    prisma.contribution.findMany({ where: { userId }, orderBy: { date: "asc" } }),
    prisma.trade.findMany({ where: { userId }, orderBy: [{ date: "asc" }, { createdAt: "asc" }] }),
  ]);
  type Ev = { date: Date; order: number; kind: "contribution"; amount: number } | { date: Date; order: number; kind: "trade"; trade: (typeof trades)[number] };
  // Mismo día: primero las aportaciones, después las operaciones por orden de registro.
  const events: Ev[] = [
    ...manual.map((c) => ({ date: c.date, order: 0, kind: "contribution" as const, amount: c.amount })),
    ...trades.map((t) => ({ date: t.date, order: 1, kind: "trade" as const, trade: t })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime() || a.order - b.order);

  let cash = 0;
  const created: { symbol: string; amount: number; date: Date }[] = [];
  for (const ev of events) {
    if (ev.kind === "contribution") {
      cash += ev.amount;
      continue;
    }
    const t = ev.trade;
    const amount = t.quantity * t.price * t.fxRate;
    if (t.side === "BUY") {
      const cost = amount + t.fees;
      const shortfall = cost - cash;
      if (shortfall > 0.009) {
        const rounded = Math.round(shortfall * 100) / 100;
        created.push({ symbol: t.symbol, amount: rounded, date: t.date });
        cash += rounded;
      }
      cash -= cost;
    } else {
      cash += amount - t.fees;
    }
  }
  if (created.length) {
    await prisma.contribution.createMany({
      data: created.map((c) => ({ userId, date: c.date, amount: c.amount, note: `${OWN_CONTRIBUTION_PREFIX} (compra ${c.symbol})` })),
    });
  }
  return { created, removed: removed.count };
}

/** Guarda una foto diaria del valor de la cartera para dibujar la evolución. */
export async function snapshotPortfolio(summary: PortfolioSummary) {
  const today = new Date();
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
  await prisma.portfolioSnapshot.upsert({
    where: { userId_date: { userId: summary.userId, date: day } },
    update: { value: summary.totalValue, invested: summary.contributed },
    create: { userId: summary.userId, date: day, value: summary.totalValue, invested: summary.contributed },
  });
}

export async function familyLeaderboard(familyId: string) {
  const members = await prisma.user.findMany({ where: { familyId }, orderBy: { createdAt: "asc" }, select: { id: true } });
  const summaries = await Promise.all(members.map((m) => computePortfolio(m.id)));
  await Promise.all(summaries.map((s) => snapshotPortfolio(s)));
  const ranked = [...summaries].sort((a, b) => b.returnPct - a.returnPct || b.pnl - a.pnl);
  return ranked;
}

export async function familyHistory(familyId: string) {
  const snaps = await prisma.portfolioSnapshot.findMany({
    where: { user: { familyId } },
    orderBy: { date: "asc" },
    include: { user: { select: { name: true, id: true } } },
  });
  // Serie por fecha: { date, [userName]: returnPct }
  const byDate = new Map<string, Record<string, number | string>>();
  for (const s of snaps) {
    const key = s.date.toISOString().slice(0, 10);
    const row = byDate.get(key) ?? { date: key };
    row[s.user.name] = s.invested > 0 ? (s.value - s.invested) / s.invested : 0;
    row[`${s.user.name}__valor`] = s.value;
    byDate.set(key, row);
  }
  return [...byDate.values()];
}
