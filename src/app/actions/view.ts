"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

const VIEW_AS_COOKIE = "ff_view_as";

/** El presidente puede ver la app como la ven los miembros (y volver). Solo afecta a su sesión. */
export async function setViewAsAction(formData: FormData) {
  const user = await getCurrentUser();
  const mode = String(formData.get("mode") ?? "");
  const back = String(formData.get("back") ?? "/inicio");
  const store = await cookies();
  if (user?.realRole === "ADMIN" && mode === "member") {
    store.set(VIEW_AS_COOKIE, "member", { httpOnly: true, sameSite: "lax", path: "/" });
  } else {
    store.delete(VIEW_AS_COOKIE);
  }
  redirect(back.startsWith("/") ? back : "/inicio");
}
