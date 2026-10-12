/**
 * Lectura automática de titulares: clasifica cada noticia por impacto probable en la cotización
 * (favorable, desfavorable, neutral) y por tema, a partir de palabras clave en español e inglés.
 * Es una heurística transparente, no un modelo de lenguaje: sirve para orientar, no para decidir.
 */
import type { NewsItem } from "./news";

export type Impact = "favorable" | "desfavorable" | "neutral";
export type ClassifiedNews = NewsItem & { impact: Impact; themes: string[]; matched: string[] };
export type NewsDigest = {
  items: ClassifiedNews[];
  favorable: number;
  desfavorable: number;
  neutral: number;
  net: number; // favorables − desfavorables, ponderado por recencia (−1..+1 aprox.)
  tone: Impact; // tono global
  themes: string[]; // temas más repetidos
  summary: string; // frase resumen en castellano
  highlights: string[]; // titulares que más pueden mover la acción
};

const POS = [
  "récord", "record", "máximo histórico", "all-time high", "beat", "supera", "bate", "mejor de lo esperado", "eleva previsiones", "raises guidance", "raises outlook", "mejora previsiones",
  "beneficio", "beneficios", "profit", "profits", "ganancias", "crece", "crecimiento", "growth", "sube", "subida", "rally", "dispara", "soars", "jumps", "surges", "rises", "gains",
  "dividendo", "dividend", "recompra", "buyback", "upgrade", "mejora recomendación", "sobreponderar", "overweight", "outperform", "comprar", "buy rating", "precio objetivo al alza", "raises price target", "price target raised",
  "contrato", "contract", "acuerdo", "deal", "adquiere", "adquisición", "acquires", "acquisition", "alianza", "partnership", "lanza", "launches", "aprobación", "approval", "approved", "autoriza",
  "ingresos récord", "revenue beat", "demanda fuerte", "strong demand", "expansion", "expansión", "inversión de", "invertirá", "will invest", "oportunidad",
];
const NEG = [
  "cae", "caída", "caen", "desploma", "desplome", "plunges", "falls", "drops", "slumps", "tumbles", "sinks", "hunde", "pierde", "pérdidas", "loss", "losses", "peor de lo esperado", "miss", "misses", "incumple",
  "recorta", "recorte", "cuts", "rebaja", "downgrade", "infraponderar", "underweight", "underperform", "vender", "sell rating", "precio objetivo a la baja", "lowers price target", "price target cut",
  "profit warning", "rebaja previsiones", "lowers guidance", "cuts outlook", "despidos", "layoffs", "ere", "huelga", "strike", "investigación", "investigation", "probe", "multa", "fine", "sanción", "demanda judicial", "lawsuit", "sued",
  "fraude", "fraud", "escándalo", "scandal", "dimite", "dimisión", "resigns", "resignation", "ciberataque", "cyberattack", "retirada", "recall", "quiebra", "bankruptcy", "concurso de acreedores", "default", "impago",
  "arancel", "aranceles", "tariff", "tariffs", "regulador", "regulator", "bloquea", "blocks", "prohíbe", "ban", "suspende", "suspends", "retraso", "delay", "delayed", "débil", "weak", "weakness", "deuda", "debt downgrade",
];
const THEMES: Array<[string, string[]]> = [
  ["Resultados", ["resultados", "earnings", "beneficio", "profit", "ingresos", "revenue", "trimestre", "quarter", "q1", "q2", "q3", "q4", "ebitda", "guidance", "previsiones"]],
  ["Analistas", ["analista", "analyst", "upgrade", "downgrade", "precio objetivo", "price target", "recomendación", "rating", "sobreponderar", "infraponderar", "outperform", "underperform"]],
  ["Dividendos y recompras", ["dividendo", "dividend", "recompra", "buyback"]],
  ["Fusiones y adquisiciones", ["adquisición", "acquisition", "acquires", "compra de", "fusión", "merger", "opa", "takeover", "venta de", "divests", "escisión", "spin-off"]],
  ["Regulación y legal", ["regulador", "regulator", "multa", "fine", "investigación", "investigation", "demanda", "lawsuit", "antitrust", "competencia", "cnmc", "sec ", "bruselas", "comisión europea", "sanción", "arancel", "tariff"]],
  ["Producto y negocio", ["lanza", "launch", "producto", "product", "contrato", "contract", "acuerdo", "deal", "cliente", "pedido", "orders", "fábrica", "plant", "inversión", "expansión", "expansion", "chip", "ia ", "ai "]],
  ["Dirección y gobierno", ["ceo", "consejero delegado", "presidente", "chairman", "dimite", "resigns", "nombra", "appoints", "consejo", "board", "junta"]],
  ["Macro y sector", ["bce", "ecb", "fed", "tipos de interés", "interest rates", "inflación", "inflation", "petróleo", "oil", "ibex", "sector", "mercado", "bolsa hoy", "wall street"]],
];

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function classifyNews(item: NewsItem): ClassifiedNews {
  const t = ` ${norm(item.title)} `;
  const pos = POS.filter((k) => t.includes(norm(k)));
  const neg = NEG.filter((k) => t.includes(norm(k)));
  // Negaciones sencillas: "no cae", "sin pérdidas" invierten el signo del término siguiente.
  const negated = /\b(no|sin|evita|frena)\s+\S+/.test(t);
  let score = pos.length - neg.length;
  if (negated && neg.length > pos.length) score = Math.abs(score) * 0.5;
  const impact: Impact = score > 0 ? "favorable" : score < 0 ? "desfavorable" : "neutral";
  const themes = THEMES.filter(([, kws]) => kws.some((k) => t.includes(norm(k)))).map(([name]) => name);
  return { ...item, impact, themes, matched: [...pos, ...neg] };
}

