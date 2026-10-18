"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, uniqueInviteCode } from "@/lib/auth";
import { adoptProposal } from "@/lib/adoptProposal";
import { normalizePhone, DEFAULT_PORTFOLIO_TEMPLATE } from "@/lib/communications";
import { deliverInvitation } from "@/lib/invitationDelivery";
import { rateLimit } from "@/lib/ratelimit";
import { clubEndOfDay, monthSchema, nameText, parseMoney, todayYmd } from "@/lib/validation";
import { closeAction, publishAction } from "./monthly";
import { createCommunicationAction } from "./communications";
import type { FormState } from "./auth";

/* Asistente de puesta en marcha (/empezar). Cada acción es una envoltura fina sobre las de siempre, para que el
   asistente haga exactamente lo mismo que las pantallas de gestión, solo que en orden y explicado. */

const refresh = () => {
  for (const p of ["/empezar", "/inicio", "/familia", "/invitaciones", "/cartera", "/cartera/gestion", "/comunicaciones", "/ayuda"]) revalidatePath(p);
};

/* 1 · El club y la paga */
const clubSchema = z.object({ name: nameText(60, 2) });

export async function saveClubAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = clubSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const amount = parseMoney(formData.get("amount"), { allowZero: false });
  if (amount === null) return { error: "Indica la paga mensual por persona (por ejemplo, 20 €)" };
  if (amount > 1000) return { error: "Es una paga para aprender: pon como mucho 1.000 € al mes por persona" };
  const name = parsed.data.name.replace(/\s+/g, " ");
  await prisma.$transaction([
    prisma.family.update({ where: { id: admin.familyId }, data: { name, monthlyAllowance: amount, allowanceSetAt: new Date() } }),
    // Los borradores todavía no publicados se ponen al día con la paga nueva
    prisma.monthlyAllocation.updateMany({ where: { portfolio: { familyId: admin.familyId, status: "DRAFT" } }, data: { amount } }),
  ]);
  revalidatePath("/", "layout");
  refresh();
  return { ok: "Guardado" };
}

/* 2 · Invitar a los hijos */
const inviteSchema = z.object({
  name: nameText(80, 2),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().toLowerCase().email("Email no válido").optional().or(z.literal("")),
});

export async function inviteChildAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = inviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const phone = d.phone ? normalizePhone(d.phone) : null;
  if (d.phone && !phone) return { error: "El móvil no parece válido. Escríbelo con prefijo (+34 612 345 678) o los nueve dígitos." };
  const email = d.email || null;
  const limit = await rateLimit(`invite:${admin.id}`, 30, 60 * 60 * 1000);
  if (!limit.ok) return { error: "Has creado muchas invitaciones seguidas. Prueba dentro de un rato." };
  if (email && (await prisma.user.findFirst({ where: { email, familyId: admin.familyId }, select: { id: true } }))) return { error: "Ya hay alguien de tu familia con ese email" };
  const pending = await prisma.invitation.count({ where: { familyId: admin.familyId, usedAt: null, revokedAt: null } });
  if (pending >= 50) return { error: "Demasiadas invitaciones pendientes; anula alguna antes de crear más" };
  const inv = await prisma.invitation.create({
    data: { familyId: admin.familyId, code: await uniqueInviteCode(), name: d.name, email, phone, role: "MEMBER", expiresAt: new Date(Date.now() + 30 * 86400000), createdById: admin.id },
  });
  const who = d.name.split(" ")[0];
  if (email) {
    const sent = await deliverInvitation(admin, inv.id, email);
    refresh();
    return sent.ok ? { ok: `Invitación para ${who} creada y enviada por correo.${phone ? " Mándasela también por WhatsApp." : ""}` } : { ok: `Invitación para ${who} creada, pero el correo no ha salido (${sent.error}). Mándasela por WhatsApp o copia el enlace.` };
  }
  refresh();
  return { ok: `Invitación para ${who} creada. Ahora mándasela por WhatsApp o copia el enlace.` };
}

/* 3 · Elegir la cartera del mes */
const chooseSchema = z.object({ proposalId: z.string().min(1), month: monthSchema });

export async function chooseProposalAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = chooseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Elige una propuesta" };
  const r = await adoptProposal(admin, parsed.data.proposalId, parsed.data.month);
  if ("error" in r) return r;
  refresh();
  redirect("/empezar?paso=publicar");
}

/** Descarta el borrador elegido para escoger otra propuesta (solo si sigue en borrador). */
export async function discardDraftAction(formData: FormData) {
  const admin = await requireAdmin();
  await prisma.monthlyPortfolio.deleteMany({ where: { id: String(formData.get("id") ?? ""), familyId: admin.familyId, status: "DRAFT" } });
  refresh();
  redirect("/empezar?paso=cartera");
}

/* 4 · Plazo y publicación */
const publishSchema = z.object({ id: z.string().min(1), deadline: z.string().trim().default("") });

export async function publishSetupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = publishSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Datos no válidos" };
  const { id, deadline: raw } = parsed.data;
  const p = await prisma.monthlyPortfolio.findFirst({ where: { id, familyId: admin.familyId }, include: { allocations: true } });
  if (!p) return { error: "Cartera no encontrada" };
  if (p.status !== "DRAFT") redirect("/empezar?paso=avisar");
  let deadline: Date | null = null;
  if (raw) {
    deadline = clubEndOfDay(raw);
    if (!deadline) return { error: "Fecha no válida" };
    if (raw < todayYmd()) return { error: "El plazo no puede ser anterior a hoy" };
  }
  // Quien entró en el club después de elegir la propuesta también recibe su paga
  const members = await prisma.user.findMany({ where: { familyId: admin.familyId, status: "ACTIVE" }, select: { id: true } });
  const missing = members.filter((m) => !p.allocations.some((a) => a.userId === m.id));
  await prisma.$transaction([
    prisma.monthlyPortfolio.update({ where: { id }, data: { deadline } }),
    ...missing.map((m) => prisma.monthlyAllocation.create({ data: { portfolioId: id, userId: m.id, amount: admin.family.monthlyAllowance } })),
  ]);
  const fd = new FormData();
  fd.set("id", id);
  const result = await publishAction(undefined, fd);
  if (result?.error) return result;
  refresh();
  redirect("/empezar?paso=avisar");
}

/* 5 · Avisar a los hijos */
export async function prepareNoticesAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const fd = new FormData();
  fd.set("portfolioId", String(formData.get("portfolioId") ?? ""));
  fd.set("template", DEFAULT_PORTFOLIO_TEMPLATE);
  const r = await createCommunicationAction(undefined, fd);
  refresh();
  return r;
}

/* 7 · Cerrar la cartera y abrir el repaso */
export async function closeForReviewAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await closeAction(formData);
  refresh();
  redirect(`/cartera/historial/${id}#repaso-familia`);
}

/* Saltar o retomar el asistente */
export async function dismissSetupAction() {
  const admin = await requireAdmin();
  await prisma.family.update({ where: { id: admin.familyId }, data: { setupDismissedAt: new Date() } });
  refresh();
  redirect("/inicio");
}

export async function resumeSetupAction() {
  const admin = await requireAdmin();
  await prisma.family.update({ where: { id: admin.familyId }, data: { setupDismissedAt: null } });
  refresh();
  redirect("/empezar");
}
