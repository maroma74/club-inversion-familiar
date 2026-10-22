/** Carteras mensuales: la propuesta del presidente para cada mes y las decisiones de los miembros. */
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export const roleLabel = (role: string) => (role === "ADMIN" ? "Presidente del club" : "Miembro");

export type PortfolioStatus = "DRAFT" | "PUBLISHED" | "CLOSED";
export const STATUS_LABEL: Record<string, string> = { DRAFT: "Borrador", PUBLISHED: "Abierta", CLOSED: "Cerrada" };

export function monthLabelLong(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(new Date(y, m - 1, 1));
}

export function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const fullInclude = {
  options: { orderBy: { order: "asc" } },
  allocations: { include: { user: { select: { id: true, name: true } } } },
  decisions: { orderBy: { submittedAt: "asc" }, include: { user: { select: { id: true, name: true } }, choices: { include: { option: true } } } },
} satisfies Prisma.MonthlyPortfolioInclude;

export type PortfolioFull = Prisma.MonthlyPortfolioGetPayload<{ include: typeof fullInclude }>;

export async function getPortfolioFull(id: string, familyId: string): Promise<PortfolioFull | null> {
  return prisma.monthlyPortfolio.findFirst({ where: { id, familyId }, include: fullInclude });
}

/** La cartera abierta más reciente (o, si no hay, la última cerrada). */
export async function getCurrentPortfolio(familyId: string): Promise<PortfolioFull | null> {
  const open = await prisma.monthlyPortfolio.findFirst({ where: { familyId, status: "PUBLISHED" }, orderBy: { month: "desc" }, include: fullInclude });
  if (open) return open;
  return prisma.monthlyPortfolio.findFirst({ where: { familyId, status: "CLOSED" }, orderBy: { month: "desc" }, include: fullInclude });
}

export async function listPortfolios(familyId: string) {
  return prisma.monthlyPortfolio.findMany({
    where: { familyId },
    orderBy: { month: "desc" },
    include: { _count: { select: { options: true, decisions: true, allocations: true } } },
  });
}

/** Párrafos de la lección: separados por líneas en blanco. */
export function lessonParagraphs(text: string) {
  return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

export function isDeadlinePassed(p: { deadline: Date | null }) {
  return !!p.deadline && p.deadline.getTime() < Date.now();
}

export type UnlinkedTrade = { id: string; userId: string; userName: string; symbol: string; optionId: string; date: Date; quantity: number; costEur: number; priceEur: number; broker: string | null; why: string | null; journalEntryId: string | null };

/**
 * Compras hechas «fuera del formulario»: un miembro compró a mano uno de los valores de la cartera desde el día de
 * su publicación (p. ej. porque no tenía importe asignado y el formulario no le dejaba decidir). El presidente
 * puede reconocerlas como la decisión de ese miembro para que cuenten en «cómo decide el club» y en el repaso.
 */
export async function findUnlinkedTrades(p: PortfolioFull): Promise<UnlinkedTrade[]> {
  if (p.status === "DRAFT") return [];
  const since = new Date(p.publishedAt ?? p.createdAt);
  since.setHours(0, 0, 0, 0);
  const bySymbol = new Map(p.options.map((o) => [o.symbol.toUpperCase(), o.id]));
  const linked = new Set(p.decisions.flatMap((d) => d.choices.map((c) => c.tradeId).filter((t): t is string => !!t)));
  const trades = await prisma.trade.findMany({
    where: { user: { familyId: p.familyId, status: "ACTIVE" }, side: "BUY", symbol: { in: p.options.map((o) => o.symbol) }, date: { gte: since } },
    orderBy: { date: "asc" },
    include: { user: { select: { id: true, name: true } }, journal: { select: { id: true, why: true } } },
  });
  // Una compra que ya es parte de una decisión no se ofrece; tampoco las que ya hizo el formulario (entidad «Cartera AAAA-MM»)
  return trades
    .filter((t) => !linked.has(t.id) && !(t.broker ?? "").startsWith("Cartera "))
    .map((t) => ({
      id: t.id,
      userId: t.userId,
      userName: t.user.name,
      symbol: t.symbol,
      optionId: bySymbol.get(t.symbol.toUpperCase())!,
      date: t.date,
      quantity: t.quantity,
      costEur: Math.round((t.quantity * t.price * t.fxRate + t.fees) * 100) / 100,
      priceEur: t.price * t.fxRate,
      broker: t.broker,
      why: t.journal?.why ?? null,
      journalEntryId: t.journal?.id ?? null,
    }));
}

/** La recomendación del Club, dicha en lenguaje llano (la puntuación queda como detalle). */
export const clubSignalText = (action: string) => (action === "COMPRAR" ? "El club ve buena señal" : action === "VENDER" ? "El club ve señales de precaución" : "El club ve una señal neutra: mejor seguir observando");
