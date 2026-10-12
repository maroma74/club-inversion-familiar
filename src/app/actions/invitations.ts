"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { destroySession, requireAdmin, uniqueInviteCode } from "@/lib/auth";
import { invitationEmail, sendEmail } from "@/lib/email";
import { appUrl } from "@/lib/appUrl";
import type { FormState } from "./auth";

const refresh = () => {
  revalidatePath("/invitaciones");
  revalidatePath("/familia");
  revalidatePath("/inversiones");
};

const invitationSchema = z.object({
  name: z.string().trim().max(80).optional(),
  email: z.string().trim().toLowerCase().email("Email no válido").optional().or(z.literal("")),
  role: z.enum(["MEMBER", "ADMIN"]).default("MEMBER"),
  note: z.string().trim().max(200).optional(),
  expiresDays: z.coerce.number().int().min(0).max(365).default(14),
});

export async function createInvitationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = invitationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const email = d.email || null;
  if (email && (await prisma.user.findUnique({ where: { email } }))) return { error: "Ya existe un miembro con ese email" };
  const pending = await prisma.invitation.count({ where: { familyId: admin.familyId, usedAt: null, revokedAt: null } });
  if (pending >= 50) return { error: "Demasiadas invitaciones pendientes; anula alguna antes de crear más" };
  const code = await uniqueInviteCode();
  await prisma.invitation.create({
    data: {
      familyId: admin.familyId,
      code,
      name: d.name || null,
      email,
      role: d.role,
      note: d.note || null,
      expiresAt: d.expiresDays > 0 ? new Date(Date.now() + d.expiresDays * 86400000) : null,
      createdById: admin.id,
    },
  });
  refresh();
  return { ok: `Invitación creada con el código ${code}` };
}

const sendSchema = z.object({ id: z.string().min(1), email: z.string().trim().toLowerCase().email("Indica un email válido").optional().or(z.literal("")) });

/** Envía (o reenvía) una invitación pendiente por correo con el enlace de registro. */
export async function sendInvitationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = sendSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const inv = await prisma.invitation.findFirst({ where: { id: parsed.data.id, familyId: admin.familyId }, include: { family: true } });
  if (!inv) return { error: "Invitación no encontrada" };
  if (inv.usedAt) return { error: "Esta invitación ya se ha usado" };
  if (inv.revokedAt) return { error: "Esta invitación está anulada; reactívala antes de enviarla" };
  if (inv.expiresAt && inv.expiresAt.getTime() < Date.now()) return { error: "Esta invitación ha caducado; reactívala antes de enviarla" };
  const to = inv.email ?? parsed.data.email ?? "";
  if (!to) return { error: "Indica a qué email enviarla" };
  // Límites de envío: 10 minutos entre reenvíos de la misma invitación y 30 correos al día por familia.
  if (inv.sentAt && Date.now() - inv.sentAt.getTime() < 10 * 60 * 1000) return { error: "Esta invitación se envió hace menos de 10 minutos. Espera un poco antes de reenviarla." };
  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
  const sentToday = await prisma.invitation.count({ where: { familyId: admin.familyId, sentAt: { gte: dayStart } } });
  if (sentToday >= 30) return { error: "Se ha alcanzado el límite de 30 correos de invitación al día" };
  const origin = appUrl();
  const message = invitationEmail({
    to,
    inviteeName: inv.name,
    familyName: inv.family.name,
    presidentName: admin.name,
    code: inv.code,
    link: `${origin}/registro?codigo=${inv.code}`,
    expiresAt: inv.expiresAt,
  });
  const result = await sendEmail(message);
  if (!result.sent) return { error: result.error };
  await prisma.invitation.update({ where: { id: inv.id }, data: { sentAt: new Date(), sentTo: to } });
  refresh();
  return { ok: `Invitación enviada a ${to}` };
}

export async function revokeInvitationAction(formData: FormData) {
  const admin = await requireAdmin();
  await prisma.invitation.updateMany({ where: { id: String(formData.get("id")), familyId: admin.familyId, usedAt: null }, data: { revokedAt: new Date() } });
  refresh();
}

