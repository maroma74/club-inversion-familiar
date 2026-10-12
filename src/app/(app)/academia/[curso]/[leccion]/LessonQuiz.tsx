"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitQuizAction, type QuizResult } from "@/app/actions/academy";

type Q = { id: string; text: string; options: string[] };

export function LessonQuiz({ lessonId, questions, alreadyDone }: { lessonId: string; questions: Q[]; alreadyDone: boolean }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const n = questions.length;
  const answered = Object.keys(answers).length;

  const status = result
    ? result.passed
      ? `${result.score} de ${n} · lección superada${result.firstTime ? ", +10 pts" : ""}`
      : `${result.score} de ${n} · necesitas ${n} para superarla`
    : `${answered} de ${n} respondidas`;

  function submit() {
    setError(null);
    start(async () => {
      const r = await submitQuizAction(lessonId, answers);
      if ("error" in r) setError(r.error);
      else {
        setResult(r);
        if (r.passed) router.refresh();
      }
    });
  }

  return (
    <section className="flex flex-col gap-4 mt-3 pt-6 border-t border-divider">
      <div className="flex justify-between items-baseline gap-3 flex-wrap">
        <h2 className="m-0">Comprueba lo aprendido</h2>
        <span className="text-[13px] text-neutral-700">{status}{alreadyDone && !result ? " · ya superada" : ""}</span>
      </div>
      {questions.map((q, qi) => {
        const r = result?.results.find((x) => x.questionId === q.id);
        const border = r ? (r.correct ? "var(--color-accent)" : "var(--color-neutral-800)") : "var(--color-divider)";
        return (
          <div key={q.id} className="card blueprint gap-2.5" style={{ padding: "18px 20px", borderColor: border }}>
            <div className="font-medium text-[15px]">{qi + 1}. {q.text}</div>
            <div className="flex flex-col gap-2">
              {q.options.map((label, oi) => (
                <label key={oi} className="radio">
                  <input type="radio" name={`q-${q.id}`} checked={answers[q.id] === oi} onChange={() => { setAnswers((a) => ({ ...a, [q.id]: oi })); setResult(null); }} />
                  <span className="dot" />
                  <span>{label}</span>
                  {r && oi === r.correctIndex && <span className="text-xs text-accent-700 font-medium">✓ correcta</span>}
                </label>
              ))}
            </div>
            {r && <div className="text-[13px] text-neutral-800 border-t border-divider pt-2">{r.correct ? "Correcto. " : "No exactamente. "}{r.feedback}</div>}
          </div>
        );
      })}
      {error && <p className="m-0 text-[13px] text-neutral-800">{error}</p>}
      <div className="flex gap-2 flex-wrap">
        <button type="button" className="btn-primary blueprint" onClick={submit} disabled={answered < n || pending}>{pending ? "Corrigiendo…" : "Corregir"}</button>
        <button type="button" className="btn-secondary" onClick={() => { setAnswers({}); setResult(null); }}>Reiniciar</button>
      </div>
    </section>
  );
}