export function digestNews(items: NewsItem[], symbol: string): NewsDigest {
  const classified = items.map(classifyNews);
  const now = Date.now();
  let net = 0, weightSum = 0;
  for (const c of classified) {
    const ageDays = Math.max(0, (now - c.publishedAt.getTime()) / 86400000);
    const w = Math.exp(-ageDays / 10); // las noticias de hoy pesan 1, las de hace 10 días ~0,37
    net += w * (c.impact === "favorable" ? 1 : c.impact === "desfavorable" ? -1 : 0);
    weightSum += w;
  }
  net = weightSum ? net / weightSum : 0;
  const favorable = classified.filter((c) => c.impact === "favorable").length;
  const desfavorable = classified.filter((c) => c.impact === "desfavorable").length;
  const neutral = classified.length - favorable - desfavorable;
  const tone: Impact = net > 0.15 ? "favorable" : net < -0.15 ? "desfavorable" : "neutral";
  const themeCount = new Map<string, number>();
  for (const c of classified) for (const th of c.themes) themeCount.set(th, (themeCount.get(th) ?? 0) + 1);
  const themes = [...themeCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t);
  const highlights = classified
    .filter((c) => c.impact !== "neutral")
    .sort((a, b) => b.matched.length - a.matched.length || b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, 3)
    .map((c) => c.title);

  let summary: string;
  if (classified.length === 0) summary = `Sin noticias recientes sobre ${symbol} en la fuente consultada.`;
  else {
    const toneTxt = tone === "favorable" ? "predominan los titulares favorables" : tone === "desfavorable" ? "predominan los titulares desfavorables" : "el flujo de noticias es mixto o neutral";
    summary = `${classified.length} noticias recientes sobre ${symbol}: ${favorable} favorables, ${desfavorable} desfavorables y ${neutral} neutrales; ${toneTxt}${themes.length ? ` (temas: ${themes.join(", ").toLowerCase()})` : ""}.`;
  }
  return { items: classified, favorable, desfavorable, neutral, net, tone, themes, summary, highlights };
}
