import { z } from "zod";

/** Validadores comunes de las acciones de servidor: cotas numéricas, longitudes y formatos. */

export const MAX_MONEY = 1_000_000; // euros por aportación/importe
export const MAX_QUANTITY = 1_000_000_000;
export const MAX_PRICE = 1_000_000_000;

/** Zona horaria del club: las fechas «de hoy» y los meses se deciden en hora de España, no en la del servidor. */
export const CLUB_TZ = "Europe/Madrid";

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

/** Nombres de personas y familias: sin caracteres de control ni saltos de línea (acaban en asuntos de correo y listas). */
export const nameText = (max = 60, min = 0) =>
  z
    .string()
    .trim()
    .min(min, min > 0 ? "Nombre demasiado corto" : undefined)
    .max(max, "Nombre demasiado largo")
    .regex(/^[^\u0000-\u001f\u007f]*$/, "El nombre contiene caracteres no permitidos");

/**
 * Contraseñas nuevas: al menos 10 caracteres y como mucho 72, que es lo que bcrypt tiene en cuenta
 * (más largas se aceptarían en silencio recortadas).
 */
export const newPasswordSchema = z.string().min(10, "La contraseña debe tener al menos 10 caracteres").max(72, "La contraseña no puede superar los 72 caracteres");

/** Mes AAAA-MM con mes real (01–12) y año razonable. */
export const monthSchema = z.string().regex(/^(20\d{2}|19\d{2})-(0[1-9]|1[0-2])$/, "Mes no válido");

/** Día de hoy (AAAA-MM-DD) en la zona horaria del club. */
export function todayYmd(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: CLUB_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Mes actual (AAAA-MM) en la zona horaria del club. */
export function currentMonthYm(now: Date = new Date()): string {
  return todayYmd(now).slice(0, 7);
}

/** Fecha en formato AAAA-MM-DD, interpretada a mediodía local. */
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida");

/** Fecha de calendario real (rechaza 2026-02-31) interpretada a mediodía local. */
export function parseDay(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3], 12);
  if (isNaN(d.getTime()) || d.getFullYear() !== +m[1] || d.getMonth() !== +m[2] - 1 || d.getDate() !== +m[3]) return null;
  return d;
}

/**
 * Las 23:59 de ese día en hora de España, sea cual sea la zona horaria del servidor (los plazos de las carteras
 * terminan a medianoche de Madrid, también en los días de cambio de hora).
 */
export function clubEndOfDay(ymd: string): Date | null {
  if (!parseDay(ymd)) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, 23, 59);
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: CLUB_TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(guess)).map((p) => [p.type, p.value]));
  const wall = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
  return new Date(guess - (wall - guess));
}

/** Fecha válida, no posterior a hoy (hora de España) y posterior a 1990. */
export function parsePastDay(s: string, now: Date = new Date()): { date: Date } | { error: string } {
  const date = parseDay(s);
  if (!date) return { error: "Fecha no válida" };
  if (s > todayYmd(now)) return { error: "La fecha no puede ser futura" };
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
