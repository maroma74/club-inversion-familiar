"use server";

import { allowanceNote, allowanceWhere } from "@/lib/allowance";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";
import { firstName } from "@/lib/names";
import { fetchQuote } from "@/lib/prices";
import { describeSymbol } from "@/lib/symbolInfo";
import { reconcileOwnContributions } from "@/lib/portfolio";
import { isDeadlinePassed } from "@/lib/monthly";
import { fmtDate } from "@/lib/format";
import { clubEndOfDay, currentMonthYm, longText, MAX_MONEY, monthSchema, parseMoney, symbolSchema, todayYmd } from "@/lib/validation";
import type { FormState } from "./auth";

/** Las carteras se preparan como mucho con un mes de adelanto: la paga no puede adelantarse más que eso. */
function nextMonthYm() {
  const [y, m] = currentMonthYm().split("-").map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const refresh = (id?: string) => {
  for (const p of ["/cartera", "/cartera/gestion", "/inicio", "/inversiones", "/familia", "/operaciones"]) revalidatePath(p);
  if (id) revalidatePath(`/cartera/gestion/${id}`);
};

const detailsSchema = z.object({
  month: monthSchema,
  title: z.string().trim().min(3, "Pon un título").max(120),
  lesson: z.string().trim().min(20, "La lección debe explicar la propuesta (mínimo 20 caracteres)").max(8000),
  minChoices: z.coerce.number().int().min(1).max(10).default(1),
  maxChoices: z.coerce.number().int().min(1).max(10).default(1),
  deadline: z.string().optional(),
});

/** Fecha límite (AAAA-MM-DD) hasta las 23:59 de ese día en Madrid. Un formato raro se ignora en vez de dar una fecha cualquiera. */
function parseDeadline(s?: string) {
  if (!s) return null;
  return clubEndOfDay(s);
}

export async function createPortfolioAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = detailsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (d.minChoices > d.maxChoices) return { error: "El mínimo de opciones no puede superar el máximo" };
  if (await prisma.monthlyPortfolio.findUnique({ where: { familyId_month: { familyId: admin.familyId, month: d.month } } })) return { error: "Ya existe una cartera para ese mes" };
  const members = await prisma.user.findMany({ where: { familyId: admin.familyId, status: "ACTIVE" }, select: { id: true } });
  const p = await prisma.monthlyPortfolio.create({
    data: {
      familyId: admin.familyId,
      month: d.month,
      title: d.title,
      lesson: d.lesson,
      minChoices: d.minChoices,
      maxChoices: d.maxChoices,
      deadline: parseDeadline(d.deadline),
      createdById: admin.id,
      allocations: { create: members.map((m) => ({ userId: m.id, amount: admin.family.monthlyAllowance })) },
    },
  });
  refresh(p.id);
  redirect(`/cartera/gestion/${p.id}`);
}

export async function updatePortfolioAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const p = await prisma.monthlyPortfolio.findFirst({ where: { id, familyId: admin.familyId } });
  if (!p) return { error: "Cartera no encontrada" };
  if (p.status === "CLOSED") return { error: "La cartera está cerrada" };
  const parsed = detailsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (d.minChoices > d.maxChoices) return { error: "El mínimo de opciones no puede superar el máximo" };
  // Publicada, la paga ya se registró con la nota de ese mes: cambiarlo permitiría pagar dos veces.
  if (d.month !== p.month && p.status !== "DRAFT") return { error: "El mes de una cartera publicada no se puede cambiar" };
  if (d.month !== p.month && (await prisma.monthlyPortfolio.findUnique({ where: { familyId_month: { familyId: admin.familyId, month: d.month } } }))) return { error: "Ya existe otra cartera para ese mes" };
  await prisma.monthlyPortfolio.update({ where: { id }, data: { month: d.month, title: d.title, lesson: d.lesson, minChoices: d.minChoices, maxChoices: d.maxChoices, deadline: parseDeadline(d.deadline) } });
  refresh(id);
  return { ok: "Cartera guardada" };
}

