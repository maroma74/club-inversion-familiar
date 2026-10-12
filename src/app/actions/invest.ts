"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";
import { computePortfolio, OWN_CONTRIBUTION_PREFIX, reconcileOwnContributions } from "@/lib/portfolio";
import { fetchQuote, fxToEurAt, setManualPrice, SUPPORTED_CURRENCIES } from "@/lib/prices";
import { dateSchema, MAX_PRICE, MAX_QUANTITY, num, parseMoney, parsePastDay, shortText, symbolSchema } from "@/lib/validation";
import type { FormState } from "./auth";

const tradeSchema = z.object({
  symbol: symbolSchema,
  name: shortText(120).optional(),
  side: z.enum(["BUY", "SELL"]),
  quantity: num("Cantidad no válida").positive("La cantidad debe ser mayor que 0").max(MAX_QUANTITY, "Cantidad demasiado grande"),
  price: num("Precio no válido").positive("El precio debe ser mayor que 0").max(MAX_PRICE, "Precio demasiado grande"),
  currency: z.enum(SUPPORTED_CURRENCIES).default("EUR"),
  fees: num("Comisión no válida").min(0).max(100_000, "Comisión demasiado grande").default(0),
  date: dateSchema,
  broker: shortText(60).optional(),
});

/** Valida y guarda una operación. Si `tradeId` existe, la edita; si no, la crea. */
async function saveTrade(formData: FormData, tradeId?: string): Promise<FormState> {
  const user = await requireUser();
  if (tradeId) {
    const existing = await prisma.trade.findFirst({ where: { id: tradeId, userId: user.id } });
    if (!existing) return { error: "Operación no encontrada" };
  }
  const parsed = tradeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const day = parsePastDay(d.date);
  if ("error" in day) return { error: day.error };
  const date = day.date;
  if (!Number.isFinite(d.quantity * d.price)) return { error: "Importe demasiado grande" };

  let fxRate = 1;
  if (d.currency !== "EUR") {
    try {
      fxRate = await fxToEurAt(d.currency, date);
    } catch {
      return { error: `No se pudo obtener el tipo de cambio ${d.currency}/EUR. Inténtalo de nuevo o introduce el precio en euros.` };
    }
  }

  // Al editar, la cartera se calcula sin la operación original para validar la nueva versión.
  const portfolio = await computePortfolio(user.id, { excludeTradeId: tradeId });
  if (d.side === "SELL") {
    const h = portfolio.holdings.find((h) => h.symbol === d.symbol);
    if (!h || h.quantity + 1e-9 < d.quantity) {
      return { error: `No tienes ${d.quantity} unidades de ${d.symbol} para vender` };
    }
  }

  let name = d.name || d.symbol;
  if (!d.name) {
    try {
      name = (await fetchQuote(d.symbol)).name;
    } catch {
      /* sin conexión: usamos el símbolo como nombre */
    }
  }

  const data = { date, symbol: d.symbol, name, side: d.side, quantity: d.quantity, price: d.price, currency: d.currency, fxRate, fees: d.fees, broker: d.broker || null };
  const saved = tradeId ? await prisma.trade.update({ where: { id: tradeId }, data }) : await prisma.trade.create({ data: { userId: user.id, ...data } });
  // Si la compra supera el efectivo (p. ej. posiciones que ya tenías antes de usar la app),
  // la diferencia se registra como aportación propia. Se recalculan todas a partir del historial,
  // de modo que editar o borrar operaciones siempre deja las aportaciones coherentes.
  const { created } = await reconcileOwnContributions(user.id);
  const mine = created.find((c) => c.symbol === saved.symbol && c.date.getTime() === saved.date.getTime());
  revalidatePaths();
  const fxNote = d.currency === "EUR" ? "" : ` (${d.price} ${d.currency} = ${(d.price * fxRate).toFixed(2)} €, cambio ${fxRate.toFixed(4)})`;
  const shortNote = mine ? `. Faltaban ${mine.amount.toFixed(2)} € de efectivo: se han añadido como aportación propia` : "";
  return { ok: `${d.side === "BUY" ? "Compra" : "Venta"} de ${d.quantity} × ${d.symbol} ${tradeId ? "actualizada" : "registrada"}${fxNote}${shortNote}` };
}

function revalidatePaths() {
  for (const p of ["/inversiones", "/operaciones", "/familia", "/cripto", "/acciones", "/etf"]) revalidatePath(p);
}

/** Recalcula las aportaciones propias del usuario actual a partir de su historial de operaciones. */
export async function reconcileAction(): Promise<FormState> {
  const user = await requireUser();
  const r = await reconcileOwnContributions(user.id);
  revalidatePaths();
  const total = r.created.reduce((a, c) => a + c.amount, 0);
  return { ok: `Aportaciones propias recalculadas: ${r.created.length} anotaciones por ${total.toFixed(2)} € en total (antes había ${r.removed}).` };
}

export async function addTradeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return saveTrade(formData);
}

export async function updateTradeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Falta el identificador de la operación" };
  return saveTrade(formData, id);
}

