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
