import { prisma } from "./prisma";
import { familyHistory, familyLeaderboard, type PortfolioSummary } from "./portfolio";
import { computeBadges, type MemberProgress } from "./badges";
import { getLearningStats, type LearningStats } from "./academy";
import { eur, pct } from "./format";

export type FamilyOverview = {
  ranking: PortfolioSummary[];
  history: Record<string, number | string>[];
  progress: Map<string, MemberProgress>;
  learning: Map<string, LearningStats>;
  stats: LeagueStat[];
};

/** Todo lo que necesitan Inicio y Liga: carteras, histórico, logros, formación y estadísticas. Actualiza el contador de logros de cada miembro. */
export async function familyOverview(familyId: string): Promise<FamilyOverview> {
  const [ranking, history, trades, contributions] = await Promise.all([
    familyLeaderboard(familyId),
    familyHistory(familyId),
    prisma.trade.findMany({ where: { user: { familyId } }, select: { userId: true, symbol: true, side: true, date: true, currency: true } }),
    prisma.contribution.findMany({ where: { user: { familyId } }, select: { userId: true, date: true, note: true } }),
  ]);
  const learning = await getLearningStats(ranking.map((r) => r.userId));
  const progress = new Map<string, MemberProgress>();
  await Promise.all(
    ranking.map(async (r, i) => {
      const p = computeBadges(r, trades.filter((t) => t.userId === r.userId), contributions.filter((c) => c.userId === r.userId), i, ranking.length, learning.get(r.userId)?.lessonsPassed ?? 0);
      progress.set(r.userId, p);
      await prisma.user.update({ where: { id: r.userId }, data: { badgeCount: p.badgesEarned } }).catch(() => {});
    }),
  );
  const stats = leagueStats(ranking, history);
  // Estadística de formación
  const best = [...learning.entries()].sort((a, b) => b[1].lessonsPassed - a[1].lessonsPassed)[0];
  if (best && best[1].lessonsPassed > 0) {
    const who = ranking.find((r) => r.userId === best[0]);
    stats.push({ id: "learning", icon: "", label: "Más formación", value: `${best[1].lessonsPassed} ${best[1].lessonsPassed === 1 ? "lección" : "lecciones"}`, who: who?.userName ?? "", detail: best[1].quizAccuracy !== null ? `${Math.round(best[1].quizAccuracy * 100)} % de acierto en quiz` : undefined });
  }
  return { ranking, history, progress, learning, stats };
}

export type LeagueStat = {
  id: string;
  icon: string;
  label: string;
  value: string; // dato principal (p. ej. "+12,3 %")
  who: string; // a quién pertenece
  detail?: string;
  tone?: "good" | "bad" | "neutral";
};

type HistoryRow = Record<string, number | string>;

