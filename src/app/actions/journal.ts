"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import type { FormState } from "./auth";

const schema = z.object({
  symbol: z.string().trim().toUpperCase().max(20).optional(),
  side: z.enum(["BUY", "SELL", "NOTE"]).default("NOTE"),
  why: z.string().trim().min(3, "Escribe por qué").max(2000),
  exit: z.string().trim().max(300).optional(),
  tradeId: z.string().trim().optional(),
});

export async function saveJournalEntryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  let tradeId: string | null = null;
  if (d.tradeId) {
    const t = await prisma.trade.findFirst({ where: { id: d.tradeId, userId: user.id }, include: { journal: true } });
    if (t && !t.journal) tradeId = t.id;
  }
  await prisma.journalEntry.create({
    data: { userId: user.id, tradeId, symbol: d.symbol || "—", side: d.side, why: d.why, exitCondition: d.exit || null },
  });
  for (const p of ["/inicio", "/academia", "/inversiones"]) revalidatePath(p);
  return { ok: "Entrada guardada en el diario" };
}

export async function deleteJournalEntryAction(formData: FormData) {
  const user = await requireUser();
  await prisma.journalEntry.deleteMany({ where: { id: String(formData.get("id")), userId: user.id } });
  revalidatePath("/inicio");
}