/** Importe, fecha y nota de una aportación escrita a mano por el presidente. */
function parseContributionFields(formData: FormData): { amount: number; date: Date; note: string | null } | { error: string } {
  const amount = parseMoney(formData.get("amount"), { allowNegative: true });
  if (amount === null) return { error: "Importe no válido (distinto de 0 y como máximo 1.000.000 €)" };
  const day = parsePastDay(String(formData.get("date") ?? ""));
  if ("error" in day) return { error: day.error };
  const note = String(formData.get("note") ?? "").trim().slice(0, 120) || null;
  if (note && note.startsWith(OWN_CONTRIBUTION_PREFIX)) return { error: `La nota no puede empezar por «${OWN_CONTRIBUTION_PREFIX}»: ese texto se reserva para las aportaciones automáticas` };
  return { amount, date: day.date, note };
}

export async function updateContributionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const existing = await prisma.contribution.findFirst({ where: { id, user: { familyId: admin.familyId } } });
  if (!existing) return { error: "Aportación no encontrada" };
  const f = parseContributionFields(formData);
  if ("error" in f) return { error: f.error };
  await prisma.contribution.update({ where: { id }, data: { amount: f.amount, date: f.date, note: f.note } });
  await reconcileOwnContributions(existing.userId);
  revalidatePaths();
  return { ok: "Aportación actualizada" };
}

export async function deleteTradeAction(formData: FormData) {
  const user = await requireUser();
  await prisma.trade.deleteMany({ where: { id: String(formData.get("id")), userId: user.id } });
  await reconcileOwnContributions(user.id);
  revalidatePaths();
}

const manualPriceSchema = z.object({
  symbol: symbolSchema,
  price: z.string().transform((s) => Number(s.trim().replace(",", "."))).pipe(z.number().positive("El precio debe ser mayor que 0").max(MAX_PRICE, "Precio demasiado grande")),
});

/** Precio fijado a mano (solo el presidente, y solo para su familia) para valores sin cotización automática. */
export async function setManualPriceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = manualPriceSchema.safeParse({ symbol: formData.get("symbol") ?? "", price: String(formData.get("price") ?? "") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { symbol, price } = parsed.data;
  const known = await prisma.trade.findFirst({ where: { symbol, user: { familyId: admin.familyId } }, select: { name: true } });
  await setManualPrice(admin.familyId, symbol, known?.name ?? symbol, price);
  revalidatePaths();
  return { ok: `Precio de ${symbol} fijado en ${price.toFixed(2)} € para tu familia` };
}

// ---- Acciones de administrador (aportaciones) ----

export async function setAllowanceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const amount = parseMoney(formData.get("amount"), { allowZero: true });
  if (amount === null) return { error: "Importe no válido (entre 0 y 1.000.000 €)" };
  await prisma.family.update({ where: { id: admin.familyId }, data: { monthlyAllowance: amount } });
  revalidatePath("/familia");
  return { ok: `Paga mensual fijada en ${amount.toFixed(2)} €` };
}

/** Registra la paga del mes a todos los miembros activos que todavía no la tengan. */
export async function payMonthlyAllowanceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const ym = String(formData.get("month") ?? "");
  const m = ym.match(/^(\d{4})-(\d{2})$/);
  if (!m || +m[2] < 1 || +m[2] > 12 || +m[1] < 2000 || +m[1] > 2100) return { error: "Mes no válido" };
  const date = new Date(+m[1], +m[2] - 1, 1, 12);
  const end = new Date(+m[1], +m[2], 1);
  const family = await prisma.family.findUniqueOrThrow({ where: { id: admin.familyId }, include: { users: { where: { status: "ACTIVE" }, select: { id: true } } } });
  const note = `Paga mensual ${ym}`;
  // Transacción serializable: dos pulsaciones a la vez no pueden registrar la paga dos veces.
  const created = await prisma.$transaction(
    async (tx) => {
      let n = 0;
      for (const u of family.users) {
        const already = await tx.contribution.findFirst({ where: { userId: u.id, note, date: { gte: date, lt: end } } });
        if (already) continue;
        await tx.contribution.create({ data: { userId: u.id, date, amount: family.monthlyAllowance, note } });
        n++;
      }
      return n;
    },
    { isolationLevel: "Serializable" },
  ).catch(() => -1);
  if (created < 0) return { error: "No se pudo registrar la paga en este momento. Vuelve a intentarlo." };
  revalidatePath("/familia");
  revalidatePath("/inversiones");
  return created ? { ok: `Paga de ${family.monthlyAllowance.toFixed(2)} € registrada a ${created} miembro(s) para ${ym}` } : { error: `Todos los miembros ya tienen la paga de ${ym}` };
}

export async function addContributionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const member = await prisma.user.findFirst({ where: { id: userId, familyId: admin.familyId } });
  if (!member) return { error: "Miembro no válido" };
  const f = parseContributionFields(formData);
  if ("error" in f) return { error: f.error };
  await prisma.contribution.create({ data: { userId, amount: f.amount, date: f.date, note: f.note } });
  await reconcileOwnContributions(userId);
  revalidatePaths();
  return { ok: `Aportación de ${f.amount.toFixed(2)} € registrada a ${member.name}` };
}

export async function deleteContributionAction(formData: FormData) {
  const admin = await requireAdmin();
  const c = await prisma.contribution.findFirst({ where: { id: String(formData.get("id")), user: { familyId: admin.familyId } } });
  if (!c) return;
  await prisma.contribution.delete({ where: { id: c.id } });
  // Al cambiar el efectivo disponible, las aportaciones propias automáticas pueden variar.
  await reconcileOwnContributions(c.userId);
  revalidatePaths();
}
