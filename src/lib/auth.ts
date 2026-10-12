import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { prisma } from "./prisma";

// Firebase Hosting solo deja pasar la cookie llamada __session hacia Cloud Run, así que la sesión
// (y el modo «ver como miembro» del presidente) viajan juntos en esa única cookie.
const COOKIE = "__session";
export type ViewAs = "member" | null;
// En producción no se firma ni se verifica ninguna sesión sin un secreto propio y suficientemente largo:
// con el valor por defecto cualquiera podría firmar sesiones de cualquier usuario. La comprobación se hace
// en el primer uso (no al cargar el módulo) para que `next build` pueda ejecutarse sin el secreto.
function secret() {
  const raw = process.env.AUTH_SECRET?.trim();
  if (process.env.NODE_ENV === "production" && (!raw || raw.length < 32)) {
    throw new Error("AUTH_SECRET no definido o demasiado corto (mínimo 32 caracteres)");
  }
  return new TextEncoder().encode(raw || "dev-secret-change-me");
}

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function createSession(userId: string, viewAs: ViewAs = null) {
  const token = await new SignJWT(viewAs ? { sub: userId, viewAs } : { sub: userId })
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

export async function getSession(): Promise<{ userId: string; viewAs: ViewAs } | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string") return null;
    return { userId: payload.sub, viewAs: payload.viewAs === "member" ? "member" : null };
  } catch {
    return null;
  }
}

export async function getSessionUserId(): Promise<string | null> {
  return (await getSession())?.userId ?? null;
}

type DbUser = NonNullable<Awaited<ReturnType<typeof loadUser>>>;
export type CurrentUser = DbUser & { realRole: string; previewAsMember: boolean };

async function loadUser(id: string) {
  return prisma.user.findUnique({ where: { id }, include: { family: true } });
}

/**
 * Usuario de la sesión. Si el presidente ha activado «ver como miembro» (claim viewAs de la sesión),
 * `role` pasa a MEMBER para toda la interfaz y `realRole` conserva ADMIN.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSession();
  if (!session) return null;
  const user = await loadUser(session.userId);
  if (!user) return null;
  const previewAsMember = user.role === "ADMIN" && session.viewAs === "member";
  return { ...user, realRole: user.role, role: previewAsMember ? "MEMBER" : user.role, previewAsMember };
}

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
  for (let i = 0; i < 8; i++) out += alphabet[randomInt(alphabet.length)]; // CSPRNG: los códigos dan acceso a la familia
  return out;
}
