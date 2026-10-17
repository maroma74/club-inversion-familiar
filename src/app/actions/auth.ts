"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkJoinCode, createSession, destroySession, hashPassword, uniqueInviteCode, verifyPassword } from "@/lib/auth";
import { clearAttempts, clientIp, rateLimit } from "@/lib/ratelimit";
import { nameText, newPasswordSchema } from "@/lib/validation";

export type FormState = { error?: string; ok?: string } | undefined;

const emailSchema = z.string().trim().toLowerCase().email("Email no válido").max(120);
const registerSchema = z.object({
  name: nameText(60, 2),
  email: emailSchema,
  password: newPasswordSchema,
  mode: z.enum(["create", "join"]),
  familyName: nameText(60).optional(),
  inviteCode: z.string().trim().toUpperCase().max(20).optional(),
});

/**
 * ¿Se pueden crear familias nuevas desde el registro? Cerrado salvo que ALLOW_FAMILY_SIGNUP sea "true"
 * (en desarrollo lo pone .env.example). Abierto, cualquiera podría crear una familia y ser su presidente.
 */
export async function familySignupAllowed() {
  return process.env.ALLOW_FAMILY_SIGNUP === "true";
}

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const ip = await clientIp();
  const limit = await rateLimit(`register:${ip}`, 10, 60 * 60 * 1000);
  if (!limit.ok) return { error: "Demasiados intentos de registro desde esta conexión. Prueba más tarde." };

  if (await prisma.user.findUnique({ where: { email: d.email } })) {
    return { error: "Ya existe una cuenta con ese email" };
  }

  // O se entra en una familia existente (familyId) o se funda una nueva (newFamilyName), nunca las dos cosas.
  let familyId: string | null = null;
  let newFamilyName: string | null = null;
  let role: string;
  let status = "ACTIVE";
  let invitationCode: string | null = null;
  if (d.mode === "create") {
    if (!(await familySignupAllowed())) return { error: "El registro de familias nuevas está desactivado. Entra con un código de invitación." };
    if (!d.familyName) return { error: "Indica el nombre de la familia" };
    newFamilyName = d.familyName;
    role = "ADMIN";
  } else {
    const check = await checkJoinCode(d.inviteCode ?? "");
    if (check.kind === "invalid") return { error: check.reason };
    if (check.kind === "newFamily") {
      // Invitación de otro club para fundar el tuyo: serás su presidente
      if (!d.familyName) return { error: "Indica el nombre de tu familia" };
      if (check.email && check.email.toLowerCase() !== d.email) return { error: "Esta invitación está ligada a otro email. Regístrate con el email al que se envió." };
      newFamilyName = d.familyName;
      role = "ADMIN";
      invitationCode = d.inviteCode!.trim().toUpperCase();
    } else {
      familyId = check.familyId;
      if (check.kind === "invitation") {
        role = check.role;
        invitationCode = d.inviteCode!.trim().toUpperCase();
        if (check.email && check.email.toLowerCase() !== d.email) return { error: "Esta invitación está ligada a otro email. Regístrate con el email al que se envió." };
      } else {
        role = "MEMBER";
        if (check.joinMode === "CODE_APPROVAL") status = "PENDING";
      }
    }
  }
  const familyCode = newFamilyName ? await uniqueInviteCode() : null;

  const passwordHash = await hashPassword(d.password);
  let userId: string;
  try {
    // Alta y consumo de la invitación en una sola transacción: una invitación solo puede usarse una vez
    // aunque lleguen dos registros a la vez con el mismo código.
    userId = await prisma.$transaction(async (tx) => {
      // La familia nueva se crea en la misma transacción: si el alta del usuario falla, no queda una familia huérfana
      const fid = familyId ?? (await tx.family.create({ data: { name: newFamilyName!, inviteCode: familyCode! } })).id;
      const user = await tx.user.create({ data: { name: d.name, email: d.email, passwordHash, familyId: fid, role, status } });
      if (invitationCode) {
        const r = await tx.invitation.updateMany({
          where: { code: invitationCode, usedAt: null, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
          data: { usedAt: new Date(), usedById: user.id },
        });
        if (r.count !== 1) throw new Error("INVITACION_USADA");
      }
      return user.id;
    });
  } catch (e) {
    if (e instanceof Error && e.message === "INVITACION_USADA") return { error: "Esta invitación ya se ha utilizado o ha caducado" };
    if (typeof e === "object" && e && "code" in e && (e as { code?: string }).code === "P2002") return { error: "Ya existe una cuenta con ese email" };
    throw e;
  }
  await createSession({ id: userId, sessionVersion: 0 });
  redirect(status === "PENDING" ? "/pendiente" : "/inicio");
}

const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, "Indica la contraseña").max(128) });

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Email o contraseña incorrectos" };
  const { email, password } = parsed.data;

  // Fuerza bruta: 8 intentos por email y conexión cada 15 minutos, 40 por conexión por hora y, además,
  // 25 por email cada 15 minutos vengan de donde vengan (frena ataques repartidos entre muchas IP).
  const ip = await clientIp();
  const perAccount = await rateLimit(`login:${ip}:${email}`, 8, 15 * 60 * 1000);
  if (!perAccount.ok) return { error: `Demasiados intentos. Espera ${perAccount.retryMinutes} minutos y vuelve a probar.` };
  const perIp = await rateLimit(`login:${ip}`, 40, 60 * 60 * 1000);
  if (!perIp.ok) return { error: "Demasiados intentos desde esta conexión. Prueba más tarde." };
  const perEmail = await rateLimit(`login:email:${email}`, 25, 15 * 60 * 1000);
  if (!perEmail.ok) return { error: `Demasiados intentos con este email. Espera ${perEmail.retryMinutes} minutos y vuelve a probar.` };

  const user = await prisma.user.findUnique({ where: { email } });
  // Se comprueba siempre un hash para que el tiempo de respuesta no revele si el email existe.
  const hash = user?.passwordHash ?? "$2a$10$CwTycUXWue0Thq9StjUM0uJ8gP0VQ2w7y6yZq7w1hX3Jm4h7z8t0O";
  const valid = await verifyPassword(password, hash);
  if (!user || !valid) return { error: "Email o contraseña incorrectos" };
  await Promise.all([clearAttempts(`login:${ip}:${email}`), clearAttempts(`login:email:${email}`)]);
  await createSession(user);
  redirect("/inicio");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
