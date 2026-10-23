"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, getSession, getSessionAdmin } from "@/lib/auth";
import { safeInternalPath } from "@/lib/validation";

/**
 * El presidente puede ver la app como la ven los miembros (y volver). Solo afecta a su sesión:
 * se reemite la cookie de sesión con o sin el modo «ver como miembro». Siempre a partir de la sesión real:
 * nunca se emite una sesión para el miembro que se esté visualizando.
 */
export async function setViewAsAction(formData: FormData) {
  const back = safeInternalPath(formData.get("back"));
  const session = await getSession();
  if (!session || session.viewAsUserId) redirect(back);
  const admin = await getSessionAdmin();
  if (!admin) redirect(back);
  const mode = String(formData.get("mode") ?? "");
  await createSession(admin, mode === "member" ? "member" : null);
  redirect(back);
}

/**
 * «Visualizar como»: el presidente pasa a ver el club exactamente como un miembro concreto de su familia
 * (su Inicio, su cartera, sus operaciones), en solo lectura. Usa la sesión real del presidente.
 */
export async function startViewAsMemberAction(formData: FormData) {
  const admin = await getSessionAdmin();
  if (!admin) redirect("/inicio");
  const target = await prisma.user.findFirst({ where: { AND: [{ id: String(formData.get("userId") ?? "") }, { id: { not: admin.id } }], familyId: admin.familyId, status: "ACTIVE" }, select: { id: true } });
  if (!target) redirect("/familia");
  await createSession(admin, null, target.id);
  redirect("/inicio");
}

/** Vuelve a la vista propia del presidente; si venía de la ficha del miembro, regresa a ella. */
export async function stopViewAsMemberAction(formData: FormData) {
  const admin = await getSessionAdmin();
  if (!admin) redirect("/login");
  await createSession(admin, null, null);
  redirect(safeInternalPath(formData.get("back"), "/familia"));
}
