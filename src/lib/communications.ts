/**
 * Comunicaciones por WhatsApp con «clic para chatear»: normalización del teléfono, plantilla del aviso de la
 * cartera del mes y enlace wa.me con el mensaje ya escrito. Módulo puro (sin red ni base de datos) para poder probarlo.
 */

/**
 * Teléfono en formato internacional. Admite «612 345 678» (se asume España, +34), «0034…», «+34 612…».
 * Devuelve null si no parece un móvil válido.
 */
export function normalizePhone(raw: string, defaultCountry = "34"): string | null {
  let s = raw.replace(/[\s().-]/g, "");
  if (!s) return null;
  if (s.startsWith("00")) s = "+" + s.slice(2);
  if (!s.startsWith("+")) s = "+" + defaultCountry + s.replace(/^0+/, "");
  if (!/^\+[1-9]\d{7,14}$/.test(s)) return null;
  return s;
}

/** «+34612345678» → «+34 612 345 678» para enseñarlo. */
export function formatPhone(e164: string): string {
  const m = /^\+34(\d{3})(\d{3})(\d{3})$/.exec(e164);
  return m ? `+34 ${m[1]} ${m[2]} ${m[3]}` : e164;
}

export type MessageVars = {
  nombre: string;
  presidente: string;
  familia: string;
  mes: string; // «octubre de 2026»
  titulo: string;
  importe: string; // «100,00 €»
  opciones: number;
  minimo: number;
  maximo: number;
  plazo: string; // «hasta el 18/10/2026» o «»
  enlace: string;
};

export const MESSAGE_PLACEHOLDERS = ["{nombre}", "{presidente}", "{familia}", "{mes}", "{titulo}", "{importe}", "{opciones}", "{eleccion}", "{plazo}", "{enlace}"] as const;

/** Plantilla por defecto del aviso: motivadora, con los datos de la cartera y el enlace directo. */
export const DEFAULT_PORTFOLIO_TEMPLATE = `¡Hola, {nombre}! La cartera de {mes} ya está lista: *{titulo}*.

Tienes {importe} para invertir entre {opciones} opciones ({eleccion}){plazo}.

No vale elegir al azar: lee la lección, mira la ficha de cada valor y escribe tu porqué. Ese porqué es lo que de verdad te hace mejor inversor, y lo que la familia leerá después.

Entra aquí y decide: {enlace}

{presidente} · Club de Inversión de {familia}`;

/** Sustituye los marcadores de la plantilla; «{eleccion}» describe cuántas opciones se eligen. */
export function renderMessage(template: string, v: MessageVars): string {
  const eleccion = v.minimo === v.maximo ? (v.minimo === 1 ? "elige una" : `elige ${v.minimo}`) : `elige de ${v.minimo} a ${v.maximo}`;
  const plazo = v.plazo ? `, ${v.plazo}` : "";
  return template
    .replaceAll("{nombre}", v.nombre)
    .replaceAll("{presidente}", v.presidente)
    .replaceAll("{familia}", v.familia)
    .replaceAll("{mes}", v.mes)
    .replaceAll("{titulo}", v.titulo)
    .replaceAll("{importe}", v.importe)
    .replaceAll("{opciones}", String(v.opciones))
    .replaceAll("{eleccion}", eleccion)
    .replaceAll("{plazo}", plazo)
    .replaceAll("{enlace}", v.enlace)
    .trim();
}

/** Enlace «clic para chatear» de WhatsApp con el mensaje ya escrito. */
export function whatsappLink(phoneE164: string, text: string): string {
  return `https://wa.me/${phoneE164.replace(/^\+/, "")}?text=${encodeURIComponent(text)}`;
}

/** Comprobación de la plantilla antes de guardar: el enlace es obligatorio y el texto tiene que caber en un WhatsApp. */
export function templateProblems(template: string): string[] {
  const out: string[] = [];
  if (!template.includes("{enlace}")) out.push("La plantilla debe llevar el marcador {enlace}: es el acceso directo a la cartera.");
  if (template.trim().length < 40) out.push("El mensaje es demasiado corto.");
  if (template.length > 1500) out.push("El mensaje es demasiado largo (máximo 1500 caracteres).");
  return out;
}
