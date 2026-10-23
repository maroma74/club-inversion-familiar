import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { prisma } from "./prisma";
import { isAcceptableSecret, secretProblem } from "./secretPolicy";
import { safeInternalPath } from "./validation";
import { isActionRequest } from "./actionRequest";

// Firebase Hosting solo deja pasar la cookie llamada __session hacia Cloud Run, así que la sesión
// (y el modo «ver como miembro» del presidente) viajan juntos en esa única cookie.
const COOKIE = "__session";
export type ViewAs = "member" | null;

/**
 * Secreto con el que se firman las sesiones. En producción se exige uno propio, largo y con variedad:
 * con un valor por defecto o de ejemplo cualquiera podría firmar sesiones de cualquier usuario.
 * La comprobación se hace al usarlo (y al arrancar, desde instrumentation.ts), no al cargar el módulo,
 * para que `next build` pueda ejecutarse sin el secreto.
 */
function secret() {
  const raw = process.env.AUTH_SECRET?.trim();
  if (process.env.NODE_ENV === "production") {
    const problem = secretProblem(raw);
    if (problem) throw new Error(problem);
  }
  return new TextEncoder().encode(raw || "dev-secret-change-me");
}

/** Para fallar al arrancar (y no en el primer inicio de sesión) si el secreto no es válido. */
export function assertAuthSecret() {
  secret();
}

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

type SessionUser = { id: string; sessionVersion: number };

/**
 * Emite la cookie de sesión. El claim `sv` es la versión de sesión del usuario: al cambiar la contraseña
 * sube en la base de datos y las cookies anteriores dejan de valer aunque no hayan caducado.
 */
export async function createSession(user: SessionUser, viewAs: ViewAs = null, viewAsUserId: string | null = null) {
  // `vu`: el presidente está viendo el club como ese miembro (solo lectura); ver getCurrentUser
  const token = await new SignJWT({ sub: user.id, sv: user.sessionVersion, ...(viewAs ? { viewAs } : {}), ...(viewAsUserId ? { vu: viewAsUserId } : {}) })
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

export async function getSession(): Promise<{ userId: string; viewAs: ViewAs; sessionVersion: number; viewAsUserId: string | null } | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string") return null;
    // Las sesiones emitidas antes de existir el claim cuentan como versión 0 (la inicial de todos los usuarios).
    const sv = typeof payload.sv === "number" ? payload.sv : 0;
    return { userId: payload.sub, viewAs: payload.viewAs === "member" ? "member" : null, sessionVersion: sv, viewAsUserId: typeof payload.vu === "string" ? payload.vu : null };
  } catch {
    return null;
  }
}

export async function getSessionUserId(): Promise<string | null> {
  return (await getSession())?.userId ?? null;
}

/** Invalida todas las sesiones de un usuario (cambio o restablecimiento de contraseña). Devuelve la versión nueva. */
export async function bumpSessionVersion(userId: string): Promise<number> {
  const u = await prisma.user.update({ where: { id: userId }, data: { sessionVersion: { increment: 1 } }, select: { sessionVersion: true } });
  return u.sessionVersion;
}

type DbUser = NonNullable<Awaited<ReturnType<typeof loadUser>>>;
/** `impersonator`: el presidente que está viendo el club como este miembro (la sesión real es la suya). */
export type CurrentUser = DbUser & { realRole: string; previewAsMember: boolean; impersonator: { id: string; name: string } | null };

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
  if (!user || user.sessionVersion !== session.sessionVersion) return null;
  // «Visualizar como»: el presidente ve exactamente lo que ve un miembro de su familia, en solo lectura
  if (session.viewAsUserId && user.role === "ADMIN" && session.viewAsUserId !== user.id) {
    const target = await loadUser(session.viewAsUserId);
    if (target && target.familyId === user.familyId && target.status === "ACTIVE") {
      await blockWritesWhileViewingAs();
      return { ...target, realRole: target.role, previewAsMember: false, impersonator: { id: user.id, name: user.name } };
    }
  }
  const previewAsMember = user.role === "ADMIN" && session.viewAs === "member";
  return { ...user, realRole: user.role, role: previewAsMember ? "MEMBER" : user.role, previewAsMember, impersonator: null };
}

/**
 * Mientras el presidente ve el club como otro miembro, nada se guarda en nombre de ese miembro: cualquier acción
 * de servidor (envío de formulario) se corta aquí y se vuelve a la página con el aviso de solo lectura. Las páginas
 * se pintan con normalidad. Salir de la vista no pasa por aquí (usa la sesión real).
 */
async function blockWritesWhileViewingAs() {
  const h = await headers();
  if (!isActionRequest(h)) return;
  let back = "/inicio";
  try {
    const ref = h.get("referer");
    if (ref) back = new URL(ref).pathname;
  } catch {}
  redirect(`${safeInternalPath(back.split("?")[0])}?solo-lectura=1`);
}

/** El presidente real de la sesión, aunque esté viendo el club como otro miembro (para entrar y salir de esa vista). */
export async function getSessionAdmin() {
  const session = await getSession();
  if (!session) return null;
  const user = await loadUser(session.userId);
  if (!user || user.sessionVersion !== session.sessionVersion || user.role !== "ADMIN" || user.status !== "ACTIVE") return null;
  return user;
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

/**
 * Administración de la web (estadísticas globales y paquetes de invitaciones): solo usuarios con `siteAdmin`,
 * y nunca a través de «Visualizar como» (el presidente no hereda la administración de la web de un miembro).
 */
export async function requireSiteAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.siteAdmin || user.impersonator) redirect("/inicio");
  return user;
}

/** Deja constancia de un acceso con éxito (entrada o registro) para la administración de la web. */
export async function recordLogin(userId: string, ip: string | null) {
  await Promise.all([
    prisma.loginEvent.create({ data: { userId, ip } }),
    prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } }),
  ]);
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
  | { kind: "newFamily"; invitingFamily: string; name: string | null; email: string | null }
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
    if (inv.newFamily) return { kind: "newFamily", invitingFamily: inv.family.name, name: inv.name, email: inv.email };
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

export { isAcceptableSecret };
