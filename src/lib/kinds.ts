import { isCrypto } from "./prices";
import { isCommodity } from "./commodities";

export type SymbolKind = "CRYPTO" | "COMMODITY" | "STOCK";

/** Tipo de activo de un símbolo: criptomoneda, materia prima (futuro) o valor de bolsa (acción o ETF). */
export function symbolKind(symbol: string): SymbolKind {
  if (isCrypto(symbol)) return "CRYPTO";
  if (isCommodity(symbol)) return "COMMODITY";
  return "STOCK";
}

/** Página de análisis de un símbolo: la ficha de su sección (Cripto, Materias primas o Acciones). */
export function analysisPath(symbol: string): string {
  const k = symbolKind(symbol);
  const base = k === "CRYPTO" ? "/cripto" : k === "COMMODITY" ? "/materias-primas" : "/acciones";
  return `${base}/${encodeURIComponent(symbol)}`;
}