export async function addOptionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const symParsed = symbolSchema.safeParse(formData.get("symbol") ?? "");
  if (!symParsed.success) return { error: symParsed.error.issues[0].message };
  const symbol = symParsed.data;
  let name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const note = String(formData.get("note") ?? "").trim().slice(0, 300) || null;
  const p = await prisma.monthlyPortfolio.findFirst({ where: { id, familyId: admin.familyId }, include: { _count: { select: { options: true } } } });
  if (!p) return { error: "Cartera no encontrada" };
  if (p.status === "CLOSED") return { error: "La cartera está cerrada" };
  if (p._count.options >= 12) return { error: "Máximo 12 opciones por cartera" };
  const described = await describeSymbol(symbol, name);
  if (!described.ok) return { error: described.error };
  name = described.info.name;
  const kind = described.info.kind;
  await prisma.monthlyOption.upsert({
    where: { portfolioId_symbol: { portfolioId: id, symbol } },
    update: { name, note },
    create: { portfolioId: id, symbol, name, kind, note, order: p._count.options },
  });
  refresh(id);
  return { ok: `${symbol} añadido` };
}

export async function removeOptionAction(formData: FormData) {
  const admin = await requireAdmin();
  const opt = await prisma.monthlyOption.findFirst({ where: { id: String(formData.get("optionId")), portfolio: { familyId: admin.familyId } }, include: { _count: { select: { choices: true } }, portfolio: true } });
  if (!opt || opt.portfolio.status === "CLOSED" || opt._count.choices > 0) return;
  await prisma.monthlyOption.delete({ where: { id: opt.id } });
  refresh(opt.portfolioId);
}

/** Importe por miembro. Si la cartera ya está publicada, actualiza la aportación ligada (salvo si el miembro ya ha decidido). */
export async function setAllocationsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const p = await prisma.monthlyPortfolio.findFirst({ where: { id, familyId: admin.familyId }, include: { allocations: true, decisions: { select: { userId: true } } } });
  if (!p) return { error: "Cartera no encontrada" };
  if (p.status === "CLOSED") return { error: "La cartera está cerrada" };
  const decided = new Set(p.decisions.map((d) => d.userId));
  const members = await prisma.user.findMany({ where: { familyId: admin.familyId, status: "ACTIVE" }, select: { id: true, name: true } });
  const touched: string[] = [];
  for (const m of members) {
    const raw = formData.get(`amount_${m.id}`);
    if (raw === null) continue;
    const amount = parseMoney(raw, { allowZero: true });
    if (amount === null) return { error: `Importe no válido para ${firstName(m.name)} (entre 0 y ${MAX_MONEY.toLocaleString("es-ES")} €)` };
    if (decided.has(m.id)) continue; // ya ha invertido: no se toca
    await prisma.$transaction(async (tx) => {
      const alloc = await tx.monthlyAllocation.upsert({
        where: { portfolioId_userId: { portfolioId: id, userId: m.id } },
        update: { amount },
        create: { portfolioId: id, userId: m.id, amount },
      });
      if (p.status === "PUBLISHED") {
        if (alloc.contributionId) await tx.contribution.update({ where: { id: alloc.contributionId }, data: { amount } });
        else if (amount > 0) {
          const c = await linkAllowance(tx, m.id, p.month, p.title, amount);
          await tx.monthlyAllocation.update({ where: { id: alloc.id }, data: { contributionId: c.id } });
        }
        touched.push(m.id);
      }
    });
  }
  for (const uid of touched) await reconcileOwnContributions(uid);
  refresh(id);
  return { ok: "Importes guardados" };
}

function monthDate(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1, 12);
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * La paga de un mes se registra una sola vez: si el miembro ya la cobró por el reparto manual de Familia,
 * la cartera se liga a esa aportación (ajustando su importe) en vez de crear otra.
 */
