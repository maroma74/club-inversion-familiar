"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { checkAvatar, MAX_AVATAR_BYTES } from "@/lib/avatar";
import { formatPhone, normalizePhone } from "@/lib/communications";
import type { FormState } from "./auth";

/** Guarda la foto de perfil del usuario actual. El navegador ya la ha recortado y reducido; aquí se valida de nuevo. */
export async function uploadAvatarAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const limit = await rateLimit(`avatar:${user.id}`, 20, 60 * 60 * 1000);
  if (!limit.ok) return { error: "Has cambiado la foto demasiadas veces seguidas. Prueba dentro de un rato." };

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "Elige una foto" };
  if (file.size > MAX_AVATAR_BYTES) return { error: "La foto es demasiado grande" };
  const bytes = new Uint8Array(await file.arrayBuffer());
  // El tipo se deduce de los bytes, no de lo que declare el navegador
  const check = checkAvatar(bytes);
  if ("error" in check) return { error: check.error };
  const { mime } = check;

  const now = new Date();
  await prisma.$transaction([
    prisma.userAvatar.upsert({ where: { userId: user.id }, update: { data: bytes, mime, updatedAt: now }, create: { userId: user.id, data: bytes, mime, updatedAt: now } }),
    prisma.user.update({ where: { id: user.id }, data: { avatarUpdatedAt: now } }),
  ]);
  revalidatePath("/", "layout");
  return { ok: "Foto actualizada" };
}

/** Quita la foto de perfil: vuelve a verse la inicial. */
export async function removeAvatarAction() {
  const user = await requireUser();
  await prisma.$transaction([
    prisma.userAvatar.deleteMany({ where: { userId: user.id } }),
    prisma.user.update({ where: { id: user.id }, data: { avatarUpdatedAt: null } }),
  ]);
  revalidatePath("/", "layout");
}

/** Teléfono para los avisos por WhatsApp (formato internacional; «612 345 678» se entiende como +34). Vacío lo borra. */
export async function updatePhoneAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const raw = String(formData.get("phone") ?? "").trim();
  if (!raw) {
    await prisma.user.update({ where: { id: user.id }, data: { phone: null } });
    revalidatePath("/perfil");
    return { ok: "Teléfono borrado: no recibirás avisos por WhatsApp." };
  }
  const phone = normalizePhone(raw);
  if (!phone) return { error: "Escribe un móvil válido, por ejemplo 612 345 678 o +34 612 345 678." };
  await prisma.user.update({ where: { id: user.id }, data: { phone } });
  revalidatePath("/perfil");
  revalidatePath("/comunicaciones");
  return { ok: `Teléfono guardado: ${formatPhone(phone)}` };
}
