/**
 * Importa a la base de datos actual un volcado JSON generado desde la antigua base SQLite
 * (familias, usuarios, operaciones, aportaciones, diario, listas, carteras mensuales…).
 * Uso: DATABASE_URL=... npx tsx prisma/import-json.ts ruta/export.json
 * Es idempotente: usa upsert por id. La Academia debe estar cargada antes (npm run db:seed).
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

const prisma = new PrismaClient();
const file = process.argv[2];
if (!file) {
  console.error("Indica la ruta del JSON exportado");
  process.exit(1);
}
const d = JSON.parse(readFileSync(file, "utf8"));
const date = (v: string | null | undefined) => (v ? new Date(v) : null);

async function main() {
  for (const f of d.families) await prisma.family.upsert({ where: { id: f.id }, update: {}, create: { ...f, createdAt: date(f.createdAt)! } });
  for (const u of d.users) await prisma.user.upsert({ where: { id: u.id }, update: {}, create: { ...u, createdAt: date(u.createdAt)! } });
  for (const i of d.invitations) await prisma.invitation.upsert({ where: { id: i.id }, update: {}, create: { ...i, expiresAt: date(i.expiresAt), createdAt: date(i.createdAt)!, usedAt: date(i.usedAt), revokedAt: date(i.revokedAt) } });
  for (const c of d.contributions) await prisma.contribution.upsert({ where: { id: c.id }, update: {}, create: { ...c, date: date(c.date)!, createdAt: date(c.createdAt)! } });
  for (const t of d.trades) await prisma.trade.upsert({ where: { id: t.id }, update: {}, create: { ...t, date: date(t.date)!, createdAt: date(t.createdAt)! } });
  for (const j of d.journalEntries) await prisma.journalEntry.upsert({ where: { id: j.id }, update: {}, create: { ...j, createdAt: date(j.createdAt)! } });
  for (const q of d.priceQuotes) await prisma.priceQuote.upsert({ where: { symbol: q.symbol }, update: {}, create: { ...q, updatedAt: date(q.updatedAt)! } });
  for (const s of d.snapshots) await prisma.portfolioSnapshot.upsert({ where: { id: s.id }, update: {}, create: { ...s, date: date(s.date)! } });
  for (const w of d.watchlist) await prisma.watchlistItem.upsert({ where: { id: w.id }, update: {}, create: { ...w, createdAt: date(w.createdAt)! } });
  for (const r of d.clubRecs) await prisma.clubRecommendation.upsert({ where: { id: r.id }, update: {}, create: { ...r, date: date(r.date)!, createdAt: date(r.createdAt)! } });
  // Progreso de lecciones: se enlaza por slug de curso y lección (los ids de la Academia son nuevos)
  for (const p of d.lessonProgress) {
    const course = await prisma.course.findUnique({ where: { slug: p.lesson.course.slug } });
    const lesson = course ? await prisma.lesson.findUnique({ where: { courseId_slug: { courseId: course.id, slug: p.lesson.slug } } }) : null;
    if (!lesson) continue;
    await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: p.userId, lessonId: lesson.id } },
      update: {},
      create: { userId: p.userId, lessonId: lesson.id, score: p.score, attempts: p.attempts, completedAt: date(p.completedAt) },
    });
  }
  for (const mp of d.portfolios) {
    const { options, allocations, decisions, ...rest } = mp;
    await prisma.monthlyPortfolio.upsert({ where: { id: mp.id }, update: {}, create: { ...rest, deadline: date(rest.deadline), createdAt: date(rest.createdAt)!, publishedAt: date(rest.publishedAt), closedAt: date(rest.closedAt) } });
    for (const o of options) await prisma.monthlyOption.upsert({ where: { id: o.id }, update: {}, create: o });
    for (const a of allocations) await prisma.monthlyAllocation.upsert({ where: { id: a.id }, update: {}, create: a });
    for (const dec of decisions) {
      const { choices, ...decRest } = dec;
      await prisma.monthlyDecision.upsert({ where: { id: dec.id }, update: {}, create: { ...decRest, submittedAt: date(decRest.submittedAt)! } });
      for (const ch of choices) await prisma.monthlyChoice.upsert({ where: { id: ch.id }, update: {}, create: ch });
    }
  }
  console.log(`Importado: ${d.families.length} familias, ${d.users.length} usuarios, ${d.trades.length} operaciones, ${d.contributions.length} aportaciones, ${d.portfolios.length} carteras mensuales`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
