import { PrismaClient } from "@prisma/client";
import { COURSES } from "./academia-data";
import { PROPOSALS } from "./proposals-data";

const prisma = new PrismaClient();

async function main() {
  let lessons = 0;
  for (const c of COURSES) {
    const course = await prisma.course.upsert({
      where: { slug: c.slug },
      update: { level: c.level, title: c.title, description: c.description },
      create: { slug: c.slug, level: c.level, title: c.title, description: c.description },
    });
    for (let i = 0; i < c.lessons.length; i++) {
      const l = c.lessons[i];
      const lesson = await prisma.lesson.upsert({
        where: { courseId_slug: { courseId: course.id, slug: l.slug } },
        update: { order: i + 1, title: l.title, minutes: l.minutes, body: l.body },
        create: { courseId: course.id, slug: l.slug, order: i + 1, title: l.title, minutes: l.minutes, body: l.body },
      });
      await prisma.quizQuestion.deleteMany({ where: { lessonId: lesson.id } });
      await prisma.quizQuestion.createMany({
        data: l.questions.map((q, j) => ({ lessonId: lesson.id, order: j + 1, text: q.text, options: q.options, correctIndex: q.correctIndex, feedback: q.feedback })),
      });
      lessons++;
    }
  }
  console.log(`Academia cargada: ${COURSES.length} cursos, ${lessons} lecciones`);
  await seedProposals();
}

/** Propuestas del club del repositorio: se identifican por su slug, así que cargarlas de nuevo las actualiza sin duplicar y sin tocar el contador de usos. */
async function seedProposals() {
  for (const p of PROPOSALS) {
    const data = { source: "CLUB", familyId: null, signed: false, title: p.title, theme: p.theme, risk: p.risk, lesson: p.lesson, minChoices: p.minChoices, maxChoices: p.maxChoices };
    const rec = await prisma.proposal.upsert({ where: { slug: p.slug }, update: data, create: { slug: p.slug, ...data } });
    await prisma.proposalOption.deleteMany({ where: { proposalId: rec.id } });
    await prisma.proposalOption.createMany({ data: p.options.map((o, i) => ({ proposalId: rec.id, symbol: o.symbol, name: o.name, kind: o.kind, note: o.note, order: i })) });
  }
  console.log(`Repositorio de propuestas cargado: ${PROPOSALS.length} propuestas del club`);
}

main().finally(() => prisma.$disconnect());
