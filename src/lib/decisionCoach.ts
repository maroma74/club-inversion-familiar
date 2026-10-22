/**
 * «Ayuda para tomar la decisión»: un tutor con IA que, con la cartera del mes y sus reglas, hace preguntas al
 * miembro, le explica lo que necesite con palabras sencillas y al final le prepara un resumen de su porqué.
 * Aquí está la parte pura (instrucciones, contexto y validación de la conversación), para poder probarla.
 */
import { COACH_MAX_MESSAGES, COACH_MAX_USER_CHARS } from "./coachSummary";

export type CoachOption = { symbol: string; name: string; kind: string; note: string | null; priceEur: number | null; signal: string | null };

export type CoachContext = {
  firstName: string;
  familyName: string;
  monthLabel: string; // «octubre de 2026»
  title: string;
  lesson: string;
  allocation: number;
  minChoices: number;
  maxChoices: number;
  deadline: Date | null;
  now: Date;
  options: CoachOption[];
};

export type CoachMessage = { role: "user" | "assistant"; content: string };

export const COACH_MAX_ASSISTANT_CHARS = 8000;
export { COACH_MAX_MESSAGES, COACH_MAX_USER_CHARS, COACH_OPENING } from "./coachSummary";

const KIND: Record<string, string> = { STOCK: "acción de una empresa", ETF: "ETF (fondo que se compra como una acción)", CRYPTO: "criptomoneda", COMMODITY: "materia prima" };
const eur = (n: number) => `${n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const day = (d: Date) => d.toLocaleDateString("es-ES", { day: "numeric", month: "long", timeZone: "Europe/Madrid" });

/** Reglas de este mes, dichas como se le explicarían al miembro. */
export function coachRules(ctx: CoachContext): string[] {
  const pick = ctx.maxChoices === 1 ? "Elige una sola opción y pone en ella todo su importe." : ctx.minChoices === ctx.maxChoices ? `Elige exactamente ${ctx.maxChoices} opciones y reparte su importe entre ellas como quiera.` : `Elige entre ${ctx.minChoices} y ${ctx.maxChoices} opciones y reparte su importe entre ellas como quiera.`;
  const daysLeft = ctx.deadline ? Math.ceil((ctx.deadline.getTime() - ctx.now.getTime()) / 86_400_000) : null;
  const deadline = ctx.deadline ? `Puede decidir hasta el ${day(ctx.deadline)}${daysLeft !== null && daysLeft <= 1 ? " (se acaba el plazo)" : daysLeft !== null ? ` (quedan ${daysLeft} días)` : ""}.` : "Esta cartera no tiene fecha límite.";
  return [
    `Este mes tiene ${eur(ctx.allocation)} de su paga para invertir.`,
    pick,
    ctx.maxChoices === 1 ? "" : "Lo que no reparta se queda como efectivo en su cartera.",
    "Por cada opción elegida escribe por qué la elige (y, si quiere, qué le haría vender), y además una idea general sobre lo que ha aprendido de la lección.",
    "Cuando envía la decisión ya no puede cambiarla: se compra al precio de ese momento y queda en su cartera y en su diario.",
    deadline,
    "Al cerrar el mes la familia hace un repaso: gana quien mejor explicó su decisión, no quien más acertó, porque acertar a corto plazo es en buena parte suerte.",
  ].filter(Boolean);
}

function optionLine(o: CoachOption): string {
  const parts = [`${o.symbol}: ${o.name} (${KIND[o.kind] ?? o.kind.toLowerCase()})`];
  if (o.priceEur !== null) parts.push(`precio ahora: ${eur(o.priceEur)}`);
  if (o.signal) parts.push(`lectura automática del club: ${o.signal}`);
  if (o.note) parts.push(`qué investigar, según el presidente: ${o.note}`);
  return `- ${parts.join(" · ")}`;
}

/** Prompt de TutorIA por defecto (el administrador de la web puede cambiarlo en Administración). */
export const DEFAULT_COACH_PROMPT = `# ROL Y OBJETIVO
Eres un mentor experto en economía y educación financiera. Tu misión es guiar de forma interactiva a jóvenes que están aprendiendo a invertir, ayudándoles a analizar la cartera mensual y a tomar su propia decisión de inversión con criterio sólido.

# TONO Y ESTILO
- **Didáctico, cercano y motivador:** Usa explicaciones claras, analogías del día a día y evita tecnicismos innecesarios (o explícalos de forma muy sencilla si son indispensables).
- **Personalizado:** Dirígete siempre al usuario por su nombre: {{NOMBRE_USUARIO}}.
- **No prescriptivo:** Tu labor no es decirle qué comprar por imposición, sino hacerle buenas preguntas para que él/ella razone y elija con fundamento.

# CONTEXTO DE ENTRADA
- Cartera disponible este mes: {{CARTERA_DEL_MES}}
- Reglas y límites de inversión de este mes: {{REGLAS_MES}}

# FLUJO DE INTERACCIÓN (Sigue este orden estrictamente)

1. **Bienvenida y encuadre inicial:**
   - Saluda a {{NOMBRE_USUARIO}} con entusiasmo.
   - Presenta en 2 o 3 frases muy sencillas el menú de opciones disponibles este mes y las reglas clave que aplican.
   - Haz **una sola pregunta inicial** sobre su objetivo o perfil (por ejemplo: si busca mayor rentabilidad asumiendo algo de variación, o si prefiere estabilidad/seguridad este mes).

2. **Diálogo guiado (Paso a paso):**
   - No lances varias preguntas a la vez; haz preguntas de una en una para mantener una conversación ágil.
   - Con cada respuesta de {{NOMBRE_USUARIO}}, valida su razonamiento, aporta un dato o perspectiva didáctica relevante de la cartera y formula la siguiente pregunta para acotar la elección.

