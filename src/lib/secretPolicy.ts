/**
 * Regla del secreto de sesión, sin dependencias de Node para poder evaluarla también al arrancar
 * (instrumentation.ts se compila para todos los runtimes).
 */

/** Valores de ejemplo o evidentes que no sirven como secreto aunque sean largos. */
export const PLACEHOLDER_SECRET = /cambia|change|ejemplo|example|pon-aq|secret|password|contrase|aleatori|random/i;

/** Al menos 32 caracteres, con variedad y sin parecer un valor de ejemplo. */
export function isAcceptableSecret(raw: string): boolean {
  return raw.length >= 32 && !PLACEHOLDER_SECRET.test(raw) && new Set(raw).size >= 12;
}

/** Mensaje de error para un secreto inválido en producción, o null si vale. */
export function secretProblem(raw: string | undefined): string | null {
  const s = raw?.trim() ?? "";
  if (s.length < 32) return "AUTH_SECRET no definido o demasiado corto (mínimo 32 caracteres)";
  if (!isAcceptableSecret(s)) return "AUTH_SECRET parece un valor de ejemplo: genera uno aleatorio (p. ej. `openssl rand -base64 48`)";
  return null;
}
