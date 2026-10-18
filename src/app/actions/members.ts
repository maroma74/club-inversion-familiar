"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { normalizePhone } from "@/lib/communications";
import { rateLimit } from "@/lib/ratelimit";
import { nameText } from "@/lib/validation";
import type { FormState } from "./auth";

const schema = z.object({
  userId: z.string().min(1),
  name: nameText(60, 2),
  email: z.string().trim().toLowerCase().email("Email no válido").max(120),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
});

/**
 * El presidente completa o corrige la ficha de un miembro de su familia: nombre, email (con el que entra) y móvil
 * (para los avisos por WhatsApp). La contraseña no se toca aquí: para eso está el enlace de restablecimiento.
 */
export async function updateMemberAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const limit = await rateLimit(`member-edit:${admin.id}`, 60, 60 * 60 * 1000);
  if (!limit.ok) return { error: "Has hecho muchos cambios seguidos. Prueba dentro de un rato." };
  const member = await prisma.user.findFirst({ where: { id: d.userId, familyId: admin.familyId }, select: { id: true, email: true } });
  if (!member) return { error: "Miembro no encontrado" };
  const phone = d.phone ? normalizePhone(d.phone) : null;
  if (d.phone && !phone) return { error: "El móvil no parece válido. Escríbelo con prefijo (+34 612 345 678) o los nueve dígitos." };
  if (d.email !== member.email && (await prisma.user.findUnique({ where: { email: d.email }, select: { id: true } }))) {
    // No se dice de quién es: los correos de otras familias no son asunto de nadie
    return { error: "Ese email ya lo usa otra cuenta del Club" };
  }
  await prisma.user.update({ where: { id: member.id }, data: { name: d.name.replace(/\s+/g, " "), email: d.email, phone } });
  for (const p of ["/familia", "/invitaciones", "/comunicaciones", "/inversiones", "/inicio"]) revalidatePath(p);
  revalidatePath(`/familia/miembro/${member.id}`);
  return { ok: d.email !== member.email ? `Ficha guardada. A partir de ahora entra con ${d.email}.` : "Ficha guardada" };
}
