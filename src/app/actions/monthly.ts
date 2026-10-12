"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";
import { fetchQuote, isCrypto } from "@/lib/prices";
import { fetchStockQuote } from "@/lib/stocks";
import { fetchProfile } from "@/lib/fundamentals";
import { reconcileOwnContributions } from "@/lib/portfolio";
import { isDeadlinePassed } from "@/lib/monthly";
import { longText, MAX_MONEY, parseMoney, symbolSchema } from "@/lib/validation";
import type { FormState } from "./auth";

const refresh = (id?: string) => {
  for (const p of ["/cartera", "/cartera/gestion", "/inicio", "/inversiones", "/familia", "/operaciones"]) revalidatePath(p);
  if (id) revalidatePath(`/cartera/gestion/${id}`);
};

const detailsSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Mes no válido"),
  title: z.string().trim().min(3, "Pon un título").max(120),
  lesson: z.string().trim().min(20, "La lección debe explicar la propuesta (mínimo 20 caracteres)").max(8000),
  minChoices: z.coerce.number().int().min(1).max(10).default(1),
  maxChoices: z.coerce.number().int().min(1).max(10).default(1),
  deadline: z.string().optional(),
});

function parseDeadline(s?: string) {
  if (!s) return null;
  const d = new Date(s + "T23:59:00");
  return isNaN(d.getTime()) ? null : d;
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
  let kind = "STOCK";
  if (isCrypto(symbol)) {
    kind = "CRYPTO";
    try {
      const q = await fetchQuote(symbol);
      if (!name) name = q.name;
    } catch {
      return { error: `No se encontró cotización para ${symbol}` };
    }
  } else {
    const q = await fetchStockQuote(symbol);
    if (q.error && q.price === 0) return { error: `No se encontró cotización para ${symbol}` };
    if (!name) name = q.name;
    const profile = await fetchProfile(q.symbol);
    kind = profile.isFund ? "ETF" : "STOCK";
  }
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
    if (amount === null) return { error: `Importe no válido para ${m.name} (entre 0 y ${MAX_MONEY.toLocaleString("es-ES")} €)` };
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
          const c = await tx.contribution.create({ data: { userId: m.id, date: monthDate(p.month), amount, note: `Paga mensual ${p.month} · ${p.title}` } });
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
  // Cerrojo: solo el primer envío cambia DRAFT → PUBLISHED; las aportaciones se crean en la misma transacción.
  const published = await prisma.$transaction(async (tx) => {
    const lock = await tx.monthlyPortfolio.updateMany({ where: { id, familyId: admin.familyId, status: "DRAFT" }, data: { status: "PUBLISHED", publishedAt: new Date() } });
    if (lock.count !== 1) return false;
    for (const a of p.allocations) {
      if (a.amount <= 0 || a.contributionId) continue;
      const c = await tx.contribution.create({ data: { userId: a.userId, date: monthDate(p.month), amount: a.amount, note: `Paga mensual ${p.month} · ${p.title}` } });
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
        const fxRate = q.price > 0 ? q.priceEur / q.price : 1;
        const trade = await tx.trade.create({
          data: { userId: user.id, date: new Date(), symbol: pk.option.symbol, name: q.name || pk.option.name, side: "BUY", quantity, price: q.price, currency: q.currency === "GBp" ? "GBP" : q.currency, fxRate: q.currency === "GBp" ? fxRate * 100 : fxRate, fees: 0, broker: `Cartera ${p.month}` },
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
