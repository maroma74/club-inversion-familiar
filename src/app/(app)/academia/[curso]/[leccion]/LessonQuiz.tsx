"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { submitQuizAction, type QuizResult } from "@/app/actions/academy";

type Q = { id: string; text: string; options: string[] };
type Next = { href: string; label: string; courseDone: boolean };

export function LessonQuiz({ lessonId, questions, alreadyDone, next }: { lessonId: string; questions: Q[]; alreadyDone: boolean; next: Next }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  // Preguntas cuya respuesta cambió desde la última corrección: solo a esas se les quita la marca.
  const [changed, setChanged] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const summaryRef = useRef<HTMLDivElement>(null);
  const n = questions.length;
  const answered = Object.keys(answers).length;
  const passed = !!result?.passed;

  // Tras corregir, el resumen recibe el foco para que se lea y se vea el resultado.
  useEffect(() => {
    if (result) summaryRef.current?.focus();
  }, [result]);

  const status = result
    ? passed
      ? `${result.score} de ${n} correctas`
      : `${result.score} de ${n} correctas · necesitas las ${n} para superarla`
    : `${answered} de ${n} respondidas`;

  function submit() {
    setError(null);
    start(async () => {
      const r = await submitQuizAction(lessonId, answers);
      if ("error" in r) setError(r.error);
      else {
        setResult(r);
        setChanged(new Set());
        if (r.passed) router.refresh();
      }
    });
  }

  function restart() {
    if (answered > 0 && !window.confirm("¿Borrar tus respuestas y empezar de nuevo?")) return;
    setAnswers({});
    setResult(null);
    setChanged(new Set());
  }

  return (
    <section aria-labelledby="quiz-titulo" className="flex flex-col gap-4 mt-3 pt-6 border-t border-divider">
      <div className="flex flex-col gap-1">
        <h2 id="quiz-titulo" className="m-0">Comprueba lo aprendido</h2>
        <p className="m-0 text-sm text-neutral-700">
          Necesitas acertar las {n}. Puedes intentarlo todas las veces que quieras: si fallas, te decimos cuál repasar.{alreadyDone && !result ? " Ya superaste esta lección; puedes repasarla." : ""}
        </p>
      </div>

      <div ref={summaryRef} tabIndex={-1} role="status" aria-live="polite" className="text-base outline-none">
        {result ? (
          passed ? (
            <span className="font-medium text-accent-700">
              {status}. {result.firstTime ? "Lección superada." : "Bien repasado."}{" "}
              {result.firstTime && <span className="tag tag-gold ml-1">+10 pts</span>}
            </span>
          ) : (
            <span className="font-medium">{status}.</span>
          )
        ) : (
          <span className="text-sm text-neutral-700">{status}</span>
        )}
      </div>

      {questions.map((q, qi) => {
        const r = changed.has(q.id) ? undefined : result?.results.find((x) => x.questionId === q.id);
        const border = r ? (r.correct ? "var(--color-accent)" : "var(--color-amber-300)") : "var(--color-divider)";
        return (
          <fieldset key={q.id} className="card gap-2.5 min-w-0 m-0" style={{ borderColor: border }}>
            <legend className="float-left w-full font-medium text-[15px] p-0 mb-1">{qi + 1}. {q.text}</legend>
            <div className="clear-both flex flex-col gap-2">
              {q.options.map((label, oi) => {
                const mine = answers[q.id] === oi;
                const wrongMine = !!r && !r.correct && mine;
                return (
                  <label key={oi} className="radio w-full min-h-[44px] px-3 py-2 border rounded-[10px]" style={{ borderColor: wrongMine ? "var(--color-amber-300)" : mine ? "var(--color-accent)" : "var(--color-divider)", background: mine ? "var(--color-accent-100)" : "transparent" }}>
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      checked={mine}
                      onChange={() => {
                        setAnswers((a) => ({ ...a, [q.id]: oi }));
                        setChanged((c) => new Set(c).add(q.id));
                      }}
                    />
                    <span className="dot" />
                    <span className="flex-1">{label}</span>
                    {wrongMine && <span className="tag tag-gold">Tu respuesta</span>}
                    {r && oi === r.correctIndex && <span className="text-sm text-accent-700 font-medium">✓ correcta</span>}
                  </label>
                );
              })}
            </div>
            {r && (
              <div className="text-sm border-t border-divider pt-2 [text-wrap:pretty]">
                {r.correct ? <>Correcto. {r.feedback}</> : <>{r.hint}</>}
              </div>
            )}
          </fieldset>
        );
      })}

      {error && <p role="alert" className="m-0 text-sm font-medium">{error}</p>}

      {passed ? (
        <div className="card card-snug gap-2" style={{ borderColor: "var(--color-accent)" }}>
          <div className="font-heading text-lg">{next.courseDone ? "¡Curso completado!" : "¡Lección superada!"}</div>
          <p className="m-0 text-sm text-neutral-700">{next.courseDone ? "Has terminado todas las lecciones de este curso y se abre el siguiente nivel." : "Sigue con la próxima lección cuando quieras: tu progreso ya está guardado."}</p>
          <div className="flex gap-2 flex-wrap">
            <Link href={next.href} className="btn-primary">{next.label}</Link>
            <button type="button" className="btn-secondary" onClick={restart}>Repasar el quiz</button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2 flex-wrap">
          <button type="button" className="btn-primary" onClick={submit} disabled={answered < n || pending}>{pending ? "Comprobando…" : "Comprobar mis respuestas"}</button>
          <button type="button" className="btn-secondary" onClick={restart}>Empezar de nuevo</button>
          {alreadyDone && <Link href={next.href} className="btn-ghost">{next.label}</Link>}
        </div>
      )}
    </section>
  );
}