export async function deleteInvitationAction(formData: FormData) {
  const admin = await requireAdmin();
  // Las invitaciones usadas se conservan: son el rastro de quién entró con cuál.
  await prisma.invitation.deleteMany({ where: { id: String(formData.get("id")), familyId: admin.familyId, usedAt: null } });
  refresh();
}

/** Vuelve a activar una invitación anulada o caducada con nueva fecha de caducidad (14 días). */
export async function renewInvitationAction(formData: FormData) {
  const admin = await requireAdmin();
  await prisma.invitation.updateMany({
    where: { id: String(formData.get("id")), familyId: admin.familyId, usedAt: null },
    data: { revokedAt: null, expiresAt: new Date(Date.now() + 14 * 86400000) },
  });
  refresh();
}

export async function setJoinModeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const mode = String(formData.get("joinMode") ?? "");
  if (!["CODE", "CODE_APPROVAL", "INVITE_ONLY"].includes(mode)) return { error: "Modo no válido" };
  await prisma.family.update({ where: { id: admin.familyId }, data: { joinMode: mode } });
  refresh();
  const label = mode === "CODE" ? "entrada directa con el código general" : mode === "CODE_APPROVAL" ? "código general con aprobación del presidente" : "solo con invitación personal";
  return { ok: `Modo de entrada: ${label}` };
}

export async function regenerateFamilyCodeAction(): Promise<FormState> {
  const admin = await requireAdmin();
  const code = await uniqueInviteCode();
  await prisma.family.update({ where: { id: admin.familyId }, data: { inviteCode: code } });
  refresh();
  return { ok: `Nuevo código general: ${code}. El anterior deja de funcionar.` };
}

async function memberOfMyFamily(adminFamilyId: string, userId: string) {
  return prisma.user.findFirst({ where: { id: userId, familyId: adminFamilyId } });
}

export async function approveMemberAction(formData: FormData) {
  const admin = await requireAdmin();
  const m = await memberOfMyFamily(admin.familyId, String(formData.get("userId")));
  if (!m) return;
  await prisma.user.update({ where: { id: m.id }, data: { status: "ACTIVE" } });
  refresh();
}

/** Rechaza una solicitud pendiente o expulsa a un miembro: se borra el usuario con sus operaciones y aportaciones. */
export async function removeMemberAction(formData: FormData) {
  const admin = await requireAdmin();
  const m = await memberOfMyFamily(admin.familyId, String(formData.get("userId")));
  if (!m || m.id === admin.id) return;
  if (m.role === "ADMIN") {
    const admins = await prisma.user.count({ where: { familyId: admin.familyId, role: "ADMIN", status: "ACTIVE" } });
    if (admins <= 1) return;
  }
  await prisma.user.delete({ where: { id: m.id } });
  refresh();
}

export async function setMemberRoleAction(formData: FormData) {
  const admin = await requireAdmin();
  const m = await memberOfMyFamily(admin.familyId, String(formData.get("userId")));
  const role = String(formData.get("role"));
  if (!m || !["ADMIN", "MEMBER"].includes(role)) return;
  if (m.id === admin.id && role === "MEMBER") {
    const admins = await prisma.user.count({ where: { familyId: admin.familyId, role: "ADMIN", status: "ACTIVE" } });
    if (admins <= 1) return; // siempre debe quedar un administrador
  }
  await prisma.user.update({ where: { id: m.id }, data: { role } });
  refresh();
  if (m.id === admin.id && role === "MEMBER") revalidatePath("/invitaciones");
}

/** Un usuario pendiente puede retirar su solicitud (borra su cuenta) y volver al registro. */
export async function withdrawRequestAction() {
  const { getCurrentUser } = await import("@/lib/auth");
  const user = await getCurrentUser();
  if (user && user.status === "PENDING") {
    await prisma.user.delete({ where: { id: user.id } });
  }
  await destroySession();
}
