/** Reglas de la foto de perfil. Módulo puro: lo usan la acción de servidor, la ruta que sirve la imagen y las pruebas. */

/** El navegador reduce la foto a 256×256, así que pesa unas decenas de KB; este tope deja margen. */
export const MAX_AVATAR_BYTES = 150_000;

export type AvatarMime = "image/jpeg" | "image/png" | "image/webp";

/**
 * Tipo real de la imagen según sus primeros bytes, ignorando lo que declare el navegador.
 * Solo JPEG, PNG y WebP: nada de SVG (puede llevar scripts) ni formatos exóticos.
 */
export function sniffImageMime(b: Uint8Array): AvatarMime | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "image/png";
  // WebP: «RIFF» + tamaño de 4 bytes + «WEBP»
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  return null;
}
