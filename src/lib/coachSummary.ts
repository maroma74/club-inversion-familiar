/**
 * Trocea la respuesta del tutor en texto normal y en las piezas del resumen final (<resumen>, y también <porque>,
 * <vender> e <idea>), para mostrarlas aparte con su botón de copiar. Funciona también con la respuesta a medio llegar.
 */
export const COACH_MAX_MESSAGES = 40;
export const COACH_MAX_USER_CHARS = 1500;
/** Primer mensaje (lo «escribe» el miembro al pulsar el botón): arranca la conversación. */
export const COACH_OPENING = "Hola, ¿me ayudas a decidir mi cartera de este mes?";

export type CoachPiece =
  | { type: "text"; text: string }
  | { type: "porque" | "vender"; symbol: string; text: string; done: boolean }
  | { type: "idea" | "resumen"; text: string; done: boolean };

const TAG = /<(porque|vender)\s+valor="([^"<>]{1,24})"\s*>([\s\S]*?)(?:<\/\1>|$)|<(idea|resumen)>([\s\S]*?)(?:<\/\4>|$)/g;
// Una etiqueta que todavía se está escribiendo al final del texto (p. ej. «<resu» o «<porque valor="AB»)
const PARTIAL_TAG = /<(?:p(?:o(?:r(?:q(?:u(?:e[^>]*)?)?)?)?)?|v(?:e(?:n(?:d(?:e(?:r[^>]*)?)?)?)?)?|i(?:d(?:e(?:a)?)?)?|r(?:e(?:s(?:u(?:m(?:e(?:n)?)?)?)?)?)?)?$/;

export function parseCoachReply(raw: string): CoachPiece[] {
  const pieces: CoachPiece[] = [];
  const pushText = (t: string) => {
    if (t.trim()) pieces.push({ type: "text", text: t.trim() });
  };
  let last = 0;
  for (const m of raw.matchAll(TAG)) {
    pushText(raw.slice(last, m.index));
    const done = m[0].endsWith(`</${m[1] ?? m[4]}>`);
    if (m[1]) pieces.push({ type: m[1] as "porque" | "vender", symbol: m[2].trim(), text: m[3].trim(), done });
    else pieces.push({ type: m[4] as "idea" | "resumen", text: (m[5] ?? "").trim(), done });
    last = m.index + m[0].length;
  }
  pushText(raw.slice(last).replace(PARTIAL_TAG, ""));
  return pieces;
}

/** ¿La respuesta trae ya el resumen para copiar? */
export const hasSummary = (raw: string) => parseCoachReply(raw).some((p) => p.type !== "text");
