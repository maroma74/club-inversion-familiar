"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { destroySession, requireAdmin, uniqueInviteCode } from "@/lib/auth";
import { invitationEmail, sendEmail } from "@/lib/email";
import { appUrl } from "@/lib/appUrl";
import { firstName } from "@/lib/names";
import { rateLimit } from "@/lib/ratelimit";
import { nameText } from "@/lib/validation";
import { familyInviteSlots, noSlotsMessage } from "@/lib/familyInvites";
import type { FormState } from "./auth";

const refresh = () => {
  revalidatePath("/invitaciones");
  revalidatePath("/familia");
  revalidatePath("/inversiones");
};

const invitationSchema = z.object({
  name: nameText(80).optional(),
  email: z.string().trim().toLowerCase().email("Email no válido").optional().or(z.literal("")),
  kind: z.enum(["MEMBER", "ADMIN", "NEW_FAMILY"]).default("MEMBER"),
  note: nameText(200).optional(),
  expiresDays: z.coerce.number().int().min(0).max(365).default(14),
});

export async function createInvitationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = invitationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const email = d.email || null;
  const limit = await rateLimit(`invite:${admin.id}`, 30, 60 * 60 * 1000);
  if (!limit.ok) return { error: "Has creado muchas invitaciones seguidas. Prueba dentro de un rato." };
  // Solo se mira dentro de la propia familia: la lista de correos de otras familias no es asunto de nadie.
  if (email && (await prisma.user.findFirst({ where: { email, familyId: admin.familyId }, select: { id: true } }))) return { error: "Ya hay un miembro de tu familia con ese email" };
  const pending = await prisma.invitation.count({ where: { familyId: admin.familyId, usedAt: null, revokedAt: null } });
  if (pending >= 50) return { error: "Demasiadas invitaciones pendientes; anula alguna antes de crear más" };
  const newFamily = d.kind === "NEW_FAMILY";
  if (newFamily) {
    // La regla de las cinco familias: entre fundadas y pendientes vivas, nunca más de cinco (src/lib/familyInvites.ts)
    const rows = await prisma.invitation.findMany({ where: { familyId: admin.familyId, newFamily: true }, select: { usedAt: true, revokedAt: true, expiresAt: true } });
    const slots = familyInviteSlots(rows);
    if (slots.free <= 0) return { error: noSlotsMessage(slots) };
  }
  const code = await uniqueInviteCode();
  await prisma.invitation.create({
    data: {
      familyId: admin.familyId,
      code,
      name: d.name || null,
      email,
      role: newFamily ? "ADMIN" : d.kind,
      newFamily,
      note: d.note || null,
      expiresAt: d.expiresDays > 0 ? new Date(Date.now() + d.expiresDays * 86400000) : null,
      createdById: admin.id,
    },
  });
  refresh();
  return { ok: newFamily ? `Invitación para una familia nueva creada con el código ${code}` : `Invitación creada con el código ${code}` };
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
  // Una invitación, un destinatario: una vez enviada no se reutiliza para escribir a otras direcciones.
  if (inv.sentTo && inv.sentTo !== to) return { error: `Esta invitación ya se envió a ${inv.sentTo}. Para otra persona, crea una invitación nueva.` };
  // Límites de envío: 10 minutos entre reenvíos de la misma invitación y 30 correos por familia cada 24 horas.
  if (inv.sentAt && Date.now() - inv.sentAt.getTime() < 10 * 60 * 1000) return { error: "Esta invitación se envió hace menos de 10 minutos. Espera un poco antes de reenviarla." };
  const daily = await rateLimit(`invite-mail:${admin.familyId}`, 30, 24 * 60 * 60 * 1000);
  if (!daily.ok) return { error: "Se ha alcanzado el límite de 30 correos de invitación al día" };
  const origin = appUrl();
  const message = invitationEmail({
    to,
    inviteeName: inv.name ? firstName(inv.name) : null,
    familyName: inv.family.name,
    presidentName: firstName(admin.name),
    code: inv.code,
    link: `${origin}/registro?codigo=${inv.code}`,
    expiresAt: inv.expiresAt,
    newFamily: inv.newFamily,
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
  const inv = await prisma.invitation.findFirst({ where: { id: String(formData.get("id")), familyId: admin.familyId, usedAt: null }, select: { newFamily: true } });
  if (!inv) return;
  if (inv.newFamily) {
    // Reactivar una invitación de familia vuelve a ocupar un hueco: solo si queda alguno libre
    const rows = await prisma.invitation.findMany({ where: { familyId: admin.familyId, newFamily: true }, select: { usedAt: true, revokedAt: true, expiresAt: true } });
    if (familyInviteSlots(rows).free <= 0) return;
  }
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
/** Comprueba dentro de la transacción que la familia sigue teniendo al menos un presidente activo; si no, deshace. */
const NO_ADMIN_LEFT = "SIN_PRESIDENTE";
async function ensureAdminRemains(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], familyId: string) {
  const admins = await tx.user.count({ where: { familyId, role: "ADMIN", status: "ACTIVE" } });
  if (admins < 1) throw new Error(NO_ADMIN_LEFT);
}

export async function removeMemberAction(formData: FormData) {
  const admin = await requireAdmin();
  const m = await memberOfMyFamily(admin.familyId, String(formData.get("userId")));
  if (!m || m.id === admin.id) return;
  // Borrado y comprobación en la misma transacción: dos presidentes no pueden expulsarse a la vez y dejar la familia sin ninguno.
  await prisma.$transaction(async (tx) => {
    await tx.user.delete({ where: { id: m.id } });
    await ensureAdminRemains(tx, admin.familyId);
  }, { isolationLevel: "Serializable" }).catch((e) => { if (!(e instanceof Error && e.message === NO_ADMIN_LEFT)) throw e; });
  refresh();
}

export async function setMemberRoleAction(formData: FormData) {
  const admin = await requireAdmin();
  const m = await memberOfMyFamily(admin.familyId, String(formData.get("userId")));
  const role = String(formData.get("role"));
  if (!m || !["ADMIN", "MEMBER"].includes(role)) return;
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: m.id }, data: { role } });
    await ensureAdminRemains(tx, admin.familyId); // siempre debe quedar un presidente
  }, { isolationLevel: "Serializable" }).catch((e) => { if (!(e instanceof Error && e.message === NO_ADMIN_LEFT)) throw e; });
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
