/**
 * URL pública de la app para construir enlaces que salen por correo o se copian.
 * Se fija por configuración (APP_URL) y no a partir de cabeceras de la petición, que puede manipular un proxy.
 * En desarrollo, si no hay APP_URL, se usa localhost con el puerto del servidor.
 */
export function appUrl(): string {
  const configured = process.env.APP_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") return "https://clubdeinversionfamiliar.com";
  return `http://localhost:${process.env.PORT ?? "3000"}`;
}
