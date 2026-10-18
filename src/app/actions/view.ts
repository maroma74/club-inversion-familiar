"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, getCurrentUser, getSessionAdmin } from "@/lib/auth";
import { safeInternalPath } from "@/lib/validation";

/**
 * El presidente puede ver la app como la ven los miembros (y volver). Solo afecta a su sesión:
 * se reemite la cookie de sesión con o sin el modo «ver como miembro».
 */
export async function setViewAsAction(formData: FormData) {
  const user = await getCurrentUser();
  const mode = String(formData.get("mode") ?? "");
  if (user) await createSession(user, user.realRole === "ADMIN" && mode === "member" ? "member" : null);
  redirect(safeInternalPath(formData.get("back")));
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
