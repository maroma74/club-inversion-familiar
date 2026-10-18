"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";
import { firstName } from "@/lib/names";
import { OWN_CONTRIBUTION_PREFIX, reconcileOwnContributions } from "@/lib/portfolio";
import { firstOversell } from "@/lib/ledger";
import { fetchQuote, fxToEurAt, setManualPrice, SUPPORTED_CURRENCIES } from "@/lib/prices";
import { allowanceNote, allowanceWhere } from "@/lib/allowance";
import { eur, fmtDate } from "@/lib/format";
import { logError } from "@/lib/log";
import { currentMonthYm, dateSchema, MAX_PRICE, MAX_QUANTITY, num, parseMoney, parsePastDay, shortText, symbolSchema } from "@/lib/validation";
import type { FormState } from "./auth";

/**
 * Las compras hechas al enviar la decisión de la cartera del mes son el registro de esa decisión: se pueden ajustar
 * al precio, cantidad o comisión reales del bróker (rara vez coinciden con la cotización del momento), pero no
 * cambiar de valor ni de tipo, ni borrarse.
 */
async function isMonthlyDecisionTrade(tradeId: string) {
  return Boolean(await prisma.monthlyChoice.findFirst({ where: { tradeId }, select: { id: true } }));
}

/**
 * ¿Deja el historial coherente? Se reproduce con la operación nueva (o editada) puesta en su fecha, para que
 * no se pueda vender lo que no se tenía ese día ni encoger o quitar una compra de la que después se vendió.
 */
async function historyProblem(userId: string, candidate: { id?: string; symbol: string; side: string; quantity: number; date: Date } | null, excludeId?: string): Promise<string | null> {
  const trades = await prisma.trade.findMany({ where: { userId, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { symbol: true, side: true, quantity: true, date: true, createdAt: true } });
  const over = firstOversell(candidate ? [...trades, { ...candidate, createdAt: null }] : trades);
  if (!over) return null;
  const held = over.held.toLocaleString("es-ES", { maximumFractionDigits: 6 });
  return `El ${fmtDate(over.date)} no tenías ${over.wanted.toLocaleString("es-ES", { maximumFractionDigits: 6 })} unidades de ${over.symbol} para vender (tenías ${held}). Revisa las fechas y cantidades de tus operaciones.`;
}

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
  let monthly = false;
  let existing: { symbol: string; side: string } | null = null;
  if (tradeId) {
    existing = await prisma.trade.findFirst({ where: { id: tradeId, userId: user.id }, select: { symbol: true, side: true } });
    if (!existing) return { error: "Operación no encontrada" };
    monthly = await isMonthlyDecisionTrade(tradeId);
  }
  const parsed = tradeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (monthly && existing && (d.symbol !== existing.symbol || d.side !== existing.side)) return { error: "Esta compra forma parte de tu decisión de la cartera del mes: puedes ajustar precio, cantidad, comisión o entidad, pero no cambiar el valor ni el tipo" };
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

  // El historial se reproduce con esta operación en su fecha (al editar, sin la versión original).
  const problem = await historyProblem(user.id, { symbol: d.symbol, side: d.side, quantity: d.quantity, date }, tradeId);
  if (problem) return { error: problem };

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
  // La elección de la cartera del mes guarda el precio de ejecución en euros y la cantidad: se mantienen al día
  if (monthly) await prisma.monthlyChoice.updateMany({ where: { tradeId: saved.id }, data: { price: d.price * fxRate, quantity: d.quantity } });
  // Si la compra supera el efectivo (p. ej. posiciones que ya tenías antes de usar la app),
  // la diferencia se registra como aportación propia. Se recalculan todas a partir del historial,
  // de modo que editar o borrar operaciones siempre deja las aportaciones coherentes.
  const { created } = await reconcileOwnContributions(user.id);
  const mine = created.find((c) => c.symbol === saved.symbol && c.date.getTime() === saved.date.getTime());
  revalidatePaths();
  const fxNote = d.currency === "EUR" ? "" : ` (${d.price} ${d.currency} = ${eur(d.price * fxRate)}, cambio ${fxRate.toFixed(4)})`;
  const shortNote = mine ? `. Faltaban ${eur(mine.amount)} de efectivo: se han añadido como aportación propia` : "";
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
  return { ok: `Aportaciones propias recalculadas: ${r.created.length} anotaciones por ${eur(total)} en total (antes había ${r.removed}).` };
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

/** Aportaciones que no se editan ni borran a mano: las automáticas y las ligadas al importe de una cartera del mes. */
async function protectedContribution(c: { id: string; note: string | null }): Promise<string | null> {
  if (c.note?.startsWith(OWN_CONTRIBUTION_PREFIX)) return "Las aportaciones propias se calculan solas a partir de las operaciones; no se editan a mano.";
  if (await prisma.monthlyAllocation.findFirst({ where: { contributionId: c.id }, select: { id: true } })) return "Esta aportación es el importe de una cartera del mes: cámbialo desde la gestión de esa cartera.";
  return null;
}

export async function updateContributionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const existing = await prisma.contribution.findFirst({ where: { id, user: { familyId: admin.familyId } } });
  if (!existing) return { error: "Aportación no encontrada" };
  const blocked = await protectedContribution(existing);
  if (blocked) return { error: blocked };
  const f = parseContributionFields(formData);
  if ("error" in f) return { error: f.error };
  await prisma.contribution.update({ where: { id }, data: { amount: f.amount, date: f.date, note: f.note } });
  await reconcileOwnContributions(existing.userId);
  revalidatePaths();
  return { ok: "Aportación actualizada" };
}

