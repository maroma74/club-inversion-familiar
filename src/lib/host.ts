/**
 * ¿La petición llega por la URL directa de Cloud Run (*.run.app) en vez de por el dominio del club?
 * Firebase Hosting reenvía la petición a Cloud Run con el dominio original en x-forwarded-host,
 * así que ese manda; sin él, vale la cabecera Host.
 */
export function isDirectRunHost(headers: { get(name: string): string | null }): boolean {
  const raw = headers.get("x-forwarded-host") ?? headers.get("host") ?? "";
  const host = raw.split(",")[0].trim().toLowerCase().replace(/:\d+$/, "");
  return host.endsWith(".run.app");
}
