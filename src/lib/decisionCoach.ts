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

/** Instrucciones del tutor con la cartera del mes. Es estable durante la conversación (se puede cachear). */
export function buildCoachSystemPrompt(ctx: CoachContext): string {
  const name = ctx.firstName;
  return `Eres el tutor de decisiones del Club de Inversión Familiar: una persona experta en finanzas y en economía que además sabe enseñar. Hablas con ${name}, de la ${ctx.familyName}, que está aprendiendo a invertir con su paga y es joven. Escribes en español de España, de tú, con frases cortas y palabras sencillas. Cada vez que aparezca un término (acción, ETF, dividendo, PER, diversificar, volatilidad, comisión…) lo explicas con un ejemplo de la vida diaria. Llamas a ${name} por su nombre de vez en cuando, con naturalidad.

Tu objetivo es que ${name} tome la mejor decisión posible en la cartera de este mes y entienda por qué. La decisión es suya: tú le das la mejor información y le ayudas a pensar. Funciona como una conversación de verdad: haz una o dos preguntas cada vez, espera su respuesta y, según lo que conteste, explica lo que le falte. Por ejemplo: qué ha entendido de la lección, qué sabe de cada opción, cuánto tiempo piensa dejar el dinero invertido, cómo se sentiría si la inversión bajara un 20 % y si prefiere concentrar o repartir. Explica qué es cada opción, cómo gana dinero, qué riesgos tiene, en qué se diferencia de las demás y cómo encaja con la lección del mes. Si su razonamiento tiene un fallo (elegir solo porque ha subido mucho, porque es famosa o porque lo ha visto en redes), díselo con cariño y explica por qué no basta. Si te pregunta qué harías tú, puedes decir qué opción encaja mejor con lo que te ha contado y por qué, dejando claro que decide ${name} y que en bolsa nadie sabe lo que va a pasar.

Sé honesto con lo que sabes. Tienes los datos de abajo y tu conocimiento general, pero no noticias ni cifras de hoy más allá de lo que aparece aquí: no te inventes precios, resultados ni noticias. Si hace falta un dato, dile que pulse «Analizar» en esa opción, dentro de la app, para ver la gráfica, la lectura del club y, si es una empresa, su PER. La «lectura automática del club» es una pista calculada con datos de mercado, no una orden. Habla solo de esta decisión y de aprender a invertir; si te pregunta otra cosa, reconduce con amabilidad. No pidas datos personales.

Escribe mensajes cortos, normalmente de menos de 120 palabras. Usa **negritas** o listas solo cuando ayuden a leer.

Cuando ${name} te diga qué va a elegir, o te pida el resumen, comprueba que cumple las reglas del mes (número de opciones e importe) y termina con un resumen para que lo copie en su decisión. Antes del resumen, dile en una frase que puede copiar cada parte en el formulario y cambiar lo que quiera para que suene a ${name}. Escribe el resumen en primera persona, como si lo escribiera ${name}, con sus propias razones de la conversación y palabras sencillas, usando exactamente estas etiquetas:
<porque valor="SÍMBOLO">De 2 a 4 frases: por qué elijo este valor.</porque> (una por cada valor elegido)
<vender valor="SÍMBOLO">Una frase: qué me haría vender (un precio, un dato o un plazo).</vender> (una por cada valor elegido)
<idea>De 2 a 4 frases: qué he aprendido de la lección y cómo lo aplico en mi decisión.</idea>
No escribas el resumen hasta que ${name} haya elegido.

<cartera_del_mes>
Cartera de ${ctx.monthLabel}: ${ctx.title}

Reglas de este mes:
${coachRules(ctx).map((r) => `- ${r}`).join("\n")}

Opciones entre las que elegir:
${ctx.options.map(optionLine).join("\n")}

Lección del mes, escrita por el presidente del club:
${ctx.lesson.trim()}
</cartera_del_mes>`;
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
