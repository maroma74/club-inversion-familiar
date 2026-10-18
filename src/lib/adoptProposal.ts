import "server-only";
import { prisma } from "./prisma";
import { rateLimit } from "./ratelimit";
import type { CurrentUser } from "./auth";

/**
 * Crea el borrador del mes a partir de una propuesta del repositorio, con importe para cada miembro activo.
 * Lo usan la gestión de carteras (que después abre el borrador) y el asistente de puesta en marcha.
 * No comprueba permisos: quien lo llame tiene que haber pasado antes por requireAdmin().
 */
export async function adoptProposal(admin: CurrentUser, proposalId: string, month: string): Promise<{ id: string } | { error: string }> {
  const limit = await rateLimit(`adopt:${admin.id}`, 20, 60 * 60 * 1000);
  if (!limit.ok) return { error: "Has creado muchas carteras seguidas desde el repositorio. Prueba dentro de un rato." };
  const proposal = await prisma.proposal.findUnique({ where: { id: proposalId }, include: { options: { orderBy: { order: "asc" } } } });
  if (!proposal) return { error: "La propuesta ya no está en el repositorio" };
  if (await prisma.monthlyPortfolio.findUnique({ where: { familyId_month: { familyId: admin.familyId, month } } })) return { error: "Ya tienes una cartera para ese mes: elige otro" };
  const members = await prisma.user.findMany({ where: { familyId: admin.familyId, status: "ACTIVE" }, select: { id: true } });
  const created = await prisma.$transaction(async (tx) => {
    const p = await tx.monthlyPortfolio.create({
      data: {
        familyId: admin.familyId,
        month,
        sourceProposalId: proposal.id,
        title: proposal.title,
        lesson: proposal.lesson,
        minChoices: proposal.minChoices,
        maxChoices: proposal.maxChoices,
        createdById: admin.id,
        allocations: { create: members.map((m) => ({ userId: m.id, amount: admin.family.monthlyAllowance })) },
        options: { create: proposal.options.map((o, i) => ({ symbol: o.symbol, name: o.name, kind: o.kind, note: o.note, order: i })) },
      },
    });
    await tx.proposal.update({ where: { id: proposal.id }, data: { uses: { increment: 1 } } });
    return p;
  });
  return { id: created.id };
}

