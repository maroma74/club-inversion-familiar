"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, uniqueInviteCode } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { nameText } from "@/lib/validation";
import { noSlotsMessage } from "@/lib/familyInvites";
import { normalizePhone } from "@/lib/communications";
import { loadInviteCapacity } from "@/lib/inviteCapacity";
import { canManageInvitation, deliverInvitation } from "@/lib/invitationDelivery";
import type { FormState } from "./auth";

/* Invitar a otras familias: lo puede hacer cualquier usuario activo que tenga capacidad
   (el presidente con las cinco del club, cualquiera con un paquete asignado por la administración, o sin límite). */

const refresh = () => {
  revalidatePath("/invitar");
  revalidatePath("/invitaciones");
  revalidatePath("/inicio");
};

const schema = z.object({
  name: nameText(80).optional(),
  email: z.string().trim().toLowerCase().email("Email no válido").optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  note: nameText(200).optional(),
  expiresDays: z.coerce.number().int().min(0).max(365).default(30),
});

export async function createFamilyInvitationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const limit = await rateLimit(`invite:${user.id}`, 30, 60 * 60 * 1000);
  if (!limit.ok) return { error: "Has creado muchas invitaciones seguidas. Prueba dentro de un rato." };
  const phone = d.phone ? normalizePhone(d.phone) : null;
  if (d.phone && !phone) return { error: "El móvil no parece válido. Escríbelo con prefijo (+34 612 345 678) o los nueve dígitos." };
  const cap = await loadInviteCapacity(user);
  if (cap.source === "none") return { error: cap.pool ? noSlotsMessage(cap.pool) : "No tienes invitaciones para familias nuevas. Las del club las gestiona el presidente." };
  const code = await uniqueInviteCode();
  const inv = await prisma.invitation.create({
    data: {
      familyId: user.familyId,
      code,
      name: d.name || null,
      email: d.email || null,
      phone,
      role: "ADMIN",
      newFamily: true,
      fromPack: cap.source !== "pool",
      note: d.note || null,
      expiresAt: d.expiresDays > 0 ? new Date(Date.now() + d.expiresDays * 86400000) : null,
      createdById: user.id,
    },
  });
  const origin = cap.source === "pool" ? " (una de las cinco del club)" : cap.source === "pack" ? " (de tu paquete)" : "";
  // Con email, el correo sale en el acto: nadie tiene que acordarse de pulsar «Enviar» después
  if (d.email) {
    const sent = await deliverInvitation(user, inv.id, d.email);
    refresh();
    return sent.ok ? { ok: `Invitación creada${origin} y enviada por correo a ${d.email}` } : { ok: `Invitación creada con el código ${code}${origin}, pero el correo no ha salido: ${sent.error} Puedes reenviarlo desde la lista o mandarla por WhatsApp.` };
  }
  refresh();
  return { ok: `Invitación creada con el código ${code}${origin}. Envíala por WhatsApp o copia el enlace desde la lista.` };
}

const sendSchema = z.object({ id: z.string().min(1), email: z.string().trim().toLowerCase().email("Indica un email válido").optional().or(z.literal("")) });

export async function sendFamilyInvitationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = sendSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const result = await deliverInvitation(user, parsed.data.id, parsed.data.email ?? "");
  if (result.ok) refresh();
  return result;
}

/** Deja constancia de que la invitación se compartió por WhatsApp (el envío lo hace WhatsApp en el móvil de quien invita). */
export async function markInvitationSharedAction(id: string) {
  const user = await requireUser();
  const inv = await prisma.invitation.findUnique({ where: { id }, select: { id: true, familyId: true, createdById: true } });
  if (!inv || !canManageInvitation(user, inv)) return;
  await prisma.invitation.update({ where: { id: inv.id }, data: { sharedAt: new Date() } });
  refresh();
}

/** Anula una invitación de familia pendiente (propia, o de la familia si se es presidente): libera su hueco. */
export async function revokeFamilyInvitationAction(formData: FormData) {
  const user = await requireUser();
  const inv = await prisma.invitation.findUnique({ where: { id: String(formData.get("id")) }, select: { id: true, familyId: true, createdById: true, usedAt: true } });
  if (!inv || inv.usedAt || !canManageInvitation(user, inv)) return;
  await prisma.invitation.update({ where: { id: inv.id }, data: { revokedAt: new Date() } });
  refresh();
}
