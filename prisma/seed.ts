import { PrismaClient } from "@prisma/client";
import { COURSES } from "./academia-data";
import { PROPOSALS } from "./proposals-data";

const prisma = new PrismaClient();

/**
 * Carga la Academia. Se ejecuta también contra producción (db:deploy), así que:
 *  - los niveles de curso y el orden de las lecciones son únicos: antes de reasignarlos se desplazan a valores
 *    provisionales, para que insertar o reordenar una lección no choque con el orden antiguo de otra;
 *  - las preguntas del quiz se actualizan en su sitio (por lección y posición) en vez de borrarse y crearse,
 *    para que conserven su id y un quiz abierto durante el despliegue siga corrigiéndose bien;
 *  - cada curso va en una transacción: o se actualiza entero o no se toca.
 */
async function seedAcademy() {
  // Niveles provisionales (fuera del rango 1..6) para poder reordenar cursos sin violar el @@unique de level
  await prisma.course.updateMany({ data: { level: { increment: 1000 } } });
  let lessons = 0;
  for (const c of COURSES) {
    await prisma.$transaction(async (tx) => {
      const course = await tx.course.upsert({
        where: { slug: c.slug },
        update: { level: c.level, title: c.title, description: c.description },
        create: { slug: c.slug, level: c.level, title: c.title, description: c.description },
      });
      await tx.lesson.updateMany({ where: { courseId: course.id }, data: { order: { increment: 1000 } } });
      for (let i = 0; i < c.lessons.length; i++) {
        const l = c.lessons[i];
        const lesson = await tx.lesson.upsert({
          where: { courseId_slug: { courseId: course.id, slug: l.slug } },
          update: { order: i + 1, title: l.title, minutes: l.minutes, body: l.body },
          create: { courseId: course.id, slug: l.slug, order: i + 1, title: l.title, minutes: l.minutes, body: l.body },
        });
        const existing = await tx.quizQuestion.findMany({ where: { lessonId: lesson.id }, orderBy: { order: "asc" } });
        for (let j = 0; j < l.questions.length; j++) {
          const q = l.questions[j];
          const data = { order: j + 1, text: q.text, options: q.options, correctIndex: q.correctIndex, feedback: q.feedback };
          const prev = existing[j];
          if (prev) await tx.quizQuestion.update({ where: { id: prev.id }, data });
          else await tx.quizQuestion.create({ data: { lessonId: lesson.id, ...data } });
        }
        if (existing.length > l.questions.length) await tx.quizQuestion.deleteMany({ where: { id: { in: existing.slice(l.questions.length).map((q) => q.id) } } });
        lessons++;
      }
      // Lecciones que ya no están en el temario: se retiran (dejarían huecos en el orden y contarían como pendientes)
      await tx.lesson.deleteMany({ where: { courseId: course.id, slug: { notIn: c.lessons.map((l) => l.slug) } } });
    });
  }
  // Cursos que ya no existen en los datos: se retiran (con sus lecciones y el progreso asociado)
  await prisma.course.deleteMany({ where: { slug: { notIn: COURSES.map((c) => c.slug) } } });
  console.log(`Academia cargada: ${COURSES.length} cursos, ${lessons} lecciones`);
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

async function main() {
  await seedAcademy();
  await seedProposals();
}

main().finally(() => prisma.$disconnect());
