import { z } from "zod";

/** Validadores comunes de las acciones de servidor: cotas numéricas, longitudes y formatos. */

export const MAX_MONEY = 1_000_000; // euros por aportación/importe
export const MAX_QUANTITY = 1_000_000_000;
export const MAX_PRICE = 1_000_000_000;

/** Símbolos de mercado (AAPL, SAN.MC, VWCE.DE, BTC-EUR, ^GSPC, EURUSD=X). */
export const symbolSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(1, "Indica el símbolo (p. ej. AAPL, SAN.MC, VWCE.DE)")
  .max(20, "Símbolo demasiado largo")
  .regex(/^[A-Z0-9.^=\-]+$/, "Símbolo no válido: solo letras, números, punto y guion");

export const num = (msg: string) => z.coerce.number({ message: msg });

export const shortText = (max = 120) => z.string().trim().max(max, `Texto demasiado largo (máximo ${max} caracteres)`);
export const longText = (max = 4000) => z.string().trim().max(max, `Texto demasiado largo (máximo ${max} caracteres)`);

/** Fecha en formato AAAA-MM-DD, interpretada a mediodía local. */
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida");

export function parseDay(s: string): Date | null {
  const d = new Date(s + "T12:00:00");
  return isNaN(d.getTime()) ? null : d;
}

/** Fecha válida, no futura y posterior a 1990. */
export function parsePastDay(s: string): { date: Date } | { error: string } {
  const date = parseDay(s);
  if (!date) return { error: "Fecha no válida" };
  if (date.getTime() > Date.now()) return { error: "La fecha no puede ser futura" };
  if (date.getFullYear() < 1990) return { error: "Fecha demasiado antigua" };
  return { date };
}

/** Importe en euros escrito con coma o punto, acotado y distinto de cero. */
export function parseMoney(raw: unknown, opts: { allowZero?: boolean; allowNegative?: boolean } = {}): number | null {
  const n = Number(String(raw ?? "").trim().replace(",", "."));
  if (!Number.isFinite(n)) return null;
  if (Math.abs(n) > MAX_MONEY) return null;
  if (!opts.allowZero && n === 0) return null;
  if (!opts.allowNegative && n < 0) return null;
  return Math.round(n * 100) / 100;
}

/** Solo rutas internas: evita redirecciones abiertas (`//evil.com`, `/\evil.com`, `javascript:`). */
export function safeInternalPath(p: unknown, fallback = "/inicio") {
  const s = String(p ?? "");
  return /^\/(?![\/\\])[A-Za-z0-9\-._~\/?=&#%]*$/.test(s) ? s : fallback;
}

/** Solo enlaces http(s) absolutos en `href` de datos externos (noticias, webs de empresas). */
export function safeHref(u: string | null | undefined): string | undefined {
  return u && /^https?:\/\/[^\s]+$/i.test(u) && u.length < 2048 ? u : undefined;
}
