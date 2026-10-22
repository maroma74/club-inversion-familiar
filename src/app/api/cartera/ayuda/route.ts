import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { firstName } from "@/lib/names";
import { getPrices } from "@/lib/prices";
import { getClubRecommendations } from "@/lib/club";
import { clubSignalText, getPortfolioFull, isDeadlinePassed, monthLabelLong } from "@/lib/monthly";
import { aiConfigured, aiErrorMessage, getAiModel, getAnthropic, getCoachPrompt, hasServerFallback } from "@/lib/ai";
import { buildCoachSystemPrompt, parseCoachMessages, previewAllocation } from "@/lib/decisionCoach";

/**
 * «Ayuda para tomar la decisión»: el tutor con IA de la cartera del mes. Recibe la conversación, rehace en el
 * servidor el contexto (cartera, reglas, opciones, precios) y devuelve la respuesta de Claude por partes, en
 * líneas JSON: {"t":"text","v":"…"} con cada trozo, y al final {"t":"done"} o {"t":"error","v":"…"}.
 * Solo para quien puede decidir en esa cartera ahora mismo, o para el presidente en modo prueba («preview»):
 * prueba TutorIA con un borrador (o una cartera abierta) tal como esté, sin que se guarde ni cuente nada.
 */
export const dynamic = "force-dynamic";

const MAX_PER_DAY = 80; // mensajes por persona y día: de sobra para decidir, y pone techo al gasto

const bodySchema = z.object({ portfolioId: z.string().min(1).max(64), messages: z.unknown(), preview: z.boolean().optional() });
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers: { "cache-control": "no-store" } });

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") return fail("Tu sesión ha caducado: vuelve a entrar.", 401);
  if (user.impersonator) return fail("Mientras visualizas como otro miembro no se puede usar la ayuda.", 403);
  if (!aiConfigured()) return fail("La ayuda con IA no está disponible ahora mismo.", 503);
  if (!req.headers.get("content-type")?.includes("application/json")) return fail("Formato no admitido.", 415);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Petición no válida.", 400);
  const preview = parsed.data.preview === true;
  // La prueba es solo del presidente y funciona aunque TutorIA esté apagado para los miembros
  if (preview && user.role !== "ADMIN") return fail("Solo el presidente del club puede probar TutorIA.", 403);
  if (!preview && !user.family.tutorEnabled) return fail("El presidente del club ha desactivado TutorIA.", 403);
  const conv = parseCoachMessages(parsed.data.messages);
  if (!conv.ok) return fail(conv.error, 400);

  const p = await getPortfolioFull(parsed.data.portfolioId, user.familyId);
  let allocation = p?.allocations.find((a) => a.userId === user.id)?.amount ?? 0;
  if (preview) {
    if (!p || p.status === "CLOSED") return fail("Esta cartera está cerrada: ya no se puede probar TutorIA con ella.", 409);
    if (p.options.length === 0) return fail("Añade al menos una opción a la cartera para probar TutorIA.", 409);
    allocation = previewAllocation(p.allocations, user.id, user.family.monthlyAllowance);
  } else if (!p || p.status !== "PUBLISHED" || isDeadlinePassed(p) || allocation <= 0 || p.decisions.some((d) => d.userId === user.id)) {
    return fail("Esta cartera ya no admite decisiones tuyas, así que la ayuda se ha cerrado.", 409);
  }
  const limit = await rateLimit(`ai-ayuda:${user.id}`, MAX_PER_DAY, 24 * 3600 * 1000);
  if (!limit.ok) return fail("Has usado mucho la ayuda hoy. Vuelve mañana o pregunta al presidente del club.", 429);

  const [prices, recs, model, prompt] = await Promise.all([
    getPrices(p.options.map((o) => o.symbol), p.familyId),
    getClubRecommendations(p.options.filter((o) => o.kind !== "CRYPTO").map((o) => o.symbol)),
    getAiModel(),
    getCoachPrompt(),
  ]);
  const system = buildCoachSystemPrompt({
    firstName: firstName(user.name),
    familyName: user.family.name,
    monthLabel: monthLabelLong(p.month),
    title: p.title,
    lesson: p.lesson,
    allocation,
    minChoices: p.minChoices,
    maxChoices: p.maxChoices,
    deadline: p.deadline,
    now: new Date(),
    options: p.options.map((o) => {
      const r = recs.get(o.symbol.toUpperCase());
      return { symbol: o.symbol, name: o.name, kind: o.kind, note: o.note, priceEur: prices.get(o.symbol.toUpperCase())?.priceEur ?? null, signal: r ? clubSignalText(r.action) : null };
    }),
  }, prompt.text);

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: { t: string; v?: string }) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        const fallback = hasServerFallback(model);
        const stream = getAnthropic().beta.messages.stream(
          {
            model,
            max_tokens: 6000,
            system,
            messages: conv.messages,
            output_config: { effort: "medium" },
            cache_control: { type: "ephemeral" }, // el contexto de la cartera se repite en cada turno
            ...(fallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
          },
          { signal: req.signal },
        );
        for await (const ev of stream) {
          if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") send({ t: "text", v: ev.delta.text });
        }
        const final = await stream.finalMessage();
        console.log(JSON.stringify({ event: preview ? "ai-ayuda-prueba" : "ai-ayuda", userId: user.id, portfolioId: p.id, model: final.model, stop: final.stop_reason, input: final.usage.input_tokens, cacheWrite: final.usage.cache_creation_input_tokens ?? 0, cacheRead: final.usage.cache_read_input_tokens ?? 0, output: final.usage.output_tokens }));
        if (final.stop_reason === "refusal") send({ t: "error", v: "El asistente no puede responder a eso. Prueba a preguntarlo de otra forma." });
        else if (final.stop_reason === "max_tokens") send({ t: "error", v: "La respuesta se ha cortado. Pídele que siga o que lo diga más corto." });
        else send({ t: "done" });
      } catch (error) {
        if (req.signal.aborted) return controller.close();
        console.error("ai-ayuda", error instanceof Error ? error.message : error);
        send({ t: "error", v: aiErrorMessage(error, model) ? "La ayuda no ha podido responder ahora. Inténtalo en un momento." : "Ha fallado la ayuda. Inténtalo de nuevo." });
      }
      controller.close();
    },
  });
  return new Response(body, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store", "x-accel-buffering": "no" } });
}
