"use server";

import { createHash, randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { bumpSessionVersion, createSession, hashPassword, requireAdmin, requireUser, verifyPassword } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { newPasswordSchema } from "@/lib/validation";
import { appUrl } from "@/lib/appUrl";
import { passwordResetEmail, sendEmail } from "@/lib/email";
import { firstName } from "@/lib/names";
import { logError } from "@/lib/log";
import type { FormState } from "./auth";

const RESET_TTL_MS = 60 * 60 * 1000; // el enlace vale una hora
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

const changeSchema = z.object({ current: z.string().min(1, "Indica tu contraseña actual").max(128), password: newPasswordSchema, confirm: z.string() });

/** El propio usuario cambia su contraseña. Cierra sus demás sesiones y mantiene abierta la de este dispositivo. */
export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (user.impersonator) return { error: "Mientras visualizas como otro miembro no se puede cambiar la contraseña." };
  const limit = await rateLimit(`pwchange:${user.id}`, 10, 60 * 60 * 1000);
  if (!limit.ok) return { error: "Demasiados intentos. Prueba dentro de un rato." };
  const parsed = changeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (d.password !== d.confirm) return { error: "La contraseña nueva y su repetición no coinciden" };
  if (d.password === d.current) return { error: "La contraseña nueva debe ser distinta de la actual" };
  if (!(await verifyPassword(d.current, user.passwordHash))) return { error: "La contraseña actual no es correcta" };
  const passwordHash = await hashPassword(d.password);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  const sessionVersion = await bumpSessionVersion(user.id);
  await createSession({ id: user.id, sessionVersion }, user.previewAsMember ? "member" : null);
  return { ok: "Contraseña cambiada. Si tenías la sesión abierta en otros dispositivos, tendrán que volver a entrar." };
}

/**
 * El presidente genera un enlace de un solo uso (una hora) para que un miembro de su familia fije una contraseña nueva.
 * Solo para miembros (no para otros presidentes ni para quien administra la web: el enlace da acceso a la cuenta).
 * El enlace se envía por correo al miembro; si el correo no sale, se devuelve para que el presidente se lo pase en mano.
 */
export async function createPasswordResetAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const limit = await rateLimit(`pwreset-issue:${admin.id}`, 10, 60 * 60 * 1000);
  if (!limit.ok) return { error: "Has generado muchos enlaces seguidos. Prueba dentro de un rato." };
  const userId = String(formData.get("userId") ?? "");
  const member = await prisma.user.findFirst({ where: { AND: [{ id: userId }, { id: { not: admin.id } }], familyId: admin.familyId, role: "MEMBER", siteAdmin: false }, select: { id: true, name: true, email: true } });
  if (!member) return { error: "Solo puedes generar enlaces para los miembros de tu club. Otro presidente o quien administra la web cambia su contraseña desde su perfil." };

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);
  await prisma.$transaction([
    // Un enlace vigente por miembro: los anteriores sin usar quedan anulados
    prisma.passwordReset.updateMany({ where: { userId: member.id, usedAt: null }, data: { usedAt: new Date() } }),
    prisma.passwordReset.create({ data: { userId: member.id, tokenHash: hashToken(token), expiresAt, createdById: admin.id } }),
  ]);
  const link = `${appUrl()}/restablecer/${token}`;
  const mail = await sendEmail(passwordResetEmail({ to: member.email, name: firstName(member.name), presidentName: firstName(admin.name), link }));
  if (!mail.sent) logError("password.reset-mail", new Error(mail.error), { userId: member.id });
  revalidatePath("/invitaciones");
  // El enlace solo se devuelve si el correo no ha salido: así el presidente no se queda con un acceso a la cuenta
  return { ok: mail.sent ? `Enlace enviado a ${member.email}. Válido una hora y para un solo uso.` : `No se pudo enviar el correo. Pásale tú este enlace, válido una hora y para un solo uso: ${link}` };
}

const resetSchema = z.object({ token: z.string().min(20).max(200), password: newPasswordSchema, confirm: z.string() });

/** Estado de un enlace de restablecimiento (para la página pública): a quién pertenece o por qué no vale. */
export async function resetLinkStatus(token: string): Promise<{ ok: true; name: string } | { ok: false }> {
  if (!token || token.length < 20 || token.length > 200) return { ok: false };
  const r = await prisma.passwordReset.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: { select: { name: true } } } });
  if (!r || r.usedAt || r.expiresAt.getTime() < Date.now()) return { ok: false };
  return { ok: true, name: firstName(r.user.name) };
}

/** El miembro fija su contraseña nueva con el enlace; se cierran todas sus sesiones y se abre una en este dispositivo. */
export async function resetPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const ip = await clientIp();
  const limit = await rateLimit(`pwreset:${ip}`, 10, 60 * 60 * 1000);
  if (!limit.ok) return { error: "Demasiados intentos desde esta conexión. Prueba más tarde." };
  const parsed = resetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (d.password !== d.confirm) return { error: "La contraseña y su repetición no coinciden" };

  const passwordHash = await hashPassword(d.password);
  // Consumir el enlace y cambiar la contraseña en una sola transacción; el updateMany condicionado impide usarlo dos veces.
  const result = await prisma.$transaction(async (tx) => {
    const r = await tx.passwordReset.findUnique({ where: { tokenHash: hashToken(d.token) } });
    if (!r || r.usedAt || r.expiresAt.getTime() < Date.now()) return null;
    const used = await tx.passwordReset.updateMany({ where: { id: r.id, usedAt: null }, data: { usedAt: new Date() } });
    if (used.count !== 1) return null;
    const u = await tx.user.update({ where: { id: r.userId }, data: { passwordHash, sessionVersion: { increment: 1 } }, select: { id: true, sessionVersion: true, status: true } });
    return u;
  });
  if (!result) return { error: "Este enlace no es válido, ya se ha usado o ha caducado. Pide otro al presidente del club." };
  await createSession({ id: result.id, sessionVersion: result.sessionVersion });
  redirect(result.status === "PENDING" ? "/pendiente" : "/inicio");
}
