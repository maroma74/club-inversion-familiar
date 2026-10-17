import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { boundedSet } from "./cache";
import { logError } from "./log";

/**
 * Caché de dos niveles para proveedores externos: memoria de la instancia y tabla ApiCache en la base de datos.
 * Si el proveedor falla se sirve lo último guardado aunque haya caducado; si nunca hubo datos, null.
 * Un resultado `null` del proveedor («no tiene este dato») también se guarda, para no insistir cada vez.
 */
const mem = new Map<string, { at: number; data: unknown }>();

export async function cachedJson<T>(key: string, ttlMs: number, fetcher: () => Promise<T | null>): Promise<T | null> {
  const m = mem.get(key);
  if (m && Date.now() - m.at < ttlMs) return m.data as T | null;

  let row: { data: Prisma.JsonValue; fetchedAt: Date } | null = null;
  try {
    row = await prisma.apiCache.findUnique({ where: { key }, select: { data: true, fetchedAt: true } });
  } catch (e) {
    logError("apiCache.read", e, { key });
  }
  if (row && Date.now() - row.fetchedAt.getTime() < ttlMs) {
    boundedSet(mem, key, { at: row.fetchedAt.getTime(), data: row.data }, 500);
    return row.data as T | null;
  }

  try {
    const data = await fetcher();
    const now = new Date();
    boundedSet(mem, key, { at: now.getTime(), data }, 500);
    const stored = data === null ? Prisma.JsonNull : (data as unknown as Prisma.InputJsonValue);
    prisma.apiCache.upsert({ where: { key }, update: { data: stored, fetchedAt: now }, create: { key, data: stored, fetchedAt: now } }).catch((e) => logError("apiCache.write", e, { key }));
    return data;
  } catch (e) {
    logError("apiCache.fetch", e, { key, stale: Boolean(row) });
    return row ? (row.data as T | null) : null;
  }
}
