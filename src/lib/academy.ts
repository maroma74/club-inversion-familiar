/** Academia: cursos por nivel, progreso de lecciones, niveles y puntos. */
import { prisma } from "./prisma";

export const LEVELS = ["Novato", "Aprendiz", "Inversor", "Estratega", "Experto", "Leyenda"] as const;
export const POINTS_PER_LEVEL = 30;
export const POINTS_PER_LESSON = 10;
export const POINTS_PER_BADGE = 10;

export type LevelInfo = { level: number; name: string; points: number; nextAt: number | null; progress: number };

export function levelFromPoints(points: number): LevelInfo {
  const level = Math.min(Math.floor(points / POINTS_PER_LEVEL) + 1, LEVELS.length);
  const nextAt = level < LEVELS.length ? level * POINTS_PER_LEVEL : null;
  return { level, name: LEVELS[level - 1], points, nextAt, progress: nextAt ? (points % POINTS_PER_LEVEL) / POINTS_PER_LEVEL : 1 };
}

export type LessonBody = {
  intro: string[];
  keyIdea: string;
  table?: { headers: string[]; rows: string[][]; caption: string };
  outro: string[];
  apply: string;
};

export type CourseView = {
  id: string;
  slug: string;
  level: number;
  levelName: string;
  title: string;
  description: string;
  lessons: { id: string; slug: string; title: string; order: number; minutes: number; done: boolean; isNext: boolean }[];
  doneCount: number;
  completed: boolean;
  unlocked: boolean;
  current: boolean; // el curso en el que está ahora (primer desbloqueado sin completar)
  nextLesson: { slug: string; title: string } | null;
};

/** Cursos con el progreso de un miembro. Un curso se desbloquea al completar el anterior. */
export async function getCoursesWithProgress(userId: string): Promise<CourseView[]> {
  const courses = await prisma.course.findMany({
    orderBy: { level: "asc" },
    include: { lessons: { orderBy: { order: "asc" }, include: { progress: { where: { userId }, select: { completedAt: true } } } } },
  });
  const out: CourseView[] = [];
  let prevCompleted = true;
  let currentAssigned = false;
  for (const c of courses) {
    const lessons = c.lessons.map((l) => ({ id: l.id, slug: l.slug, title: l.title, order: l.order, minutes: l.minutes, done: !!l.progress[0]?.completedAt, isNext: false }));
    const doneCount = lessons.filter((l) => l.done).length;
    const completed = lessons.length > 0 && doneCount === lessons.length;
    const unlocked = prevCompleted;
    const current = unlocked && !completed && !currentAssigned;
    if (current) currentAssigned = true;
    const next = lessons.find((l) => !l.done) ?? null;
    if (next && unlocked) next.isNext = true;
    out.push({ id: c.id, slug: c.slug, level: c.level, levelName: LEVELS[c.level - 1] ?? `Nivel ${c.level}`, title: c.title, description: c.description, lessons, doneCount, completed, unlocked, current, nextLesson: next ? { slug: next.slug, title: next.title } : null });
    prevCompleted = completed;
  }
  return out;
}

export type LearningStats = { lessonsPassed: number; totalLessons: number; quizAccuracy: number | null; journalEntries: number; points: number };

/** Lecciones superadas, acierto en quiz y entradas de diario de varios miembros. */
export async function getLearningStats(userIds: string[]): Promise<Map<string, LearningStats>> {
  const [totalLessons, progress, entries] = await Promise.all([
    prisma.lesson.count(),
    prisma.lessonProgress.findMany({ where: { userId: { in: userIds } }, select: { userId: true, completedAt: true, score: true, attempts: true } }),
    prisma.journalEntry.groupBy({ by: ["userId"], where: { userId: { in: userIds } }, _count: { _all: true } }),
  ]);
  const out = new Map<string, LearningStats>();
  for (const id of userIds) {
    const mine = progress.filter((p) => p.userId === id);
    const attempted = mine.filter((p) => p.attempts > 0);
    const lessonsPassed = mine.filter((p) => p.completedAt).length;
    out.set(id, {
      lessonsPassed,
      totalLessons,
      quizAccuracy: attempted.length ? attempted.reduce((a, p) => a + p.score, 0) / (attempted.length * 3) : null,
      journalEntries: entries.find((e) => e.userId === id)?._count._all ?? 0,
      points: lessonsPassed * POINTS_PER_LESSON,
    });
  }
  return out;
}

/** Lección completa para la ficha, sin revelar las respuestas correctas al cliente. */
export async function getLesson(courseSlug: string, lessonSlug: string, userId: string) {
  const course = await prisma.course.findUnique({ where: { slug: courseSlug }, include: { lessons: { orderBy: { order: "asc" }, include: { progress: { where: { userId }, select: { completedAt: true, score: true, attempts: true } } } } } });
  if (!course) return null;
  const lesson = course.lessons.find((l) => l.slug === lessonSlug);
  if (!lesson) return null;
  const questions = await prisma.quizQuestion.findMany({ where: { lessonId: lesson.id }, orderBy: { order: "asc" }, select: { id: true, text: true, options: true } });
  return {
    course: { slug: course.slug, level: course.level, levelName: LEVELS[course.level - 1], title: course.title },
    lesson: { id: lesson.id, slug: lesson.slug, order: lesson.order, title: lesson.title, minutes: lesson.minutes, body: lesson.body as LessonBody, done: !!lesson.progress[0]?.completedAt },
    questions: questions.map((q) => ({ id: q.id, text: q.text, options: q.options as string[] })),
    siblings: course.lessons.map((l) => ({ slug: l.slug, title: l.title, order: l.order, done: !!l.progress[0]?.completedAt })),
  };
}
