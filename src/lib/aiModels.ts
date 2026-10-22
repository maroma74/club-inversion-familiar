/**
 * Modelos de Claude que el administrador de la web puede elegir para los análisis con IA. Precios de la API de
 * Anthropic en dólares por millón de tokens (entrada / salida). Si se añade uno, basta con ponerlo aquí.
 */
export type AiModel = { id: string; name: string; summary: string; price: string };

export const AI_MODELS: AiModel[] = [
  { id: "claude-opus-5-5", name: "Claude Opus 5.5", summary: "Recomendado. Razona muy bien y explica con claridad: el equilibrio entre calidad y coste para los análisis del club.", price: "4 $ / 20 $" },
  { id: "claude-sonnet-5-5", name: "Claude Sonnet 5.5", summary: "Más rápido y a la mitad de precio. Suficiente para resúmenes y explicaciones sencillas.", price: "2 $ / 10 $" },
  { id: "claude-haiku-5-5", name: "Claude Haiku 5.5", summary: "El más rápido y económico, para tareas cortas y muchas peticiones. Profundiza menos.", price: "0,10 $ / 0,50 $" },
  { id: "claude-fable-5-1", name: "Claude Fable 5.1", summary: "El más capaz de Anthropic, pero más lento y caro. Solo para análisis muy exigentes.", price: "10 $ / 50 $" },
];

export const DEFAULT_AI_MODEL = AI_MODELS[0].id;

export const isAiModel = (id: unknown): id is string => typeof id === "string" && AI_MODELS.some((m) => m.id === id);

export const aiModelName = (id: string) => AI_MODELS.find((m) => m.id === id)?.name ?? id;
