import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getCoursesWithProgress, getLesson } from "@/lib/academy";
import { DiaryDialog } from "@/components/DiaryDialog";
import { LessonQuiz } from "./LessonQuiz";

export default async function LessonPage({ params }: { params: Promise<{ curso: string; leccion: string }> }) {
  const user = await requireUser();
  const { curso, leccion } = await params;
  const [data, courses] = await Promise.all([getLesson(curso, leccion, user.id), getCoursesWithProgress(user.id)]);
  if (!data) notFound();
  const courseView = courses.find((c) => c.slug === curso);
  if (courseView && !courseView.unlocked) {
    return (
      <div className="flex flex-col gap-4 max-w-[640px]">
        <div className="kicker text-[11px]">Academia</div>
        <h1>Curso bloqueado</h1>
        <p className="m-0 text-neutral-700">«{data.course.title}» se desbloquea al completar el curso anterior.</p>
        <div><Link href="/academia" className="btn-secondary">Volver a la Academia</Link></div>
      </div>
    );
  }
  const { course, lesson, questions, siblings } = data;
  const b = lesson.body;
  const P = ({ children }: { children: React.ReactNode }) => <p className="m-0 text-[17px] leading-[1.6] [text-wrap:pretty]">{children}</p>;

  return (
    <div className="grid gap-10 items-start lg:grid-cols-[minmax(0,1fr)_minmax(220px,280px)]">
      <article className="flex flex-col gap-5 min-w-0 max-w-[720px]">
        <div className="flex gap-1.5 text-[13px] text-neutral-700 items-center">
          <Link href="/academia" className="btn-ghost text-[13px]">Academia</Link>
          <span>/ Nivel {course.level} · {course.title} / Lección {lesson.order}</span>
        </div>
        <header>
          <h1 className="m-0 mb-1.5 text-[52px] leading-[1.05]">{lesson.title}</h1>
          <div className="card-meta text-[13px]">{lesson.minutes} min de lectura · quiz de {questions.length} preguntas · +10 pts al aprobar{lesson.done ? " · superada" : ""}</div>
        </header>
        {b.intro.map((t, i) => <P key={i}>{t}</P>)}
        {b.table && (
          <figure className="card blueprint" style={{ padding: "8px 16px 14px", margin: "6px 0" }}>
            <div className="overflow-x-auto"><table className="table text-[15px]">
              <thead><tr>{b.table.headers.map((h, i) => <th key={i} className={i > 0 ? "text-right" : ""}>{h}</th>)}</tr></thead>
              <tbody>
                {b.table.rows.map((r, i) => (
                  <tr key={i}>{r.map((c, j) => <td key={j} className={j > 0 ? "text-right tabular-nums" : ""}>{c}</td>)}</tr>
                ))}
              </tbody>
            </table></div>
            <figcaption>{b.table.caption}</figcaption>
          </figure>
        )}
        <div className="bg-accent-900 text-paper" style={{ padding: "20px 24px" }}>
          <div className="text-[10px] tracking-[0.1em] uppercase text-accent-300">Idea clave</div>
          <div className="font-heading text-[26px] leading-[1.15] mt-1 [text-wrap:pretty]">{b.keyIdea}</div>
        </div>
        {b.outro.map((t, i) => <P key={i}>{t}</P>)}

        <LessonQuiz lessonId={lesson.id} questions={questions} alreadyDone={lesson.done} />

        <div className="card blueprint gap-2 mt-2" style={{ padding: "18px 20px" }}>
          <div className="card-kicker">Aplícalo en tu cartera</div>
          <div className="text-[15px] [text-wrap:pretty]">{b.apply}</div>
          <div><DiaryDialog label="Escribir en el diario" side="NOTE" /></div>
        </div>
      </article>

      <aside className="lg:sticky lg:top-6 flex flex-col gap-3">
        <div className="card-kicker">Nivel {course.level} · {course.title}</div>
        <div className="flex flex-col border border-divider">
          {siblings.map((s) => {
            const now = s.slug === lesson.slug;
            return (
              <Link key={s.slug} href={`/academia/${course.slug}/${s.slug}`} className="flex gap-2.5 text-[14px] text-ink no-underline border-t border-divider first:border-t-0" style={{ padding: "10px 12px", background: now ? "var(--color-accent-100)" : "transparent", fontWeight: now ? 500 : 400 }}>
                <span className="font-heading w-4 text-neutral-600">{s.order}</span>
                <span className="flex-1">{s.title}</span>
                <span className="text-xs text-accent-700">{now ? "Ahora" : s.done ? "✓" : ""}</span>
              </Link>
            );
          })}
        </div>
        <div className="text-xs text-neutral-700">Al terminar el curso: logro «{course.title}» y paso al Nivel {Math.min(course.level + 1, 6)}.</div>
      </aside>
    </div>
  );
}
