import { PrismaClient } from "@prisma/client";
import { COURSES } from "./academia-data";

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
}

main().finally(() => prisma.$disconnect());