async function linkAllowance(tx: Tx, userId: string, month: string, title: string, amount: number) {
  const [y, m] = month.split("-").map(Number);
  const existing = await tx.contribution.findFirst({ where: { userId, date: { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) }, ...allowanceWhere(month) } });
  if (existing) return tx.contribution.update({ where: { id: existing.id }, data: { amount, note: `${allowanceNote(month)} · ${title}` } });
  return tx.contribution.create({ data: { userId, date: monthDate(month), amount, note: `${allowanceNote(month)} · ${title}` } });
}

/** Publica la cartera: los miembros reciben su importe como aportación y pueden decidir. */
export async function publishAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const p = await prisma.monthlyPortfolio.findFirst({ where: { id, familyId: admin.familyId }, include: { options: true, allocations: true } });
  if (!p) return { error: "Cartera no encontrada" };
  if (p.status !== "DRAFT") return { error: "Solo se publican borradores" };
  if (p.options.length === 0) return { error: "Añade al menos una opción de inversión" };
  if (p.allocations.every((a) => a.amount <= 0)) return { error: "Asigna un importe a algún miembro" };
  if (p.options.length < p.minChoices) return { error: `Hay menos opciones (${p.options.length}) que el mínimo a elegir (${p.minChoices})` };
  if (p.month > nextMonthYm()) return { error: "Solo se puede publicar la cartera del mes actual o del siguiente: la paga no se adelanta más" };
  // Cerrojo: solo el primer envío cambia DRAFT → PUBLISHED; las aportaciones se crean en la misma transacción.
  const published = await prisma.$transaction(async (tx) => {
    const lock = await tx.monthlyPortfolio.updateMany({ where: { id, familyId: admin.familyId, status: "DRAFT" }, data: { status: "PUBLISHED", publishedAt: new Date() } });
    if (lock.count !== 1) return false;
    for (const a of p.allocations) {
      if (a.amount <= 0 || a.contributionId) continue;
      const c = await linkAllowance(tx, a.userId, p.month, p.title, a.amount);
      await tx.monthlyAllocation.update({ where: { id: a.id }, data: { contributionId: c.id } });
    }
    return true;
  });
  if (!published) return { error: "La cartera ya se había publicado" };
  for (const a of p.allocations) if (a.amount > 0) await reconcileOwnContributions(a.userId);
  refresh(id);
  return { ok: "Cartera publicada: los miembros ya pueden decidir" };
}

export async function closeAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await prisma.monthlyPortfolio.updateMany({ where: { id, familyId: admin.familyId, status: "PUBLISHED" }, data: { status: "CLOSED", closedAt: new Date() } });
  refresh(id);
}

export async function reopenAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await prisma.monthlyPortfolio.updateMany({ where: { id, familyId: admin.familyId, status: "CLOSED" }, data: { status: "PUBLISHED", closedAt: null } });
  refresh(id);
}

const scheduleSchema = z.object({ id: z.string().min(1), deadline: z.string().trim().optional().default("") });

/**
 * Plazo de una cartera publicada o cerrada: lo amplía (o lo quita) y, si estaba cerrada, la reabre con ese plazo.
 * Las decisiones ya enviadas y la paga del mes no se tocan; los que faltan vuelven a poder decidir.
 */
export async function scheduleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = scheduleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Datos no válidos" };
  const { id, deadline: raw } = parsed.data;
  const p = await prisma.monthlyPortfolio.findFirst({ where: { id, familyId: admin.familyId }, select: { status: true } });
  if (!p) return { error: "Cartera no encontrada" };
  if (p.status === "DRAFT") return { error: "El plazo de un borrador se cambia en «Propuesta y lección»" };
  let deadline: Date | null = null;
  if (raw) {
    deadline = clubEndOfDay(raw);
    if (!deadline) return { error: "Fecha no válida" };
    if (raw < todayYmd()) return { error: "El nuevo plazo no puede ser anterior a hoy" };
  }
  const reopened = p.status === "CLOSED";
  await prisma.monthlyPortfolio.update({ where: { id }, data: { deadline, ...(reopened ? { status: "PUBLISHED", closedAt: null } : {}) } });
  refresh(id);
  const until = deadline ? `hasta el ${fmtDate(deadline)}` : "sin fecha límite";
  return { ok: reopened ? `Cartera reabierta ${until}: los que faltan ya pueden decidir.` : `Plazo actualizado: abierta ${until}.` };
}

