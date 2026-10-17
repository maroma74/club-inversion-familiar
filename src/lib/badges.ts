/** Logros y niveles de la liga: gamificación sobre las carteras ya calculadas. */
import type { PortfolioSummary } from "./portfolio";
import { isCrypto } from "./prices";
import { isCommodity } from "./commodities";
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

export type TradeLite = { id?: string; symbol: string; side: string; date: Date; currency: string };
export type ContributionLite = { date: Date; note: string | null };

/** Datos del miembro que no salen de la cartera: diario, Academia y cartera del mes. Todo opcional para no romper a quien no los tenga. */
export type BadgeExtras = {
  journalEntries?: number; // entradas en el diario
  buysWithJournal?: number; // compras que tienen su porqué escrito
  allCoursesCompleted?: boolean; // los seis cursos de la Academia
  decisions?: number; // decisiones de la cartera del mes enviadas
  decisionsOnTime?: number; // enviadas antes del plazo (o sin plazo)
  longestArgument?: number; // caracteres del argumento más largo
  etfSymbols?: Set<string>; // símbolos que la familia tiene clasificados como ETF o fondo
};

const DAY = 86400000;

export function computeBadges(member: PortfolioSummary, trades: TradeLite[], contributions: ContributionLite[], rank: number, members: number, lessonsPassed = 0, extras: BadgeExtras = {}): MemberProgress {
  const buys = trades.filter((t) => t.side === "BUY");
  const held = new Set(member.holdings.map((h) => h.symbol));
  const oldest = buys.filter((t) => held.has(t.symbol.toUpperCase())).reduce<number | null>((min, t) => (min === null || t.date.getTime() < min ? t.date.getTime() : min), null);
  const daysHeld = oldest === null ? 0 : Math.floor((Date.now() - oldest) / DAY);
  const months = new Set(contributions.map((c) => `${c.date.getFullYear()}-${c.date.getMonth()}`));
  const investedShare = member.totalValue > 0 ? member.marketValue / member.totalValue : 0;
  const firstContribution = contributions.reduce<number | null>((min, c) => (min === null || c.date.getTime() < min ? c.date.getTime() : min), null);
  const daysMember = firstContribution === null ? 0 : Math.floor((Date.now() - firstContribution) / DAY);
  const biggestShare = member.marketValue > 0 ? Math.max(...member.holdings.map((h) => h.value)) / member.marketValue : 1;
  const etf = extras.etfSymbols ?? new Set<string>();
  const isEtf = (s: string) => etf.has(s.toUpperCase());

  const badges: Badge[] = [
    // Primeros pasos y actividad
    { id: "first", label: "Primera operación", detail: "Registra tu primera compra.", earned: trades.length >= 1 },
    { id: "active", label: "Inversor activo", detail: "Diez operaciones o más.", earned: trades.length >= 10 },
    { id: "veteran", label: "Veterano", detail: "Un año desde tu primera aportación y 25 operaciones o más.", earned: daysMember >= 365 && trades.length >= 25 },
    { id: "steady", label: "Constante", detail: "Aportaciones en tres meses distintos.", earned: months.size >= 3 },
    // Cómo está construida la cartera
    { id: "diversified", label: "Diversificador", detail: "Tres o más activos distintos en cartera.", earned: member.holdings.length >= 3 },
    { id: "balanced", label: "Cartera equilibrada", detail: "Cuatro o más activos y ninguno supera el 40 % del valor.", earned: member.holdings.length >= 4 && biggestShare <= 0.4 },
    { id: "allin", label: "Capital trabajando", detail: "Más del 90 % del dinero invertido.", earned: member.holdings.length > 0 && investedShare >= 0.9 },
    { id: "diamond", label: "Manos de diamante", detail: "Mantener una posición más de 90 días.", earned: daysHeld >= 90 },
    { id: "patience", label: "Paciencia", detail: "Mantener una posición más de un año.", earned: daysHeld >= 365 },
    // Tipos de activo
    { id: "crypto", label: "Explorador cripto", detail: "Has invertido en alguna criptomoneda.", earned: trades.some((t) => isCrypto(t.symbol)) },
    { id: "global", label: "Inversor global", detail: "Una operación en dólares, libras o francos.", earned: trades.some((t) => t.currency !== "EUR") },
    { id: "home", label: "Hecho en casa", detail: "Una acción de la bolsa española (.MC) en cartera.", earned: member.holdings.some((h) => h.symbol.toUpperCase().endsWith(".MC")) },
    { id: "fund", label: "Fondo de armario", detail: "Un ETF o fondo indexado en cartera.", earned: member.holdings.some((h) => isEtf(h.symbol)) },
    { id: "commodity", label: "Materias primas", detail: "Invertir en alguna materia prima.", earned: trades.some((t) => isCommodity(t.symbol)) },
    // Resultados
    { id: "green", label: "En verde", detail: "Rentabilidad positiva.", earned: member.contributed > 0 && member.returnPct > 0 },
    { id: "five", label: "Cinco por ciento", detail: "Rentabilidad del 5 % o más.", earned: member.returnPct >= 0.05 },
    { id: "ten", label: "Dos dígitos", detail: "Rentabilidad del 10 % o más.", earned: member.returnPct >= 0.1 },
    { id: "realized", label: "Beneficio en el bolsillo", detail: "Cerrar una posición con ganancia.", earned: member.realized > 0 },
    // Aprender y explicar
    { id: "chronicler", label: "Cronista", detail: "Diez entradas en el diario.", earned: (extras.journalEntries ?? 0) >= 10 },
    { id: "why", label: "Explica el porqué", detail: "Todas tus compras tienen su porqué (mínimo cinco).", earned: buys.length >= 5 && (extras.buysWithJournal ?? 0) >= buys.length },
    { id: "student", label: "Alumno aplicado", detail: "Diez lecciones de la Academia superadas.", earned: lessonsPassed >= 10 },
    { id: "graduate", label: "Graduado", detail: "Los seis cursos de la Academia completados.", earned: extras.allCoursesCompleted === true },
    // Cartera del mes y liga
    { id: "decided", label: "Decidido", detail: "Primera decisión de la cartera del mes enviada.", earned: (extras.decisions ?? 0) >= 1 },
    { id: "punctual", label: "Siempre a tiempo", detail: "Tres decisiones mensuales enviadas antes del plazo.", earned: (extras.decisionsOnTime ?? 0) >= 3 },
    { id: "arguer", label: "Argumentador", detail: "Un argumento de decisión de más de 300 caracteres.", earned: (extras.longestArgument ?? 0) > 300 },
    { id: "podium", label: "Podio", detail: "Entre los tres primeros con al menos cuatro miembros.", earned: rank < 3 && members >= 4 && member.contributed > 0 },
    { id: "leader", label: "Líder de la liga", detail: "Primer puesto del ranking.", earned: rank === 0 && members > 1 && member.contributed > 0 },
  ];
  const badgesEarned = badges.filter((b) => b.earned).length;
  const points = badgesEarned * POINTS_PER_BADGE + lessonsPassed * POINTS_PER_LESSON;
  const lv = levelFromPoints(points);
  return { userId: member.userId, userName: member.userName, badges, badgesEarned, lessonsPassed, points, level: lv.level, levelName: lv.name, nextLevelAt: lv.nextAt, levelProgress: lv.progress };
}
