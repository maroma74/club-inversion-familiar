/**
 * Repositorio de propuestas de cartera: reglas del club y comprobación de texto neutro.
 * Módulo puro (sin base de datos ni red): lo usan las acciones de servidor, las pantallas, la carga de las propuestas
 * del club y las pruebas.
 *
 * Una propuesta es una plantilla reutilizable por cualquier presidente, así que su texto debe ser neutro:
 * sin meses, años ni referencias a periodos («este mes», «el trimestre pasado», «hoy»…).
 */

export const PROPOSAL_THEMES = ["Núcleo global", "Dividendos", "Tecnología", "Sectores", "España", "Geografía", "Refugio", "Materias primas", "Cripto", "Valoración"] as const;
export type ProposalTheme = (typeof PROPOSAL_THEMES)[number];

export const RISK_LABEL: Record<number, string> = { 1: "Bajo", 2: "Medio-bajo", 3: "Medio", 4: "Alto", 5: "Muy alto" };

export const OPTION_KINDS = ["STOCK", "ETF", "CRYPTO", "COMMODITY"] as const;
export const KIND_LABEL: Record<string, string> = { STOCK: "Acción", ETF: "ETF", CRYPTO: "Cripto", COMMODITY: "Materia prima" };

/** Límites de la cartera del mes (los mismos que validan crear y editar una cartera) más los propios de una plantilla. */
export const PROPOSAL_LIMITS = {
  title: { min: 3, max: 120 },
  lesson: { min: 200, max: 8000 }, // la cartera admite desde 20, pero una plantilla debe ser una lección de verdad
  options: { min: 2, max: 12 },
  note: { max: 300 },
  choices: { min: 1, max: 10 },
};

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "setiembre", "octubre", "noviembre", "diciembre"];
const PERIOD_WORDS = "mes|año|ano|trimestre|semestre|semana|verano|invierno|primavera|otoño|otono|temporada|ejercicio";

/** Minúsculas y sin tildes: así «Octubre», «OCTUBRE» y «octubre» son lo mismo. */
// La ñ se protege antes de quitar las tildes para que los avisos citen «año» y no «ano».
const KEEP_N = "\u0001"; // marcador temporal para no perder la ñ al quitar las tildes
const fold = (s: string) => s.toLowerCase().replaceAll("ñ", KEEP_N).normalize("NFD").replace(/[̀-ͯ]/g, "").replaceAll(KEEP_N, "ñ");

const NEUTRAL_RULES: { label: string; re: RegExp }[] = [
  { label: "nombres de mes", re: new RegExp(`\\b(${MONTHS.join("|")})\\b`, "g") },
  { label: "años", re: /\b(19|20)\d{2}\b/g },
  { label: "«mes» o «meses»", re: /\bmes(es)?\b/g },
  { label: "«semana» o «semanas»", re: /\bsemanas?\b/g },
  { label: "trimestres y semestres", re: /\b(trimestre|trimestres|trimestral|trimestrales|semestre|semestres|semestral|semestrales)\b/g },
  { label: "referencias a un periodo concreto", re: new RegExp(`\\b(este|esta|estos|estas|proximo|proxima|proximos|proximas|pasado|pasada|ultimo|ultima|ultimos|ultimas|siguiente|anterior|presente|actual)\\s+(${PERIOD_WORDS})\\b`, "g") },
  { label: "referencias a un periodo pasado o futuro", re: new RegExp(`\\b(${PERIOD_WORDS})\\s+(pasado|pasada|anterior|siguiente|proximo|proxima|que viene)\\b`, "g") },
  { label: "referencias al momento actual", re: /\b(hoy|actualmente|ahora mismo|en la actualidad|recientemente|ultimamente|hoy en dia)\b/g },
];

/** Qué hace que un texto no sea neutro: devuelve cada tipo de problema con los fragmentos encontrados (sin repetir). */
export function neutralIssues(text: string): { label: string; found: string[] }[] {
  const t = fold(text);
  const out: { label: string; found: string[] }[] = [];
  for (const rule of NEUTRAL_RULES) {
    const found = [...new Set([...t.matchAll(rule.re)].map((m) => m[0]))];
    if (found.length) out.push({ label: rule.label, found });
  }
  return out;
}

