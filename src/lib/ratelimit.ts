import "server-only";
import { headers } from "next/headers";
import { prisma } from "./prisma";
import { isDirectRunHost } from "./host";

/**
 * Limitador de intentos persistido en la base de datos (Cloud Run puede tener varias instancias,
 * así que un contador en memoria no sirve). Cada intento se anota con una clave (p. ej. `login:ip:email`)
 * y se bloquea cuando en la ventana hay más intentos de los permitidos.
 */

/**
 * Cuántos proxies de confianza hay delante de la app. Cada uno añade AL FINAL de `x-forwarded-for` la IP
 * de quien le habló; todo lo que haya antes lo puede escribir el propio cliente, así que no vale fiarse
 * del primer valor. En Cloud Run el frontal de Google añade uno; por el dominio del club, Firebase Hosting
 * añade otro delante. `TRUSTED_PROXY_HOPS` permite fijar el número a mano si cambia la topología.
 */
function trustedHops(h: { get(name: string): string | null }): number {
  const env = Number(process.env.TRUSTED_PROXY_HOPS);
  if (Number.isInteger(env) && env >= 1) return env;
  if (!process.env.K_SERVICE) return 1; // fuera de Cloud Run (local, Docker): el último salto es el cliente o el proxy local
  return isDirectRunHost(h) ? 1 : 2;
}

/** IP del cliente tomada del salto que añadió el último proxy de confianza, no de lo que el cliente declare. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const chain = (h.get("x-forwarded-for") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const ip = chain.length ? chain[Math.max(0, chain.length - trustedHops(h))] : (h.get("x-real-ip") ?? "desconocida");
  return ip.slice(0, 64);
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
