"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { MAX_AVATAR_BYTES, sniffImageMime } from "@/lib/avatar";
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
  const mime = sniffImageMime(bytes);
  if (!mime) return { error: "Formato no admitido. Usa una foto JPG, PNG o WebP." };

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
