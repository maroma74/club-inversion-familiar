/** Logros y niveles de la liga: gamificación sobre las carteras ya calculadas. */
import type { PortfolioSummary } from "./portfolio";
import { isCrypto } from "./prices";
import { levelFromPoints, POINTS_PER_BADGE, POINTS_PER_LESSON } from "./academy";

export type Badge = { id: string; label: string; detail: string; earned: boolean };
export type MemberProgress = {
  userId: string;
  userName: string;
  badges: Badge[];
  badgesEarned: number;
  lessonsPassed: number;
  points: number;
  level: number;
  levelName: string;
  nextLevelAt: number | null;
  levelProgress: number; // 0..1 dentro del nivel
};

export type TradeLite = { symbol: string; side: string; date: Date; currency: string };
export type ContributionLite = { date: Date; note: string | null };

const DAY = 86400000;

export function computeBadges(member: PortfolioSummary, trades: TradeLite[], contributions: ContributionLite[], rank: number, members: number, lessonsPassed = 0): MemberProgress {
  const buys = trades.filter((t) => t.side === "BUY");
  const held = new Set(member.holdings.map((h) => h.symbol));
  const oldest = buys.filter((t) => held.has(t.symbol.toUpperCase())).reduce<number | null>((min, t) => (min === null || t.date.getTime() < min ? t.date.getTime() : min), null);
  const daysHeld = oldest === null ? 0 : Math.floor((Date.now() - oldest) / DAY);
  const months = new Set(contributions.map((c) => `${c.date.getFullYear()}-${c.date.getMonth()}`));
  const investedShare = member.totalValue > 0 ? member.marketValue / member.totalValue : 0;

  const badges: Badge[] = [
    { id: "first", label: "Primera operación", detail: "Registra tu primera compra.", earned: trades.length >= 1 },
    { id: "active", label: "Inversor activo", detail: "Diez operaciones o más.", earned: trades.length >= 10 },
    { id: "diversified", label: "Diversificador", detail: "Tres o más activos distintos en cartera.", earned: member.holdings.length >= 3 },
    { id: "crypto", label: "Explorador cripto", detail: "Has invertido en alguna criptomoneda.", earned: trades.some((t) => isCrypto(t.symbol)) },
    { id: "global", label: "Inversor global", detail: "Una operación en dólares, libras o francos.", earned: trades.some((t) => t.currency !== "EUR") },
    { id: "diamond", label: "Manos de diamante", detail: "Mantener una posición más de 90 días.", earned: daysHeld >= 90 },
    { id: "steady", label: "Constante", detail: "Aportaciones en tres meses distintos.", earned: months.size >= 3 },
    { id: "allin", label: "Capital trabajando", detail: "Más del 90 % del dinero invertido.", earned: member.holdings.length > 0 && investedShare >= 0.9 },
    { id: "green", label: "En verde", detail: "Rentabilidad positiva.", earned: member.contributed > 0 && member.returnPct > 0 },
    { id: "five", label: "Cinco por ciento", detail: "Rentabilidad del 5 % o más.", earned: member.returnPct >= 0.05 },
    { id: "realized", label: "Beneficio en el bolsillo", detail: "Cerrar una posición con ganancia.", earned: member.realized > 0 },
    { id: "leader", label: "Líder de la liga", detail: "Primer puesto del ranking.", earned: rank === 0 && members > 1 && member.contributed > 0 },
  ];
  const badgesEarned = badges.filter((b) => b.earned).length;
  const points = badgesEarned * POINTS_PER_BADGE + lessonsPassed * POINTS_PER_LESSON;
  const lv = levelFromPoints(points);
  return { userId: member.userId, userName: member.userName, badges, badgesEarned, lessonsPassed, points, level: lv.level, levelName: lv.name, nextLevelAt: lv.nextAt, levelProgress: lv.progress };
}
