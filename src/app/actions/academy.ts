"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export type QuizResult = {
  results: { questionId: string; correct: boolean; correctIndex: number; feedback: string }[];
  score: number;
  total: number;
  passed: boolean;
  firstTime: boolean; // la lección se ha superado por primera vez (suma puntos)
};

/** Corrige el quiz de una lección y guarda el progreso. Se supera con todas las respuestas correctas. */
export async function submitQuizAction(lessonId: string, answers: Record<string, number>): Promise<QuizResult | { error: string }> {
  const user = await requireUser();
  const questions = await prisma.quizQuestion.findMany({ where: { lessonId }, orderBy: { order: "asc" } });
  if (questions.length === 0) return { error: "Lección sin quiz" };
  const results = questions.map((q) => ({ questionId: q.id, correct: answers[q.id] === q.correctIndex, correctIndex: q.correctIndex, feedback: q.feedback }));
  const score = results.filter((r) => r.correct).length;
  const passed = score === questions.length;
  const existing = await prisma.lessonProgress.findUnique({ where: { userId_lessonId: { userId: user.id, lessonId } } });
  const firstTime = passed && !existing?.completedAt;
  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId: user.id, lessonId } },
    update: { score, attempts: { increment: 1 }, ...(passed && !existing?.completedAt ? { completedAt: new Date() } : {}) },
    create: { userId: user.id, lessonId, score, attempts: 1, completedAt: passed ? new Date() : null },
  });
  for (const p of ["/inicio", "/academia", "/inversiones", "/familia"]) revalidatePath(p);
  return { results, score, total: questions.length, passed, firstTime };
}
