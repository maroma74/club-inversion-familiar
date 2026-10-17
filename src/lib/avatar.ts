/** Reglas de la foto de perfil. Módulo puro: lo usan la acción de servidor, la ruta que sirve la imagen y las pruebas. */

/** El navegador reduce la foto a 256×256, así que pesa unas decenas de KB; este tope deja margen. */
export const MAX_AVATAR_BYTES = 150_000;

/** Lado máximo en píxeles: una imagen pequeña en bytes puede declarar un tamaño enorme y agotar la memoria al pintarla. */
export const MAX_AVATAR_SIDE = 2048;

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

/** Ancho y alto declarados en la cabecera de la imagen, o null si no se pueden leer. */
export function imageDimensions(b: Uint8Array, mime: AvatarMime): { width: number; height: number } | null {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (mime === "image/png") {
    if (b.length < 24) return null;
    return { width: dv.getUint32(16), height: dv.getUint32(20) };
  }
  if (mime === "image/jpeg") {
    // Se recorren los segmentos hasta el primer SOF (inicio de frame), que lleva alto y ancho.
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) return null;
      const marker = b[i + 1];
      if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) { i += 2; continue; }
      const len = dv.getUint16(i + 2);
      if (len < 2) return null;
      const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSof) return { height: dv.getUint16(i + 5), width: dv.getUint16(i + 7) };
      i += 2 + len;
    }
    return null;
  }
  // WebP: tras «WEBP» viene el tipo de bloque (VP8 , VP8L o VP8X) con el tamaño en distintos formatos
  if (b.length < 30) return null;
  const chunk = String.fromCharCode(b[12], b[13], b[14], b[15]);
  if (chunk === "VP8 ") return { width: dv.getUint16(26, true) & 0x3fff, height: dv.getUint16(28, true) & 0x3fff };
  if (chunk === "VP8L") {
    const bits = dv.getUint32(21, true);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8X") return { width: (b[24] | (b[25] << 8) | (b[26] << 16)) + 1, height: (b[27] | (b[28] << 8) | (b[29] << 16)) + 1 };
  return null;
}

/** Comprobación completa: formato real, cabecera legible y tamaño en píxeles razonable. */
export function checkAvatar(b: Uint8Array): { mime: AvatarMime } | { error: string } {
  const mime = sniffImageMime(b);
  if (!mime) return { error: "Formato no admitido. Usa una foto JPG, PNG o WebP." };
  const dim = imageDimensions(b, mime);
  if (!dim || dim.width < 1 || dim.height < 1) return { error: "No se pudo leer la imagen. Prueba con otra foto." };
  if (dim.width > MAX_AVATAR_SIDE || dim.height > MAX_AVATAR_SIDE) return { error: `La foto es demasiado grande (máximo ${MAX_AVATAR_SIDE} píxeles de lado)` };
  return { mime };
}
