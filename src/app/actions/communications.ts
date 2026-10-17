"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { appUrl } from "@/lib/appUrl";
import { eur, fmtDate } from "@/lib/format";
import { firstName, uniqueFirstNames } from "@/lib/names";
import { getPortfolioFull, monthLabelLong } from "@/lib/monthly";
import { renderMessage, templateProblems, type MessageVars } from "@/lib/communications";
import type { FormState } from "./auth";

export type Recipient = { userId: string; name: string; phone: string | null; text: string; openedAt: string | null };

const schema = z.object({ portfolioId: z.string().min(1), template: z.string().min(1).max(1500) });

/**
 * Guarda el aviso de la cartera del mes: el texto personalizado de cada miembro con su importe y el enlace directo.
 * No envía nada por sí mismo: desde la página, el presidente abre WhatsApp con cada mensaje ya escrito y se anota
 * cuándo lo hizo. Los miembros sin teléfono se guardan igualmente (podrá copiarles el texto a mano).
 */
export async function createCommunicationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const limit = await rateLimit(`comms:${admin.id}`, 20, 60 * 60 * 1000);
  if (!limit.ok) return { error: "Has creado muchas comunicaciones seguidas. Prueba dentro de un rato." };
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Datos no válidos" };
  const { portfolioId, template } = parsed.data;
  const problems = templateProblems(template);
  if (problems.length) return { error: problems.join(" ") };
  const p = await getPortfolioFull(portfolioId, admin.familyId);
  if (!p || p.status === "DRAFT") return { error: "La cartera no existe o todavía es un borrador: publícala antes de avisar." };

  const members = await prisma.user.findMany({ where: { familyId: admin.familyId, status: "ACTIVE", id: { not: admin.id } }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, phone: true } });
  const names = uniqueFirstNames(members);
  const link = p.status === "PUBLISHED" ? `${appUrl()}/cartera` : `${appUrl()}/cartera/historial/${p.id}`;
  const recipients: Recipient[] = members.map((m) => {
    const amount = p.allocations.find((a) => a.userId === m.id)?.amount ?? 0;
    const vars: MessageVars = {
      nombre: names.get(m.id) ?? firstName(m.name),
      presidente: firstName(admin.name),
      familia: admin.family.name,
      mes: monthLabelLong(p.month),
      titulo: p.title,
      importe: eur(amount),
      opciones: p.options.length,
      minimo: p.minChoices,
      maximo: p.maxChoices,
      plazo: p.deadline ? `hasta el ${fmtDate(p.deadline)}` : "",
      enlace: link,
    };
    return { userId: m.id, name: vars.nombre, phone: m.phone, text: renderMessage(template, vars), openedAt: null };
  });
  if (recipients.length === 0) return { error: "No hay otros miembros activos a los que avisar." };
  const c = await prisma.communication.create({ data: { familyId: admin.familyId, createdById: admin.id, portfolioId: p.id, subject: `Cartera de ${monthLabelLong(p.month)} lista: ${p.title}`, body: template, recipients: recipients as unknown as object[] } });
  revalidatePath("/comunicaciones");
  revalidatePath("/inicio");
  return { ok: `Aviso preparado para ${recipients.length} ${recipients.length === 1 ? "miembro" : "miembros"}. Ahora envíalo a cada uno con su botón.`, id: c.id } as FormState & { id: string };
}

/** Anota que el presidente abrió WhatsApp con el mensaje de ese miembro (se llama al pulsar «Enviar por WhatsApp»). */
export async function markOpenedAction(communicationId: string, userId: string): Promise<void> {
  const admin = await requireAdmin();
  const c = await prisma.communication.findFirst({ where: { id: communicationId, familyId: admin.familyId } });
  if (!c) return;
  const recipients = (c.recipients as unknown as Recipient[]).map((r) => (r.userId === userId && !r.openedAt ? { ...r, openedAt: new Date().toISOString() } : r));
  await prisma.communication.update({ where: { id: c.id }, data: { recipients: recipients as unknown as object[] } });
  revalidatePath("/comunicaciones");
}