/** Récords y cifras clave de la liga familiar a partir de las carteras ya calculadas. */
export function leagueStats(ranking: PortfolioSummary[], history: HistoryRow[]): LeagueStat[] {
  const stats: LeagueStat[] = [];
  const active = ranking.filter((r) => r.contributed > 0);
  if (active.length === 0) return stats;

  // Totales de la familia
  const totalValue = ranking.reduce((a, r) => a + r.totalValue, 0);
  const totalContributed = ranking.reduce((a, r) => a + r.contributed, 0);
  const totalPnl = totalValue - totalContributed;
  stats.push({
    id: "family",
    icon: "👪",
    label: "Patrimonio de la liga",
    value: eur(totalValue),
    who: `${ranking.length} ${ranking.length === 1 ? "participante" : "participantes"}`,
    detail: `Aportado ${eur(totalContributed)} · resultado ${eur(totalPnl)} (${pct(totalContributed ? totalPnl / totalContributed : 0)})`,
    tone: totalPnl >= 0 ? "good" : "bad",
  });

  // Mejor cartera por rentabilidad (no se señala a quien va último)
  const best = active[0];
  stats.push({ id: "best-portfolio", icon: "🏆", label: "Mejor cartera", value: pct(best.returnPct, 2), who: best.userName, detail: `Ganancia ${eur(best.pnl)} sobre ${eur(best.contributed)}`, tone: best.pnl >= 0 ? "good" : "bad" });

  // Mayor ganancia en euros
  const richest = [...active].sort((a, b) => b.pnl - a.pnl)[0];
  if (richest.userId !== best.userId) {
    stats.push({ id: "most-euros", icon: "💶", label: "Mayor ganancia en euros", value: eur(richest.pnl), who: richest.userName, detail: `Rentabilidad ${pct(richest.returnPct)}`, tone: richest.pnl >= 0 ? "good" : "bad" });
  }

  // Mejor y peor valor entre todas las posiciones abiertas
  const holdings = ranking.flatMap((r) => r.holdings.filter((h) => h.price !== null).map((h) => ({ ...h, owner: r.userName })));
  if (holdings.length > 0) {
    const top = [...holdings].sort((a, b) => b.pnlPct - a.pnlPct)[0];
    stats.push({ id: "best-asset", icon: "🚀", label: "Mejor valor", value: pct(top.pnlPct), who: `${top.symbol} · ${top.owner}`, detail: `${top.name} · ${eur(top.pnl)} de ganancia`, tone: top.pnl >= 0 ? "good" : "bad" });
    if (holdings.length > 1) {
      const bottom = [...holdings].sort((a, b) => a.pnlPct - b.pnlPct)[0];
      if (bottom.symbol !== top.symbol || bottom.owner !== top.owner) {
        stats.push({ id: "worst-asset", icon: "📉", label: "Peor valor", value: pct(bottom.pnlPct), who: `${bottom.symbol} · ${bottom.owner}`, detail: `${bottom.name} · ${eur(bottom.pnl)}`, tone: bottom.pnl >= 0 ? "good" : "bad" });
      }
    }
    // Mayor posición
    const biggest = [...holdings].sort((a, b) => b.value - a.value)[0];
    stats.push({ id: "biggest", icon: "🐘", label: "Mayor posición", value: eur(biggest.value), who: `${biggest.symbol} · ${biggest.owner}`, detail: `${biggest.quantity.toLocaleString("es-ES", { maximumFractionDigits: 4 })} uds. a ${eur(biggest.price ?? 0)}` });

    // Activo más popular (en más carteras)
    const bySymbol = new Map<string, { name: string; owners: string[] }>();
    for (const h of holdings) {
      const e = bySymbol.get(h.symbol) ?? { name: h.name, owners: [] };
      e.owners.push(h.owner);
      bySymbol.set(h.symbol, e);
    }
    const popular = [...bySymbol.entries()].sort((a, b) => b[1].owners.length - a[1].owners.length)[0];
    if (popular && popular[1].owners.length > 1) {
      stats.push({ id: "popular", icon: "⭐", label: "Valor más popular", value: popular[0], who: `${popular[1].owners.length} carteras`, detail: `${popular[1].name} · ${popular[1].owners.join(", ")}` });
    }
  }

  // Más operaciones
  const trader = [...ranking].sort((a, b) => b.trades - a.trades)[0];
  if (trader.trades > 0) {
    stats.push({ id: "trader", icon: "⚡", label: "Más activo", value: `${trader.trades} ${trader.trades === 1 ? "operación" : "operaciones"}`, who: trader.userName, detail: `Realizado ${eur(trader.realized)}` });
  }

  // Más diversificado
  const diversified = [...ranking].sort((a, b) => b.holdings.length - a.holdings.length)[0];
  if (diversified.holdings.length > 1) {
    stats.push({ id: "diversified", icon: "🧺", label: "Más diversificado", value: `${diversified.holdings.length} activos`, who: diversified.userName, detail: diversified.holdings.map((h) => h.symbol).slice(0, 5).join(", ") });
  }

  // Más conservador (mayor parte en efectivo)
  const cashy = [...active].sort((a, b) => b.cash / b.totalValue - a.cash / a.totalValue)[0];
  if (cashy.totalValue > 0 && cashy.cash / cashy.totalValue >= 0.25) {
    stats.push({ id: "cash", icon: "🏦", label: "Más conservador", value: `${((cashy.cash / cashy.totalValue) * 100).toFixed(0)} % en efectivo`, who: cashy.userName, detail: `${eur(cashy.cash)} sin invertir` });
  }

  // Mejor evolución en los últimos 30 días (a partir de las fotos diarias)
  if (history.length >= 2) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffKey = cutoff.toISOString().slice(0, 10);
    const base = history.find((h) => String(h.date) >= cutoffKey) ?? history[0];
    const last = history[history.length - 1];
    if (base !== last) {
      const deltas = ranking
        .map((r) => {
          const a = base[r.userName], b = last[r.userName];
          return typeof a === "number" && typeof b === "number" ? { name: r.userName, delta: b - a } : null;
        })
        .filter((x): x is { name: string; delta: number } => x !== null)
        .sort((a, b) => b.delta - a.delta);
      if (deltas.length > 0) {
        stats.push({ id: "momentum", icon: "🔥", label: "Mejor racha (30 días)", value: `${deltas[0].delta >= 0 ? "+" : ""}${(deltas[0].delta * 100).toFixed(2)} pts`, who: deltas[0].name, detail: `Desde ${String(base.date)}`, tone: deltas[0].delta >= 0 ? "good" : "bad" });
      }
    }
  }

  return stats;
}
