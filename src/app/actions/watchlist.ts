"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { DEFAULT_ETF_WATCHLIST, DEFAULT_WATCHLIST, fetchStockQuote, type WatchKind } from "@/lib/stocks";
import { fetchProfile } from "@/lib/fundamentals";
import type { FormState } from "./auth";

const asKind = (v: unknown): WatchKind => (v === "ETF" ? "ETF" : "STOCK");
const pathFor = (kind: WatchKind) => (kind === "ETF" ? "/etf" : "/acciones");

export async function addWatchlistAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const symbol = String(formData.get("symbol") ?? "").trim().toUpperCase();
  let name = String(formData.get("name") ?? "").trim();
  const pageKind = asKind(formData.get("kind"));
  if (!symbol) return { error: "Indica un símbolo" };
  const q = await fetchStockQuote(symbol);
  if (q.error && q.price === 0) return { error: `No se encontró cotización para ${symbol}. Prueba con el sufijo de bolsa (SAN.MC, ASML.AS, VWCE.DE…)` };
  if (!name) name = q.name;
  // El tipo real lo dice Yahoo (ETF / acción); si no responde, se usa el de la página desde la que se añade.
  const profile = await fetchProfile(q.symbol);
  const kind: WatchKind = profile.quoteType ? (profile.isFund ? "ETF" : "STOCK") : pageKind;
  const count = await prisma.watchlistItem.count({ where: { familyId: user.familyId, kind } });
  if (count >= 40) return { error: "La lista admite hasta 40 valores de cada tipo" };
  await prisma.watchlistItem.upsert({
    where: { familyId_symbol: { familyId: user.familyId, symbol: q.symbol } },
    update: { name, kind },
    create: { familyId: user.familyId, symbol: q.symbol, name, kind },
  });
  revalidatePath("/acciones");
  revalidatePath("/etf");
  const moved = kind !== pageKind ? ` (es ${kind === "ETF" ? "un ETF: lo encontrarás en la sección ETF" : "una acción: la encontrarás en Acciones"})` : "";
  return { ok: `${q.symbol} añadido a la lista${moved}` };
}

export async function removeWatchlistAction(formData: FormData) {
  const user = await requireUser();
  await prisma.watchlistItem.deleteMany({ where: { familyId: user.familyId, symbol: String(formData.get("symbol") ?? "") } });
  revalidatePath("/acciones");
  revalidatePath("/etf");
}

export async function addDefaultWatchlistAction(formData: FormData) {
  const user = await requireUser();
  const kind = asKind(formData.get("kind"));
  const list = kind === "ETF" ? DEFAULT_ETF_WATCHLIST : DEFAULT_WATCHLIST;
  for (const d of list) {
    await prisma.watchlistItem.upsert({
      where: { familyId_symbol: { familyId: user.familyId, symbol: d.symbol } },
      update: { kind },
      create: { familyId: user.familyId, symbol: d.symbol, name: d.name, kind },
    });
  }
  revalidatePath(pathFor(kind));
}
