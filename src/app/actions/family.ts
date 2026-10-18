"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { nameText } from "@/lib/validation";
import type { FormState } from "./auth";

const renameSchema = z.object({ name: nameText(60, 2) });

/** Cambia el nombre de la familia (solo el presidente). Se ve en el menú, la liga, los avisos y las invitaciones. */
export async function renameFamilyAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = renameSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const name = parsed.data.name.replace(/\s+/g, " ");
  if (name === admin.family.name) return { ok: "El nombre no ha cambiado" };
  await prisma.family.update({ where: { id: admin.familyId }, data: { name } });
  // El nombre aparece en la barra lateral de todas las páginas
  revalidatePath("/", "layout");
  return { ok: `La familia ahora se llama «${name}»` };
}
