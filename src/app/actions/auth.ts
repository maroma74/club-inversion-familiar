"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkJoinCode, createSession, destroySession, hashPassword, uniqueInviteCode, verifyPassword } from "@/lib/auth";
import { clearAttempts, clientIp, rateLimit } from "@/lib/ratelimit";

export type FormState = { error?: string; ok?: string } | undefined;

const emailSchema = z.string().trim().toLowerCase().email("Email no válido").max(120);
const passwordSchema = z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(128, "Contraseña demasiado larga");

const registerSchema = z.object({
  name: z.string().trim().min(2, "Nombre demasiado corto").max(60, "Nombre demasiado largo"),
  email: emailSchema,
  password: passwordSchema,
  mode: z.enum(["create", "join"]),
  familyName: z.string().trim().max(60, "Nombre de familia demasiado largo").optional(),
  inviteCode: z.string().trim().toUpperCase().max(20).optional(),
});

/** ¿Se pueden crear familias nuevas desde el registro? (ALLOW_FAMILY_SIGNUP=false lo desactiva en producción) */
export async function familySignupAllowed() {
  return process.env.ALLOW_FAMILY_SIGNUP !== "false";
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

  let familyId: string;
  let role: string;
  let status = "ACTIVE";
  let invitationCode: string | null = null;
  if (d.mode === "create") {
    if (!(await familySignupAllowed())) return { error: "El registro de familias nuevas está desactivado. Entra con un código de invitación." };
    if (!d.familyName) return { error: "Indica el nombre de la familia" };
    const family = await prisma.family.create({ data: { name: d.familyName, inviteCode: await uniqueInviteCode() } });
    familyId = family.id;
    role = "ADMIN";
  } else {
    const check = await checkJoinCode(d.inviteCode ?? "");
    if (check.kind === "invalid") return { error: check.reason };
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

  const passwordHash = await hashPassword(d.password);
  let userId: string;
  try {
    // Alta y consumo de la invitación en una sola transacción: una invitación solo puede usarse una vez
    // aunque lleguen dos registros a la vez con el mismo código.
    userId = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { name: d.name, email: d.email, passwordHash, familyId, role, status } });
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
  await createSession(userId);
  redirect(status === "PENDING" ? "/pendiente" : "/inicio");
}

const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, "Indica la contraseña").max(128) });

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Email o contraseña incorrectos" };
  const { email, password } = parsed.data;

  // Fuerza bruta: 8 intentos por email y conexión cada 15 minutos, 40 por conexión por hora.
  const ip = await clientIp();
  const perAccount = await rateLimit(`login:${ip}:${email}`, 8, 15 * 60 * 1000);
  if (!perAccount.ok) return { error: `Demasiados intentos. Espera ${perAccount.retryMinutes} minutos y vuelve a probar.` };
  const perIp = await rateLimit(`login:${ip}`, 40, 60 * 60 * 1000);
  if (!perIp.ok) return { error: "Demasiados intentos desde esta conexión. Prueba más tarde." };

  const user = await prisma.user.findUnique({ where: { email } });
  // Se comprueba siempre un hash para que el tiempo de respuesta no revele si el email existe.
  const hash = user?.passwordHash ?? "$2a$10$CwTycUXWue0Thq9StjUM0uJ8gP0VQ2w7y6yZq7w1hX3Jm4h7z8t0O";
  const valid = await verifyPassword(password, hash);
  if (!user || !valid) return { error: "Email o contraseña incorrectos" };
  await clearAttempts(`login:${ip}:${email}`);
  await createSession(user.id);
  redirect("/inicio");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