export async function deletePortfolioAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await prisma.monthlyPortfolio.deleteMany({ where: { id, familyId: admin.familyId, status: "DRAFT" } });
  refresh();
  redirect("/cartera/gestion");
}

/** El miembro envía su decisión: elige opciones, reparte su importe, argumenta y se ejecutan las compras. */
export async function submitDecisionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = String(formData.get("portfolioId") ?? "");
  const p = await prisma.monthlyPortfolio.findFirst({ where: { id, familyId: user.familyId }, include: { options: true, allocations: { where: { userId: user.id } }, decisions: { where: { userId: user.id } } } });
  if (!p) return { error: "Cartera no encontrada" };
  if (p.status !== "PUBLISHED") return { error: "La cartera no está abierta" };
  if (isDeadlinePassed(p)) return { error: "El plazo para decidir ha terminado" };
  if (p.decisions.length > 0) return { error: "Ya has enviado tu decisión" };
  const allocation = p.allocations[0]?.amount ?? 0;
  if (allocation <= 0) return { error: "No tienes importe asignado este mes" };
  const argParsed = longText(4000).safeParse(formData.get("argument") ?? "");
  if (!argParsed.success) return { error: argParsed.error.issues[0].message };
  const argument = argParsed.data;
  if (argument.length < 20) return { error: "Argumenta tu decisión (al menos 20 caracteres)" };

  const picks = p.options
    .filter((o) => formData.get(`pick_${o.id}`) === "on")
    .map((o) => ({
      option: o,
      amount: parseMoney(formData.get(`amount_${o.id}`) ?? "0") ?? NaN,
      why: String(formData.get(`why_${o.id}`) ?? "").trim().slice(0, 2000),
      exit: String(formData.get(`exit_${o.id}`) ?? "").trim().slice(0, 1000) || null,
    }));
  if (picks.length < p.minChoices) return { error: `Elige al menos ${p.minChoices} ${p.minChoices === 1 ? "opción" : "opciones"}` };
  if (picks.length > p.maxChoices) return { error: `Puedes elegir como máximo ${p.maxChoices} ${p.maxChoices === 1 ? "opción" : "opciones"}` };
  for (const pk of picks) {
    if (!Number.isFinite(pk.amount) || pk.amount <= 0) return { error: `Indica cuánto inviertes en ${pk.option.symbol}` };
    if (pk.why.length < 10) return { error: `Explica por qué eliges ${pk.option.symbol} (al menos 10 caracteres)` };
  }
  const total = picks.reduce((a, pk) => a + pk.amount, 0);
  if (total > allocation + 0.01) return { error: `La suma (${total.toFixed(2)} €) supera tu importe asignado (${allocation.toFixed(2)} €)` };

  // Cotizaciones de ejecución
  const quotes: Record<string, Awaited<ReturnType<typeof fetchQuote>>> = {};
  for (const pk of picks) {
    try {
      quotes[pk.option.symbol] = await fetchQuote(pk.option.symbol);
    } catch {
      return { error: `No se pudo obtener el precio de ${pk.option.symbol}. Inténtalo de nuevo en unos minutos.` };
    }
  }

  // Decisión, compras, diario y elecciones en una sola transacción: o se guarda todo o nada
  // (el @@unique de la decisión impide dos envíos a la vez del mismo miembro).
  try {
    await prisma.$transaction(async (tx) => {
      const decision = await tx.monthlyDecision.create({ data: { portfolioId: id, userId: user.id, argument } });
      for (const pk of picks) {
        const q = quotes[pk.option.symbol];
        if (!(q.priceEur > 0)) throw new Error("SIN_PRECIO");
        const quantity = pk.amount / q.priceEur;
        // Londres cotiza en peniques («GBp»): la operación se guarda en libras, con el cambio de libras a euros.
        const pence = q.currency === "GBp";
        const price = pence ? q.price / 100 : q.price;
        const fxRate = price > 0 ? q.priceEur / price : 1;
        const trade = await tx.trade.create({
          data: { userId: user.id, date: new Date(), symbol: pk.option.symbol, name: q.name || pk.option.name, side: "BUY", quantity, price, currency: pence ? "GBP" : q.currency, fxRate, fees: 0, broker: `Cartera ${p.month}` },
        });
        const entry = await tx.journalEntry.create({ data: { userId: user.id, tradeId: trade.id, symbol: pk.option.symbol, side: "BUY", why: pk.why, exitCondition: pk.exit } });
        await tx.monthlyChoice.create({ data: { decisionId: decision.id, optionId: pk.option.id, amount: pk.amount, why: pk.why, exitCondition: pk.exit, tradeId: trade.id, journalEntryId: entry.id, price: q.priceEur, quantity } });
      }
    });
  } catch (e) {
    if (typeof e === "object" && e && "code" in e && (e as { code?: string }).code === "P2002") return { error: "Ya has enviado tu decisión" };
    if (e instanceof Error && e.message === "SIN_PRECIO") return { error: "No se pudo obtener un precio válido para alguna opción. Inténtalo de nuevo en unos minutos." };
    throw e;
  }
  await reconcileOwnContributions(user.id);
  refresh(id);
  return { ok: `Decisión enviada: ${picks.map((pk) => `${pk.option.symbol} ${pk.amount.toFixed(2)} €`).join(", ")}` };
}

