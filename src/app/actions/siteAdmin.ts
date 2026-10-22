"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSiteAdmin } from "@/lib/auth";
import { checkAiConnection, resetCoachPrompt, setAiModel, setCoachPrompt } from "@/lib/ai";
import { COACH_PLACEHOLDERS, COACH_PROMPT_MAX, DEFAULT_COACH_PROMPT } from "@/lib/decisionCoach";
import { aiModelName, isAiModel } from "@/lib/aiModels";
import type { FormState } from "./auth";

/* Administración de la web: paquetes de invitaciones para familias y administradores del sitio. */

const packSchema = z.object({
  userId: z.string().min(1),
  pack: z.coerce.number().int().min(0).max(1000),
  unlimited: z.coerce.boolean().default(false),
  siteAdmin: z.coerce.boolean().default(false),
});

/** Fija el paquete de invitaciones de un usuario (de cualquier familia), si no tiene límite y si administra la web. */
export async function setInvitePackAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await requireSiteAdmin();
  const parsed = packSchema.safeParse({
    userId: formData.get("userId"),
    pack: formData.get("pack"),
    unlimited: formData.get("unlimited") === "on",
    siteAdmin: formData.get("siteAdmin") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const target = await prisma.user.findUnique({ where: { id: d.userId }, select: { id: true, name: true, siteAdmin: true } });
  if (!target) return { error: "Usuario no encontrado" };
  // Nadie se quita a sí mismo la administración: siempre queda al menos quien está cambiando esto.
  const siteAdmin = target.id === me.id ? true : d.siteAdmin;
  await prisma.user.update({ where: { id: target.id }, data: { familyInvitePack: d.pack, unlimitedFamilyInvites: d.unlimited, siteAdmin } });
  revalidatePath("/admin");
  revalidatePath("/invitar");
  revalidatePath("/invitaciones");
  return { ok: `${target.name}: ${d.unlimited ? "invitaciones sin límite" : `paquete de ${d.pack}`}${siteAdmin ? " · administra la web" : ""}` };
}

/** Prueba la clave de Claude desde el servidor (sin gastar tokens): dice si es válida y qué modelo se usará. */
export async function checkAiAction(): Promise<FormState> {
  await requireSiteAdmin();
  const res = await checkAiConnection();
  return res.ok ? { ok: `Conectado: la clave es válida y los análisis usarán ${res.model}.` } : { error: res.error };
}

/** Elige el modelo de Claude que usan los análisis con IA de toda la web. */
export async function setAiModelAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await requireSiteAdmin();
  const model = formData.get("model");
  if (!isAiModel(model)) return { error: "Elige uno de los modelos de la lista." };
  await setAiModel(model, me.id);
  revalidatePath("/admin");
  return { ok: `Guardado: los análisis usarán ${aiModelName(model)}.` };
}

/** Guarda el prompt de TutorIA o vuelve al de por defecto. Avisa si falta alguna variable importante. */
export async function saveCoachPromptAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await requireSiteAdmin();
  if (formData.get("intent") === "reset") {
    await resetCoachPrompt();
    revalidatePath("/admin");
    return { ok: "Restaurado: TutorIA vuelve a usar el prompt de por defecto." };
  }
  const text = String(formData.get("prompt") ?? "").replace(/\r\n/g, "\n").trim();
  if (text.length < 50) return { error: "El prompt es demasiado corto: explica al tutor qué papel tiene y cómo debe conversar." };
  if (text.length > COACH_PROMPT_MAX) return { error: `El prompt es demasiado largo: como máximo ${COACH_PROMPT_MAX.toLocaleString("es-ES")} caracteres.` };
  if (text === DEFAULT_COACH_PROMPT.trim()) await resetCoachPrompt();
  else await setCoachPrompt(text, me.id);
  revalidatePath("/admin");
  const uses = (key: string) => new RegExp(String.raw`\{\{\s*${key}\s*\}\}`).test(text);
  const notes = [
    ...(!uses("NOMBRE_USUARIO") ? ["no usa {{NOMBRE_USUARIO}}, así que el tutor no sabrá cómo se llama"] : []),
    ...COACH_PLACEHOLDERS.filter((p) => (p.key === "CARTERA_DEL_MES" || p.key === "REGLAS_MES") && !uses(p.key)).map((p) => `no usa {{${p.key}}}: esos datos se añaden al final`),
  ];
  return { ok: notes.length ? `Guardado. Ojo: ${notes.join("; ")}.` : "Guardado: TutorIA usará este prompt desde el próximo mensaje." };
}