export async function deleteTradeAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));
  const trade = await prisma.trade.findFirst({ where: { id, userId: user.id }, select: { id: true } });
  if (!trade) return;
  // Ni las compras de una decisión del mes ni una compra de la que después se vendió (dejaría ventas en el aire).
  if (await isMonthlyDecisionTrade(id)) return;
  if (await historyProblem(user.id, null, id)) return;
  await prisma.trade.deleteMany({ where: { id, userId: user.id } });
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
  return { ok: `Precio de ${symbol} fijado en ${eur(price)} para tu familia` };
}

// ---- Acciones de administrador (aportaciones) ----

export async function setAllowanceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const amount = parseMoney(formData.get("amount"), { allowZero: true });
  if (amount === null) return { error: "Importe no válido (entre 0 y 1.000.000 €)" };
  await prisma.family.update({ where: { id: admin.familyId }, data: { monthlyAllowance: amount, allowanceSetAt: new Date() } });
  revalidatePath("/familia");
  revalidatePath("/empezar");
  return { ok: `Paga mensual fijada en ${eur(amount)}` };
}

/** Registra la paga del mes a todos los miembros activos que todavía no la tengan. */
export async function payMonthlyAllowanceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const ym = String(formData.get("month") ?? "");
  const m = ym.match(/^(\d{4})-(\d{2})$/);
  if (!m || +m[2] < 1 || +m[2] > 12 || +m[1] < 2000 || +m[1] > 2100) return { error: "Mes no válido" };
  if (ym > currentMonthYm()) return { error: "No se puede repartir la paga de un mes que todavía no ha empezado" };
  const date = new Date(+m[1], +m[2] - 1, 1, 12);
  const end = new Date(+m[1], +m[2], 1);
  const family = await prisma.family.findUniqueOrThrow({ where: { id: admin.familyId }, include: { users: { where: { status: "ACTIVE" }, select: { id: true } } } });
  const note = allowanceNote(ym);
  // Transacción serializable: dos pulsaciones a la vez no pueden registrar la paga dos veces.
  // Un conflicto de serialización (otro recálculo escribiendo aportaciones) se reintenta un par de veces.
  let created = -1;
  for (let attempt = 0; attempt < 3 && created < 0; attempt++) {
    created = await prisma.$transaction(
      async (tx) => {
        let n = 0;
        for (const u of family.users) {
          // «Ya tiene la paga» incluye la que llegó al publicar una cartera del mes (nota «Paga mensual AAAA-MM · título»).
          const already = await tx.contribution.findFirst({ where: { userId: u.id, date: { gte: date, lt: end }, ...allowanceWhere(ym) } });
          if (already) continue;
          await tx.contribution.create({ data: { userId: u.id, date, amount: family.monthlyAllowance, note } });
          n++;
        }
        return n;
      },
      { isolationLevel: "Serializable" },
    ).catch((e) => {
      const code = typeof e === "object" && e && "code" in e ? (e as { code?: string }).code : undefined;
      if (code !== "P2034") logError("invest.pay-allowance", e, { familyId: admin.familyId, month: ym });
      return -1;
    });
  }
  if (created < 0) return { error: "No se pudo registrar la paga en este momento. Vuelve a intentarlo." };
  revalidatePath("/familia");
  revalidatePath("/inversiones");
  return created ? { ok: `Paga de ${eur(family.monthlyAllowance)} registrada a ${created} ${created === 1 ? "miembro" : "miembros"} para ${ym}` } : { error: `Todos los miembros ya tienen la paga de ${ym}` };
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
  return { ok: `Aportación de ${eur(f.amount)} registrada a ${firstName(member.name)}` };
}

export async function deleteContributionAction(formData: FormData) {
  const admin = await requireAdmin();
  const c = await prisma.contribution.findFirst({ where: { id: String(formData.get("id")), user: { familyId: admin.familyId } } });
  if (!c || (await protectedContribution(c))) return;
  await prisma.contribution.delete({ where: { id: c.id } });
  // Al cambiar el efectivo disponible, las aportaciones propias automáticas pueden variar.
  await reconcileOwnContributions(c.userId);
  revalidatePaths();
}
