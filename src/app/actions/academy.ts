"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getCoursesWithProgress } from "@/lib/academy";
import { rateLimit } from "@/lib/ratelimit";

export type QuizResult = {
  results: { questionId: string; correct: boolean; correctIndex: number; feedback: string; hint: string }[];
  score: number;
  total: number;
  passed: boolean;
  firstTime: boolean; // la lección se ha superado por primera vez (suma puntos)
};

/** Corrige el quiz de una lección y guarda el progreso. Se supera con todas las respuestas correctas. */
export async function submitQuizAction(lessonId: string, answers: Record<string, number>): Promise<QuizResult | { error: string }> {
  const user = await requireUser();
  if (typeof lessonId !== "string" || lessonId.length > 40 || typeof answers !== "object" || answers === null) return { error: "Datos no válidos" };
  // Sin límite, las preguntas se podrían resolver probando opciones una a una.
  const limit = await rateLimit(`quiz:${user.id}`, 40, 60 * 60 * 1000);
  if (!limit.ok) return { error: "Has hecho muchos intentos seguidos. Vuelve a leer la lección con calma y prueba dentro de un rato." };
  // El curso debe estar desbloqueado (se completan por orden); la página lo muestra, pero se comprueba también aquí.
  const courses = await getCoursesWithProgress(user.id);
  const course = courses.find((c) => c.lessons.some((l) => l.id === lessonId));
  if (!course) return { error: "Lección no encontrada" };
  if (!course.unlocked) return { error: "Este curso todavía está bloqueado: completa antes el anterior" };
  const questions = await prisma.quizQuestion.findMany({ where: { lessonId }, orderBy: { order: "asc" } });
  if (questions.length === 0) return { error: "Lección sin quiz" };
  const score = questions.filter((q) => answers[q.id] === q.correctIndex).length;
  const passed = score === questions.length;
  // Las respuestas correctas solo se revelan al aprobar; si no, se indica qué preguntas fallan y se puede reintentar.
  // Si falla, cada pregunta mal recibe una pista (sin la respuesta) para que el reintento sea releer y pensar, no probar al azar.
  const results = questions.map((q) => {
    const correct = answers[q.id] === q.correctIndex;
    return { questionId: q.id, correct, correctIndex: passed ? q.correctIndex : -1, feedback: passed ? q.feedback : "", hint: correct ? "" : "Casi. Vuelve a leer la idea clave de la lección y prueba con otra opción." };
  });
  const existing = await prisma.lessonProgress.findUnique({ where: { userId_lessonId: { userId: user.id, lessonId } } });
  const firstTime = passed && !existing?.completedAt;
  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId: user.id, lessonId } },
    // La mejor puntuación se conserva: un intento posterior peor no debe rebajar una lección ya aprobada.
    update: { score: Math.max(score, existing?.score ?? 0), attempts: { increment: 1 }, ...(passed && !existing?.completedAt ? { completedAt: new Date() } : {}) },
    create: { userId: user.id, lessonId, score, attempts: 1, completedAt: passed ? new Date() : null },
  });
  for (const p of ["/inicio", "/academia", "/inversiones", "/familia"]) revalidatePath(p);
  return { results, score, total: questions.length, passed, firstTime };
}
