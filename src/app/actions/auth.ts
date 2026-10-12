"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkJoinCode, createSession, destroySession, hashPassword, uniqueInviteCode, verifyPassword } from "@/lib/auth";

export type FormState = { error?: string; ok?: string } | undefined;

const registerSchema = z.object({
  name: z.string().trim().min(2, "Nombre demasiado corto"),
  email: z.string().trim().toLowerCase().email("Email no válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  mode: z.enum(["create", "join"]),
  familyName: z.string().trim().optional(),
  inviteCode: z.string().trim().toUpperCase().optional(),
});

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  if (await prisma.user.findUnique({ where: { email: d.email } })) {
    return { error: "Ya existe una cuenta con ese email" };
  }

  let familyId: string;
  let role: string;
  let status = "ACTIVE";
  let invitationCode: string | null = null;
  if (d.mode === "create") {
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
      if (check.email && check.email.toLowerCase() !== d.email) return { error: `Esta invitación es para ${check.email}. Regístrate con ese email.` };
    } else {
      role = "MEMBER";
      if (check.joinMode === "CODE_APPROVAL") status = "PENDING";
    }
  }

  const user = await prisma.user.create({
    data: { name: d.name, email: d.email, passwordHash: await hashPassword(d.password), familyId, role, status },
  });
  if (invitationCode) {
    await prisma.invitation.update({ where: { code: invitationCode }, data: { usedAt: new Date(), usedById: user.id } });
  }
  await createSession(user.id);
  redirect(status === "PENDING" ? "/pendiente" : "/inicio");
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Email o contraseña incorrectos" };
  }
  await createSession(user.id);
  redirect("/inicio");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