/**
 * El presidente reconoce una compra hecha a mano como la decisión de ese miembro en la cartera del mes: se crea
 * (o amplía) su decisión con esa compra, con el porqué de su diario si lo escribió. No mueve dinero: la compra ya
 * existe y se pagó con su efectivo; si el miembro no tenía importe asignado se anota el coste como su importe,
 * sin registrar paga nueva.
 */
export async function adoptTradeAsDecisionAction(formData: FormData) {
  const admin = await requireAdmin();
  const portfolioId = String(formData.get("portfolioId") ?? "");
  const tradeId = String(formData.get("tradeId") ?? "");
  const { getPortfolioFull, findUnlinkedTrades } = await import("@/lib/monthly");
  const p = await getPortfolioFull(portfolioId, admin.familyId);
  if (!p || p.status === "DRAFT") return;
  const candidate = (await findUnlinkedTrades(p)).find((t) => t.id === tradeId);
  if (!candidate) return;
  const when = fmtDate(candidate.date);
  const why = candidate.why ?? `Compra hecha el ${when} fuera del formulario de la cartera del mes; reconocida por el presidente.`;
  await prisma.$transaction(async (tx) => {
    const existing = await tx.monthlyDecision.findUnique({ where: { portfolioId_userId: { portfolioId, userId: candidate.userId } } });
    const decision = existing ?? (await tx.monthlyDecision.create({ data: { portfolioId, userId: candidate.userId, argument: why, submittedAt: candidate.date } }));
    await tx.monthlyChoice.create({ data: { decisionId: decision.id, optionId: candidate.optionId, amount: candidate.costEur, why, exitCondition: null, tradeId: candidate.id, journalEntryId: candidate.journalEntryId, price: candidate.priceEur, quantity: candidate.quantity } });
    const alloc = await tx.monthlyAllocation.findUnique({ where: { portfolioId_userId: { portfolioId, userId: candidate.userId } } });
    if (!alloc) await tx.monthlyAllocation.create({ data: { portfolioId, userId: candidate.userId, amount: candidate.costEur } });
    else if (alloc.amount < candidate.costEur) await tx.monthlyAllocation.update({ where: { id: alloc.id }, data: { amount: candidate.costEur } });
  });
  refresh(portfolioId);
  revalidatePath(`/cartera/historial/${portfolioId}`);
}
