"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

/** Destinos permitidos al terminar la bienvenida (nunca una URL arbitraria que llegue del formulario). */
const DESTINATIONS = new Set(["/inicio", "/cartera", "/academia", "/perfil"]);

/** Marca la bienvenida como vista (al terminarla o al saltarla) y lleva al destino elegido. */
export async function finishWelcomeAction(formData: FormData) {
  const user = await requireUser();
  const raw = String(formData.get("to") ?? "/inicio");
  // Las lecciones de la Academia también valen: /academia/<curso>/<leccion>
  const to = DESTINATIONS.has(raw) || /^\/academia\/[a-z0-9-]{1,80}\/[a-z0-9-]{1,80}$/.test(raw) ? raw : "/inicio";
  if (!user.welcomedAt) await prisma.user.update({ where: { id: user.id }, data: { welcomedAt: new Date() } });
  revalidatePath("/inicio");
  redirect(to);
}
