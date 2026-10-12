"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { computePortfolio, reconcileOwnContributions } from "@/lib/portfolio";
import { fetchQuote, fxToEurAt, setManualPrice, SUPPORTED_CURRENCIES } from "@/lib/prices";
import type { FormState } from "./auth";

const num = (msg: string) => z.coerce.number({ message: msg });

const tradeSchema = z.object({
  symbol: z.string().trim().toUpperCase().min(1, "Indica el símbolo (p. ej. AAPL, SAN.MC, VWCE.DE)"),
  name: z.string().trim().optional(),
  side: z.enum(["BUY", "SELL"]),
  quantity: num("Cantidad no válida").positive("La cantidad debe ser mayor que 0"),
  price: num("Precio no válido").positive("El precio debe ser mayor que 0"),
  currency: z.enum(SUPPORTED_CURRENCIES).default("EUR"),
  fees: num("Comisión no válida").min(0).default(0),
  date: z.string().min(1, "Indica la fecha"),
  broker: z.string().trim().max(60, "Nombre de entidad demasiado largo").optional(),
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
  const date = new Date(d.date + "T12:00:00");
  if (isNaN(date.getTime())) return { error: "Fecha no válida" };
  if (date.getTime() > Date.now()) return { error: "La fecha no puede ser futura" };

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

export async function updateContributionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const amount = Number(String(formData.get("amount") ?? "").replace(",", "."));
  const dateStr = String(formData.get("date") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;
  const existing = await prisma.contribution.findFirst({ where: { id, user: { familyId: admin.familyId } } });
  if (!existing) return { error: "Aportación no encontrada" };
  if (!Number.isFinite(amount) || amount === 0) return { error: "Importe no válido" };
  const date = new Date(dateStr + "T12:00:00");
  if (isNaN(date.getTime())) return { error: "Fecha no válida" };
  await prisma.contribution.update({ where: { id }, data: { amount, date, note } });
  revalidatePath("/familia");
  revalidatePath("/inversiones");
  return { ok: "Aportación actualizada" };
}

export async function deleteTradeAction(formData: FormData) {
  const user = await requireUser();
  await prisma.trade.deleteMany({ where: { id: String(formData.get("id")), userId: user.id } });
  await reconcileOwnContributions(user.id);
  revalidatePaths();
}

export async function setManualPriceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const symbol = String(formData.get("symbol") ?? "").trim().toUpperCase();
  const price = Number(String(formData.get("price") ?? "").replace(",", "."));
  if (!symbol || !Number.isFinite(price) || price <= 0) return { error: "Símbolo o precio no válidos" };
  const existing = await prisma.priceQuote.findUnique({ where: { symbol } });
  await setManualPrice(symbol, existing?.name ?? symbol, price);
  revalidatePath("/inversiones");
  return { ok: `Precio de ${symbol} fijado en ${price.toFixed(2)} €` };
}

// ---- Acciones de administrador (aportaciones) ----

async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new Error("Solo el presidente del club puede hacer esto");
  return user;
}

export async function setAllowanceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const amount = Number(String(formData.get("amount") ?? "").replace(",", "."));
  if (!Number.isFinite(amount) || amount < 0) return { error: "Importe no válido" };
  await prisma.family.update({ where: { id: admin.familyId }, data: { monthlyAllowance: amount } });
  revalidatePath("/familia");
  return { ok: `Paga mensual fijada en ${amount.toFixed(2)} €` };
}

/** Registra la paga del mes a todos los miembros que todavía no la tengan. */
export async function payMonthlyAllowanceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const ym = String(formData.get("month") ?? "");
  const m = ym.match(/^(\d{4})-(\d{2})$/);
  if (!m) return { error: "Mes no válido" };
  const date = new Date(+m[1], +m[2] - 1, 1, 12);
  const end = new Date(+m[1], +m[2], 1);
  const family = await prisma.family.findUniqueOrThrow({ where: { id: admin.familyId }, include: { users: true } });
  const note = `Paga mensual ${ym}`;
  let created = 0;
  for (const u of family.users) {
    const already = await prisma.contribution.findFirst({ where: { userId: u.id, note, date: { gte: date, lt: end } } });
    if (already) continue;
    await prisma.contribution.create({ data: { userId: u.id, date, amount: family.monthlyAllowance, note } });
    created++;
  }
  revalidatePath("/familia");
  revalidatePath("/inversiones");
  return created ? { ok: `Paga de ${family.monthlyAllowance.toFixed(2)} € registrada a ${created} miembro(s) para ${ym}` } : { error: `Todos los miembros ya tienen la paga de ${ym}` };
}

export async function addContributionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const amount = Number(String(formData.get("amount") ?? "").replace(",", "."));
  const dateStr = String(formData.get("date") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;
  const member = await prisma.user.findFirst({ where: { id: userId, familyId: admin.familyId } });
  if (!member) return { error: "Miembro no válido" };
  if (!Number.isFinite(amount) || amount === 0) return { error: "Importe no válido" };
  const date = new Date(dateStr + "T12:00:00");
  if (isNaN(date.getTime())) return { error: "Fecha no válida" };
  await prisma.contribution.create({ data: { userId, amount, date, note } });
  revalidatePath("/familia");
  revalidatePath("/inversiones");
  return { ok: `Aportación de ${amount.toFixed(2)} € registrada a ${member.name}` };
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
