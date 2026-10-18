import "server-only";
import { prisma } from "./prisma";
import { currentMonthYm } from "./validation";
import { getPortfolioFull, isDeadlinePassed, type PortfolioFull } from "./monthly";
import { setupProgress, setupSteps, type SetupFacts } from "./setup";
import type { Recipient } from "@/app/actions/communications";

const nextYm = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

/**
 * La cartera en la que se centra el asistente: si la familia ya cerró alguna, la última cerrada (el repaso está
 * hecho); si no, la más reciente que tenga, sea borrador o publicada.
 */
async function focusPortfolio(familyId: string): Promise<{ portfolio: PortfolioFull | null; hasClosed: boolean }> {
  const closed = await prisma.monthlyPortfolio.findFirst({ where: { familyId, status: "CLOSED" }, orderBy: { month: "desc" }, select: { id: true } });
  if (closed) return { portfolio: await getPortfolioFull(closed.id, familyId), hasClosed: true };
  const latest = await prisma.monthlyPortfolio.findFirst({ where: { familyId }, orderBy: [{ month: "desc" }, { createdAt: "desc" }], select: { id: true } });
  return { portfolio: latest ? await getPortfolioFull(latest.id, familyId) : null, hasClosed: false };
}

/** Solo lo necesario para saber en qué paso va el club (lo usa Inicio). */
export async function loadSetupSummary(familyId: string, adminId: string) {
  const [family, members, pendingInvites, focus] = await Promise.all([
    prisma.family.findUniqueOrThrow({ where: { id: familyId }, select: { allowanceSetAt: true, setupDismissedAt: true } }),
    prisma.user.count({ where: { familyId, status: "ACTIVE", id: { not: adminId } } }),
    prisma.invitation.count({ where: { familyId, newFamily: false, usedAt: null, revokedAt: null } }),
    focusPortfolio(familyId),
  ]);
  const notified = focus.portfolio ? (await prisma.communication.count({ where: { familyId, portfolioId: focus.portfolio.id } })) > 0 : false;
  const facts = factsFrom(family.allowanceSetAt, members, pendingInvites, focus.portfolio, notified, focus.hasClosed);
  const steps = setupSteps(facts);
  return { steps, ...setupProgress(steps), dismissed: !!family.setupDismissedAt };
}

function factsFrom(allowanceSetAt: Date | null, members: number, pendingInvites: number, p: PortfolioFull | null, notified: boolean, hasClosed: boolean): SetupFacts {
  return {
    allowanceConfirmed: !!allowanceSetAt,
    members,
    pendingInvites,
    hasClosed,
    portfolio: p
      ? {
          status: p.status as "DRAFT" | "PUBLISHED" | "CLOSED",
          // En borrador cuentan todos los miembros activos: al publicar, el asistente les asigna su paga
          deciders: p.status === "DRAFT" ? members : p.allocations.filter((a) => a.amount > 0 && a.userId !== p.createdById).length,
          decided: p.decisions.filter((d) => d.userId !== p.createdById).length,
          deadlinePassed: isDeadlinePassed(p),
          notified,
        }
      : null,
  };
}

/** Todo lo que pinta el asistente. */
export async function loadSetup(familyId: string, adminId: string) {
  const ym = currentMonthYm();
  const [family, members, invites, focus, months] = await Promise.all([
    prisma.family.findUniqueOrThrow({ where: { id: familyId }, select: { name: true, monthlyAllowance: true, allowanceSetAt: true, setupDismissedAt: true } }),
    prisma.user.findMany({ where: { familyId, status: "ACTIVE", id: { not: adminId } }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, phone: true, createdAt: true } }),
    prisma.invitation.findMany({ where: { familyId, newFamily: false, usedAt: null, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, orderBy: { createdAt: "desc" }, select: { id: true, code: true, name: true, email: true, phone: true, sharedAt: true, sentAt: true, expiresAt: true } }),
    focusPortfolio(familyId),
    prisma.monthlyPortfolio.findMany({ where: { familyId }, select: { month: true, sourceProposalId: true, title: true } }),
  ]);
  const p = focus.portfolio;
  const communication = p ? await prisma.communication.findFirst({ where: { familyId, portfolioId: p.id }, orderBy: { createdAt: "desc" } }) : null;
  const facts = factsFrom(family.allowanceSetAt, members.length, invites.length, p, !!communication, focus.hasClosed);
  const steps = setupSteps(facts);

  // Mes para la primera cartera: el actual si está libre; si no, el siguiente libre
  const taken = new Set(months.map((m) => m.month));
  let targetMonth = ym;
  while (taken.has(targetMonth)) targetMonth = nextYm(targetMonth);

  // Tres propuestas para empezar: primero las del Club y de riesgo moderado, sin repetir las ya usadas
  const usedIds = new Set(months.map((m) => m.sourceProposalId).filter(Boolean));
  const usedTitles = new Set(months.map((m) => m.title.trim().toLowerCase()));
  const suggestions = p
    ? []
    : (await prisma.proposal.findMany({
        orderBy: [{ uses: "desc" }, { createdAt: "asc" }],
        take: 20,
        select: { id: true, title: true, theme: true, risk: true, source: true, lesson: true, minChoices: true, maxChoices: true, options: { orderBy: { order: "asc" }, select: { symbol: true, name: true, kind: true } } },
      }))
        .filter((s) => !usedIds.has(s.id) && !usedTitles.has(s.title.trim().toLowerCase()))
        // Para empezar, riesgo medio-bajo (2) primero: un ETF mundial o dividendos dan más conversación que la renta fija pura
        .sort((a, b) => (a.source === b.source ? 0 : a.source === "CLUB" ? -1 : 1) || Math.abs(a.risk - 2) - Math.abs(b.risk - 2))
        .slice(0, 3);

  return {
    family,
    members,
    invites,
    portfolio: p,
    communication: communication ? { id: communication.id, createdAt: communication.createdAt, recipients: communication.recipients as unknown as Recipient[] } : null,
    targetMonth,
    suggestions,
    steps,
    ...setupProgress(steps),
  };
}
