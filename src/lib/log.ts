/**
 * Registro de errores operativos en una línea JSON por la salida de error. Cloud Logging reconoce el campo
 * `severity` y agrupa estos avisos como errores, así que un fallo del proveedor de precios o del correo se ve
 * en los registros en vez de perderse en un `catch` vacío.
 */
export function logError(scope: string, err: unknown, ctx: Record<string, unknown> = {}) {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error && process.env.NODE_ENV !== "production" ? err.stack : undefined;
  console.error(JSON.stringify({ severity: "ERROR", scope, message, ...ctx, ...(stack ? { stack } : {}) }));
}

export function logWarn(scope: string, message: string, ctx: Record<string, unknown> = {}) {
  console.warn(JSON.stringify({ severity: "WARNING", scope, message, ...ctx }));
}