3. **Cierre y justificación final:**
   - Una vez que {{NOMBRE_USUARIO}} haya definido claramente su elección de activos, genera un bloque de texto final claro y sintetizado.
   - Presenta el texto en un bloque fácil de copiar bajo la siguiente instrucción:
     *"Aquí tienes el resumen de tu razonamiento. Puedes copiar y pegar este texto directamente en el campo de justificación de tu operación:"*
   - El texto resumido debe incluir:
     - Activo(s) seleccionado(s).
     - Motivo principal de la elección alineado con su objetivo y las reglas del mes.
     - Nivel de riesgo/expectativa asumida de forma consciente.`;

export const COACH_PROMPT_MAX = 20_000;

/** Variables que el prompt puede usar; la app las sustituye por los datos de cada miembro y cartera. */
export const COACH_PLACEHOLDERS = [
  { key: "NOMBRE_USUARIO", help: "nombre de pila de quien decide" },
  { key: "CARTERA_DEL_MES", help: "título, cada opción (tipo, precio, lectura del club, qué investigar) y la lección del presidente" },
  { key: "REGLAS_MES", help: "importe, cuántas opciones elegir, plazo y cómo funciona el repaso" },
  { key: "FAMILIA", help: "nombre del club de la familia" },
] as const;

/**
 * Instrucciones de la app que se añaden siempre al final, aunque se cambie el prompt: que no invente datos,
 * que no se salga del tema y el formato del texto final, que la app necesita para poner el botón «Copiar».
 */
export function coachFixedInstructions(name: string): string {
  return `# INSTRUCCIONES DE LA APP
- Usa solo los datos de este contexto y tu conocimiento general. No inventes precios, resultados ni noticias recientes: si hace falta un dato, pide a ${name} que pulse «Analizar» en esa opción, dentro de la app, para ver la gráfica, la lectura del club y, si es una empresa, su PER. La «lectura automática del club» es una pista calculada con datos de mercado, no una orden.
- Habla solo de la decisión de este mes y de aprender a invertir; si te pregunta otra cosa, reconduce con amabilidad. No pidas datos personales.
- Escribe el texto final para copiar entre las etiquetas <resumen> y </resumen>, sin nada más dentro: la app lo muestra aparte con un botón «Copiar». Escríbelo en primera persona, como si lo escribiera ${name}, con sus propias razones.`;
}

/** Datos de la cartera del mes, tal como los ve el tutor. */
export function coachPortfolio(ctx: CoachContext): string {
  return `«${ctx.title}» (cartera de ${ctx.monthLabel})

Opciones entre las que elegir:
${ctx.options.map(optionLine).join("\n")}

Lección del mes, escrita por el presidente del club:
${ctx.lesson.trim()}`;
}

const placeholder = (key: string) => new RegExp(String.raw`\{\{\s*${key}\s*\}\}`, "g");

/**
 * Prompt de sistema: la plantilla con sus variables sustituidas y las instrucciones de la app al final. Si la
 * plantilla no usa la cartera o las reglas, se añaden igualmente para que el tutor nunca hable sin datos.
 */
export function buildCoachSystemPrompt(ctx: CoachContext, template: string = DEFAULT_COACH_PROMPT): string {
  const values: Record<(typeof COACH_PLACEHOLDERS)[number]["key"], string> = {
    NOMBRE_USUARIO: ctx.firstName,
    CARTERA_DEL_MES: coachPortfolio(ctx),
    REGLAS_MES: coachRules(ctx).map((r) => `\n- ${r}`).join(""),
    FAMILIA: ctx.familyName,
  };
  let prompt = template.trim();
  const missing: string[] = [];
  for (const [key, value] of Object.entries(values)) {
    if (placeholder(key).test(prompt)) prompt = prompt.replace(placeholder(key), () => value);
    else if (key === "CARTERA_DEL_MES") missing.push(`# CARTERA DEL MES\n${value}`);
    else if (key === "REGLAS_MES") missing.push(`# REGLAS DEL MES${value}`);
  }
  return [prompt, ...missing, coachFixedInstructions(ctx.firstName)].join("\n\n");
}

/** Valida la conversación que manda el navegador: turnos alternos, empieza y acaba en el miembro, con límites. */
export function parseCoachMessages(input: unknown): { ok: true; messages: CoachMessage[] } | { ok: false; error: string } {
  if (!Array.isArray(input) || input.length === 0) return { ok: false, error: "La conversación está vacía." };
  if (input.length > COACH_MAX_MESSAGES) return { ok: false, error: "La conversación es demasiado larga: empieza una nueva." };
  const messages: CoachMessage[] = [];
  for (const [i, m] of input.entries()) {
    const role = (m as { role?: unknown })?.role;
    const content = (m as { content?: unknown })?.content;
    const expected = i % 2 === 0 ? "user" : "assistant";
    if (role !== expected || typeof content !== "string") return { ok: false, error: "La conversación no tiene el formato esperado." };
    const text = content.trim();
    if (!text) return { ok: false, error: "Hay un mensaje vacío." };
    const max = role === "user" ? COACH_MAX_USER_CHARS : COACH_MAX_ASSISTANT_CHARS;
    if (text.length > max) return { ok: false, error: role === "user" ? `Tu mensaje es muy largo: como máximo ${COACH_MAX_USER_CHARS} letras.` : "La conversación no tiene el formato esperado." };
    messages.push({ role: expected, content: text });
  }
  if (messages.at(-1)!.role !== "user") return { ok: false, error: "Falta tu mensaje." };
  return { ok: true, messages };
}
