"use server";

import { redirect } from "next/navigation";
import { createSession, getCurrentUser } from "@/lib/auth";
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
