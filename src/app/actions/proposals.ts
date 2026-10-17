"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { proposalProblems } from "@/lib/proposals";
import type { FormState } from "./auth";

const refresh = (portfolioId?: string) => {
  for (const p of ["/cartera/repositorio", "/cartera/gestion", "/cartera"]) revalidatePath(p);
  if (portfolioId) revalidatePath(`/cartera/gestion/${portfolioId}`);
};

const MAX_SHARED_PER_FAMILY = 30;

const shareSchema = z.object({
  portfolioId: z.string().min(1),
  share: z.string().optional(), // casilla: «on» si está marcada
  visibility: z.enum(["signed", "anonymous"]).default("anonymous"),
  theme: z.string().default(""),
  risk: z.coerce.number().int().default(0),
});

/**
 * Casilla «Compartir en el repositorio» de una cartera. Marcada, guarda una copia de la propuesta (título, lección y
 * opciones) para que cualquier presidente pueda usarla, firmada con el nombre de la familia o anónima; desmarcada, la retira.
 * Solo se comparte si el texto cumple la normativa del club: neutro, sin meses ni periodos.
 */
export async function shareProposalAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = shareSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Datos no válidos" };
  const d = parsed.data;

  const portfolio = await prisma.monthlyPortfolio.findFirst({ where: { id: d.portfolioId, familyId: admin.familyId }, include: { options: { orderBy: { order: "asc" } } } });
  if (!portfolio) return { error: "Cartera no encontrada" };

  if (d.share !== "on") {
    const r = await prisma.proposal.deleteMany({ where: { sourcePortfolioId: portfolio.id, familyId: admin.familyId } });
    refresh(portfolio.id);
    return { ok: r.count ? "La propuesta ya no está en el repositorio" : "Esta cartera no está en el repositorio" };
  }

  const limit = await rateLimit(`share:${admin.id}`, 20, 60 * 60 * 1000);
  if (!limit.ok) return { error: "Has compartido demasiadas veces seguidas. Prueba dentro de un rato." };

  const input = {
    title: portfolio.title,
    lesson: portfolio.lesson,
    theme: d.theme,
    risk: d.risk,
    minChoices: portfolio.minChoices,
    maxChoices: portfolio.maxChoices,
    options: portfolio.options.map((o) => ({ symbol: o.symbol, name: o.name, kind: o.kind, note: o.note })),
  };
  const problems = proposalProblems(input);
  if (problems.length) return { error: problems.slice(0, 3).join(" ") };

  const existing = await prisma.proposal.findUnique({ where: { sourcePortfolioId: portfolio.id }, select: { id: true } });
  if (!existing) {
    const count = await prisma.proposal.count({ where: { familyId: admin.familyId, source: "FAMILY" } });
    if (count >= MAX_SHARED_PER_FAMILY) return { error: `Tu familia ya tiene ${MAX_SHARED_PER_FAMILY} propuestas en el repositorio. Retira alguna antes de compartir otra.` };
  }

  const signed = d.visibility === "signed";
  const data = { source: "FAMILY", familyId: admin.familyId, signed, title: input.title.trim(), theme: input.theme, risk: input.risk, lesson: input.lesson.trim(), minChoices: input.minChoices, maxChoices: input.maxChoices };
  const options = input.options.map((o, i) => ({ symbol: o.symbol.trim().toUpperCase(), name: o.name.trim(), kind: o.kind, note: o.note?.trim() || null, order: i }));
  await prisma.$transaction(async (tx) => {
    const p = await tx.proposal.upsert({ where: { sourcePortfolioId: portfolio.id }, update: data, create: { ...data, sourcePortfolioId: portfolio.id } });
    await tx.proposalOption.deleteMany({ where: { proposalId: p.id } });
    await tx.proposalOption.createMany({ data: options.map((o) => ({ ...o, proposalId: p.id })) });
  });
  refresh(portfolio.id);
  return { ok: signed ? `Compartida en el repositorio, firmada como ${admin.family.name}` : "Compartida en el repositorio de forma anónima" };
}

const useSchema = z.object({ proposalId: z.string().min(1), month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Elige un mes válido") });

/** Crea el borrador de la cartera de un mes a partir de una propuesta del repositorio (texto, opciones y número de elecciones). */
export async function adoptProposalAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = useSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { proposalId, month } = parsed.data;
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
  refresh(created.id);
  redirect(`/cartera/gestion/${created.id}`);
}

/** Una familia retira del repositorio una propuesta suya (las del club y las de otras familias no se pueden tocar). */
export async function retireProposalAction(formData: FormData) {
  const admin = await requireAdmin();
  await prisma.proposal.deleteMany({ where: { id: String(formData.get("id") ?? ""), familyId: admin.familyId, source: "FAMILY" } });
  refresh();
}
