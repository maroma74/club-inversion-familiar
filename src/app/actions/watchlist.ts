"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { isCrypto } from "@/lib/prices";
import { DEFAULT_COMMODITY_WATCHLIST, findCommodity, isCommodity, matchCommodity } from "@/lib/commodities";
import { DEFAULT_CRYPTO_WATCHLIST, DEFAULT_ETF_WATCHLIST, DEFAULT_WATCHLIST, fetchStockQuote, type WatchKind } from "@/lib/stocks";
import { fetchProfile } from "@/lib/fundamentals";
import { symbolSchema } from "@/lib/validation";
import type { FormState } from "./auth";

const asKind = (v: unknown): WatchKind => (v === "ETF" ? "ETF" : v === "CRYPTO" ? "CRYPTO" : v === "COMMODITY" ? "COMMODITY" : "STOCK");
const pathFor = (kind: WatchKind) => (kind === "ETF" ? "/etf" : kind === "CRYPTO" ? "/cripto" : kind === "COMMODITY" ? "/materias-primas" : "/acciones");
const revalidateLists = () => {
  for (const p of ["/acciones", "/etf", "/cripto", "/materias-primas"]) revalidatePath(p);
};

/** Alta de un valor en la lista de la familia; el tipo real (acción, ETF o cripto) lo decide el símbolo. */
async function addToWatchlist(rawSymbol: unknown, rawName: unknown, pageKind: WatchKind): Promise<FormState> {
  const user = await requireUser();
  // En la sección de materias primas se acepta el nombre («oro», «petróleo») o el símbolo del catálogo del club.
  let input: unknown = rawSymbol;
  if (pageKind === "COMMODITY") {
    const m = matchCommodity(String(rawSymbol ?? ""));
    if (!m) return { error: "No hay ninguna materia prima con ese nombre. Prueba con: oro, plata, petróleo, gas natural, cobre, trigo, café…" };
    input = m.symbol;
  }
  const symParsed = symbolSchema.safeParse(input ?? "");
  if (!symParsed.success) return { error: symParsed.error.issues[0].message };
  let symbol = symParsed.data;
  // En la página de cripto basta con escribir «BTC»: se usa el par en euros.
  if (pageKind === "CRYPTO" && /^[A-Z0-9]{2,10}$/.test(symbol)) symbol = `${symbol}-EUR`;
  let name = String(rawName ?? "").trim().slice(0, 120);

  let q = await fetchStockQuote(symbol);
  // Moneda sin par en euros en Yahoo (p. ej. NEAR): se prueba el par en dólares antes de rendirse.
  if (q.error && q.price === 0 && isCrypto(symbol) && symbol.endsWith("-EUR")) {
    const usd = await fetchStockQuote(symbol.replace(/-EUR$/, "-USD"));
    if (!(usd.error && usd.price === 0)) q = usd;
  }
  if (q.error && q.price === 0) {
    return {
      error: isCrypto(symbol)
        ? `No se encontró cotización para ${symbol}. Usa el par de Yahoo Finance en euros, p. ej. BTC-EUR, ETH-EUR o SOL-EUR.`
        : `No se encontró cotización para ${symbol}. Prueba con el sufijo de bolsa (SAN.MC, ASML.AS, VWCE.DE…)`,
    };
  }
  if (!name) name = q.name.replace(/\s+(EUR|USD)$/i, "");
  if (isCommodity(q.symbol)) name = findCommodity(q.symbol)!.name; // nombre en español del catálogo

  let kind: WatchKind;
  if (isCrypto(q.symbol)) kind = "CRYPTO";
  else if (isCommodity(q.symbol)) kind = "COMMODITY";
  else if (pageKind === "CRYPTO") return { error: `${q.symbol} no es una criptomoneda. Escribe su par de Yahoo Finance, p. ej. BTC-EUR, ETH-EUR o SOL-EUR.` };
  else {
    // El tipo real lo dice Yahoo (ETF / acción); si no responde, se usa el de la página desde la que se añade.
    const profile = await fetchProfile(q.symbol);
    kind = profile.quoteType ? (profile.isFund ? "ETF" : "STOCK") : pageKind;
  }
  const count = await prisma.watchlistItem.count({ where: { familyId: user.familyId, kind } });
  if (count >= 40) return { error: "La lista admite hasta 40 valores de cada tipo" };
  await prisma.watchlistItem.upsert({
    where: { familyId_symbol: { familyId: user.familyId, symbol: q.symbol } },
    update: { name, kind },
    create: { familyId: user.familyId, symbol: q.symbol, name, kind },
  });
  revalidateLists();
  const where = (k: WatchKind) => (k === "ETF" ? "un ETF: lo encontrarás en la sección ETF" : k === "CRYPTO" ? "una criptomoneda: la encontrarás en Cripto" : k === "COMMODITY" ? "una materia prima: la encontrarás en Materias primas" : "una acción: la encontrarás en Acciones");
  const moved = kind !== pageKind ? ` (es ${where(kind)})` : "";
  return { ok: `${q.symbol} añadido a la lista${moved}` };
}

export async function addWatchlistAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return addToWatchlist(formData.get("symbol"), formData.get("name"), asKind(formData.get("kind")));
}

/** Botón «Seguir» de una fila (sin mensaje de estado): añade el valor y refresca las listas. */
export async function followWatchlistAction(formData: FormData) {
  await addToWatchlist(formData.get("symbol"), formData.get("name"), asKind(formData.get("kind")));
}

export async function removeWatchlistAction(formData: FormData) {
  const user = await requireUser();
  await prisma.watchlistItem.deleteMany({ where: { familyId: user.familyId, symbol: String(formData.get("symbol") ?? "").slice(0, 20) } });
  revalidateLists();
}

export async function addDefaultWatchlistAction(formData: FormData) {
  const user = await requireUser();
  const kind = asKind(formData.get("kind"));
  const list = kind === "ETF" ? DEFAULT_ETF_WATCHLIST : kind === "CRYPTO" ? DEFAULT_CRYPTO_WATCHLIST : kind === "COMMODITY" ? DEFAULT_COMMODITY_WATCHLIST : DEFAULT_WATCHLIST;
  for (const d of list) {
    await prisma.watchlistItem.upsert({
      where: { familyId_symbol: { familyId: user.familyId, symbol: d.symbol } },
      update: { kind },
      create: { familyId: user.familyId, symbol: d.symbol, name: d.name, kind },
    });
  }
  revalidatePath(pathFor(kind));
}
