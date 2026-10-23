/**
 * ¿Esta petición ejecuta una acción de servidor (una escritura)? Next.js las despacha de dos formas: con la cabecera
 * `next-action` (formularios con JavaScript) o como un POST normal de formulario sin JavaScript, con el identificador
 * de la acción dentro del cuerpo. Las páginas se piden por GET y no llevan cuerpo de formulario, así que ambas
 * señales distinguen una escritura de una lectura sin depender de que el navegador tenga JavaScript.
 */
export function isActionRequest(h: { get(name: string): string | null }): boolean {
  if (h.get("next-action")) return true;
  const type = (h.get("content-type") ?? "").toLowerCase();
  return type.startsWith("multipart/form-data") || type.startsWith("application/x-www-form-urlencoded");
}
