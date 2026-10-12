import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const COOKIE = "ff_session";
const secret = () =>
  new TextEncoder().encode(process.env.AUTH_SECRET ?? "dev-secret-change-me");

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const id = await getSessionUserId();
  if (!id) return null;
  return prisma.user.findUnique({
    where: { id },
    include: { family: true },
  });
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.status !== "ACTIVE") redirect("/pendiente");
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/inicio");
  return user;
}

/** Código único de 8 caracteres que no choca con códigos de familia ni de invitación. */
export async function uniqueInviteCode() {
  for (let i = 0; i < 20; i++) {
    const code = generateInviteCode();
    const [f, inv] = await Promise.all([prisma.family.findUnique({ where: { inviteCode: code } }), prisma.invitation.findUnique({ where: { code } })]);
    if (!f && !inv) return code;
  }
  throw new Error("No se pudo generar un código único");
}

export type InvitationCheck =
  | { kind: "invitation"; familyId: string; familyName: string; role: string; name: string | null; email: string | null }
  | { kind: "family"; familyId: string; familyName: string; joinMode: string }
  | { kind: "invalid"; reason: string };

/** Comprueba un código escrito en el registro: invitación personal o código general de la familia. */
export async function checkJoinCode(raw: string): Promise<InvitationCheck> {
  const code = raw.trim().toUpperCase();
  if (!code) return { kind: "invalid", reason: "Indica el código de invitación" };
  const inv = await prisma.invitation.findUnique({ where: { code }, include: { family: true } });
  if (inv) {
    if (inv.revokedAt) return { kind: "invalid", reason: "Esta invitación ha sido anulada" };
    if (inv.usedAt) return { kind: "invalid", reason: "Esta invitación ya se ha utilizado" };
    if (inv.expiresAt && inv.expiresAt.getTime() < Date.now()) return { kind: "invalid", reason: "Esta invitación ha caducado" };
    return { kind: "invitation", familyId: inv.familyId, familyName: inv.family.name, role: inv.role, name: inv.name, email: inv.email };
  }
  const family = await prisma.family.findUnique({ where: { inviteCode: code } });
  if (!family) return { kind: "invalid", reason: "Código de invitación no válido" };
  if (family.joinMode === "INVITE_ONLY") return { kind: "invalid", reason: "Esta familia solo admite entradas con invitación personal. Pide al presidente del club que te envíe una." };
  return { kind: "family", familyId: family.id, familyName: family.name, joinMode: family.joinMode };
}

export function generateInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}
