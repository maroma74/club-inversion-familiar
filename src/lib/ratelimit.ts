import "server-only";
import { headers } from "next/headers";
import { prisma } from "./prisma";

/**
 * Limitador de intentos persistido en la base de datos (Cloud Run puede tener varias instancias,
 * así que un contador en memoria no sirve). Cada intento se anota con una clave (p. ej. `login:ip:email`)
 * y se bloquea cuando en la ventana hay más intentos de los permitidos.
 */

export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  const ip = (fwd ? fwd.split(",")[0] : h.get("x-real-ip")) ?? "desconocida";
  return ip.trim().slice(0, 64);
}

export async function rateLimit(key: string, max: number, windowMs: number): Promise<{ ok: true } | { ok: false; retryMinutes: number }> {
  const since = new Date(Date.now() - windowMs);
  const count = await prisma.authAttempt.count({ where: { key, at: { gt: since } } });
  if (count >= max) return { ok: false, retryMinutes: Math.max(1, Math.ceil(windowMs / 60000)) };
  await prisma.authAttempt.create({ data: { key } });
  // Limpieza ocasional de intentos antiguos (sin bloquear la petición)
  if (Math.random() < 0.05) prisma.authAttempt.deleteMany({ where: { at: { lt: new Date(Date.now() - 24 * 3600 * 1000) } } }).catch(() => {});
  return { ok: true };
}

/** Tras un acceso correcto se olvidan los intentos fallidos de esa clave. */
export async function clearAttempts(key: string) {
  await prisma.authAttempt.deleteMany({ where: { key } }).catch(() => {});
}