export const isNeutral = (text: string) => neutralIssues(text).length === 0;

export type ProposalInput = {
  title: string;
  lesson: string;
  theme: string;
  risk: number;
  minChoices: number;
  maxChoices: number;
  options: { symbol: string; name: string; kind: string; note?: string | null }[];
};

/**
 * Todo lo que impide publicar una propuesta en el repositorio, en frases que se pueden enseñar al presidente.
 * Lista vacía = cumple la normativa del club.
 */
export function proposalProblems(p: ProposalInput): string[] {
  const out: string[] = [];
  const L = PROPOSAL_LIMITS;
  const title = p.title.trim();
  if (title.length < L.title.min || title.length > L.title.max) out.push(`El título debe tener entre ${L.title.min} y ${L.title.max} caracteres.`);
  const lesson = p.lesson.trim();
  if (lesson.length < L.lesson.min) out.push(`La lección es demasiado corta para compartirla: mínimo ${L.lesson.min} caracteres (explica la idea, qué investigar y cómo decidir).`);
  if (lesson.length > L.lesson.max) out.push(`La lección es demasiado larga: máximo ${L.lesson.max} caracteres.`);
  if (!(PROPOSAL_THEMES as readonly string[]).includes(p.theme)) out.push("Elige un tema de la lista.");
  if (!Number.isInteger(p.risk) || p.risk < 1 || p.risk > 5) out.push("El nivel de riesgo va de 1 (bajo) a 5 (muy alto).");

  const n = p.options.length;
  if (n < L.options.min) out.push(`Una propuesta necesita al menos ${L.options.min} opciones para poder elegir.`);
  if (n > L.options.max) out.push(`Máximo ${L.options.max} opciones por propuesta.`);
  if (!Number.isInteger(p.minChoices) || !Number.isInteger(p.maxChoices) || p.minChoices < L.choices.min || p.maxChoices > L.choices.max || p.minChoices > p.maxChoices) out.push(`El mínimo y el máximo a elegir deben estar entre ${L.choices.min} y ${L.choices.max}, y el mínimo no puede superar el máximo.`);
  else if (p.maxChoices > n) out.push("El máximo a elegir no puede ser mayor que el número de opciones.");

  const seen = new Set<string>();
  for (const o of p.options) {
    const sym = o.symbol.trim().toUpperCase();
    if (!sym || !o.name.trim()) out.push("Todas las opciones necesitan símbolo y nombre.");
    if (seen.has(sym)) out.push(`El valor ${sym} está repetido.`);
    seen.add(sym);
    if (!(OPTION_KINDS as readonly string[]).includes(o.kind)) out.push(`El tipo de ${sym} no es válido.`);
    if ((o.note ?? "").length > L.note.max) out.push(`La nota de ${sym} supera los ${L.note.max} caracteres.`);
  }

  // Texto neutro y sin enlaces externos: título, lección y notas de las opciones
  const texts = [["el título", p.title], ["la lección", p.lesson], ...p.options.map((o) => [`la nota de ${o.symbol}`, o.note ?? ""] as const)];
  for (const [where, text] of texts) {
    for (const issue of neutralIssues(text)) out.push(`Texto no neutro en ${where}: quita ${issue.label} (${issue.found.map((f) => `«${f}»`).join(", ")}). Las propuestas del repositorio las usan otras familias en otros momentos.`);
    if (hasExternalLink(text)) out.push(`Quita los enlaces externos de ${where}: las propuestas compartidas no pueden llevar direcciones web (las leen otras familias y el club no puede revisarlas).`);
  }
  return out;
}

/** ¿Lleva una dirección web (http, https o www.)? */
export function hasExternalLink(text: string): boolean {
  return /(https?:\/\/|\bwww\.)/i.test(text);
}

/** Cómo se muestra quién ha propuesto: las del club, la familia firmante o «Anónima». */
export function proposalSignature(p: { source: string; signed: boolean; familyName?: string | null }): string {
  if (p.source === "CLUB") return "Club de Inversión";
  return p.signed && p.familyName ? p.familyName : "Anónima";
}
