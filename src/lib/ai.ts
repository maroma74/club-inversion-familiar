import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "./prisma";
import { DEFAULT_AI_MODEL, aiModelName, isAiModel } from "./aiModels";

/**
 * Claude (API de Anthropic) para los análisis con IA. La clave vive en ANTHROPIC_API_KEY: en local en .env y en
 * producción en Secret Manager; nunca se guarda en la base ni se muestra. Sin clave, las funciones de IA no aparecen.
 * El modelo lo elige el administrador de la web y se guarda en SiteSetting («ai.model»).
 */
export const AI_MODEL_SETTING = "ai.model";

export const aiConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY?.trim());

/** Modelo elegido en Administración; si no hay ninguno (o ya no está en la lista), el de por defecto. */
export async function getAiModel(): Promise<string> {
  const row = await prisma.siteSetting.findUnique({ where: { key: AI_MODEL_SETTING }, select: { value: true } });
  return isAiModel(row?.value) ? row.value : DEFAULT_AI_MODEL;
}

export async function setAiModel(model: string, userId: string): Promise<void> {
  if (!isAiModel(model)) throw new Error(`Modelo no permitido: ${model}`);
  await prisma.siteSetting.upsert({
    where: { key: AI_MODEL_SETTING },
    create: { key: AI_MODEL_SETTING, value: model, updatedById: userId },
    update: { value: model, updatedById: userId },
  });
}

let client: Anthropic | null = null;

/** Cliente compartido. Lanza si falta la clave: comprobar antes con aiConfigured(). */
export function getAnthropic(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error("Falta ANTHROPIC_API_KEY");
  // Las claves que no pertenecen a un espacio de trabajo exigen indicar cuál usar en cada petición.
  const workspace = process.env.ANTHROPIC_WORKSPACE_ID?.trim();
  client ??= new Anthropic({ apiKey, maxRetries: 2, defaultHeaders: workspace ? { "anthropic-workspace-id": workspace } : undefined });
  return client;
}

export type AiCheck = { ok: true; model: string } | { ok: false; error: string };

/** Comprueba que la clave es válida y que el modelo elegido está disponible para la cuenta, sin gastar tokens. */
export async function checkAiConnection(): Promise<AiCheck> {
  if (!aiConfigured()) return { ok: false, error: "Falta la clave ANTHROPIC_API_KEY en el servidor." };
  const modelId = await getAiModel();
  try {
    const model = await getAnthropic().models.retrieve(modelId, {}, { timeout: 10_000 });
    return { ok: true, model: model.display_name || model.id };
  } catch (error) {
    if (error instanceof Anthropic.BadRequestError && /workspace/i.test(error.message)) return { ok: false, error: "La clave no pertenece a un espacio de trabajo: añade ANTHROPIC_WORKSPACE_ID o crea la clave dentro de un espacio de trabajo." };
    if (error instanceof Anthropic.AuthenticationError) return { ok: false, error: "Anthropic rechaza la clave: revisa que esté bien copiada y no esté revocada." };
    if (error instanceof Anthropic.PermissionDeniedError) return { ok: false, error: "La clave no tiene permiso para usar la API (revisa el espacio de trabajo en la consola de Anthropic)." };
    if (error instanceof Anthropic.NotFoundError) return { ok: false, error: `La cuenta no tiene acceso a ${aiModelName(modelId)}: elige otro modelo.` };
    if (error instanceof Anthropic.RateLimitError) return { ok: false, error: "Límite de peticiones alcanzado; prueba en un minuto." };
    if (error instanceof Anthropic.APIConnectionError) return { ok: false, error: "No se pudo conectar con Anthropic desde el servidor." };
    if (error instanceof Anthropic.APIError) return { ok: false, error: `Anthropic respondió con un error ${error.status ?? ""}.`.trim() };
    throw error;
  }
}
