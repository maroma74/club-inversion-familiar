import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getCoursesWithProgress, getLesson } from "@/lib/academy";
import { DiaryDialog } from "@/components/DiaryDialog";
import { LessonQuiz } from "./LessonQuiz";

function P({ children }: { children: React.ReactNode }) {
  return <p className="m-0 text-[17px] leading-[1.6] [text-wrap:pretty]">{children}</p>;
}

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

  // Qué viene después de aprobar: la siguiente lección del curso o, al terminar el curso, el primero del siguiente nivel.
  const idx = siblings.findIndex((x) => x.slug === lesson.slug);
  const nextPending = siblings.find((x, i) => i > idx && !x.done) ?? siblings.find((x) => x.slug !== lesson.slug && !x.done);
  const nextCourse = courses[courses.findIndex((c) => c.slug === course.slug) + 1];
  const next = nextPending
    ? { href: `/academia/${course.slug}/${nextPending.slug}`, label: "Siguiente lección", courseDone: false }
    : nextCourse?.lessons[0]
      ? { href: `/academia/${nextCourse.slug}/${nextCourse.lessons[0].slug}`, label: `Empezar el Nivel ${nextCourse.level}`, courseDone: true }
      : { href: "/academia", label: "Volver a la Academia", courseDone: true };

  return (
    <div className="grid gap-10 items-start lg:grid-cols-[minmax(0,1fr)_minmax(220px,280px)]">
      <article className="flex flex-col gap-5 min-w-0 max-w-[720px]">
        <div className="flex gap-1.5 text-sm text-neutral-700 items-center flex-wrap">
          <Link href="/academia" className="btn-ghost">Academia</Link>
          <span>/ Nivel {course.level} · {course.title} / Lección {lesson.order}</span>
        </div>
        <header>
          <h1 className="m-0 mb-1.5 text-[clamp(28px,6vw,40px)] leading-[1.1]">{lesson.title}</h1>
          <div className="card-meta text-sm">{lesson.minutes} min de lectura · quiz de {questions.length} preguntas · +10 pts al aprobar{lesson.done ? " · superada" : ""}</div>
        </header>
        {b.intro.map((t, i) => <P key={i}>{t}</P>)}
        {b.table && (
          <figure className="card card-table my-1.5">
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
        <div className="bg-accent-900 text-paper rounded-[12px] p-5 md:p-6">
          <div className="text-[11px] tracking-[0.1em] uppercase text-accent-300">Idea clave</div>
          <div className="font-heading text-2xl leading-[1.15] mt-1 [text-wrap:pretty]">{b.keyIdea}</div>
        </div>
        {b.outro.map((t, i) => <P key={i}>{t}</P>)}

        <LessonQuiz lessonId={lesson.id} questions={questions} alreadyDone={lesson.done} next={next} />

        <div className="card card-snug gap-2 mt-2">
          <div className="card-kicker">Aplícalo en tu cartera</div>
          <div className="text-[15px] [text-wrap:pretty]">{b.apply}</div>
          <div><DiaryDialog label="Escribir en el diario" side="NOTE" /></div>
        </div>
      </article>

      <aside className="lg:sticky lg:top-6 flex flex-col gap-3">
        <div className="card-kicker">Nivel {course.level} · {course.title}</div>
        <nav aria-label="Lecciones del curso" className="flex flex-col border border-divider rounded-[12px] overflow-hidden">
          {siblings.map((s) => {
            const now = s.slug === lesson.slug;
            return (
              <Link key={s.slug} href={`/academia/${course.slug}/${s.slug}`} aria-current={now ? "page" : undefined} className={`flex gap-2.5 text-sm text-ink no-underline border-t border-divider first:border-t-0 px-3 py-3 min-h-[44px] ${now ? "bg-accent-100 font-medium" : ""}`}>
                <span className="font-heading w-4 text-neutral-600">{s.order}</span>
                <span className="flex-1">{s.title}</span>
                <span className="text-xs text-accent-700">{now ? "Ahora" : s.done ? <><span aria-hidden="true">✓</span><span className="sr-only">superada</span></> : ""}</span>
              </Link>
            );
          })}
        </nav>
        <div className="text-xs text-neutral-700">Al terminar el curso: logro «{course.title}» y paso al Nivel {Math.min(course.level + 1, 6)}.</div>
      </aside>
    </div>
  );
}
