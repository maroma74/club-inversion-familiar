import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { firstName } from "@/lib/names";
import { getCoursesWithProgress, getLearningStats, levelFromPoints, POINTS_PER_BADGE } from "@/lib/academy";

export default async function AcademiaPage() {
  const user = await requireUser();
  const [courses, members] = await Promise.all([
    getCoursesWithProgress(user.id),
    prisma.user.findMany({ where: { familyId: user.familyId, status: "ACTIVE" }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, badgeCount: true } }),
  ]);
  const learning = await getLearningStats(members.map((m) => m.id));
  const total = courses.reduce((a, c) => a + c.lessons.length, 0);

  return (
    <div className="flex flex-col gap-7">
      <header>
        <div className="card-kicker text-[11px]">Academia</div>
        <h1 className="mt-1 mb-1">Itinerario de formación</h1>
        <p className="m-0 text-neutral-700 max-w-[64ch] [text-wrap:pretty]">Seis niveles, del ahorro al análisis técnico. Cada lección dura menos de diez minutos y termina con un quiz; al aprobar un curso se desbloquea el siguiente.</p>
      </header>

      <section className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))" }}>
        {courses.map((c) => {
          const status = c.completed ? "Completado" : c.unlocked ? "En curso" : "Bloqueado";
          const tag = c.completed ? "tag-accent" : c.unlocked ? "tag-outline" : "tag-neutral";
          const href = c.nextLesson ? `/academia/${c.slug}/${c.nextLesson.slug}` : `/academia/${c.slug}/${c.lessons[0]?.slug ?? ""}`;
          return (
            <div key={c.id} className="card gap-2.5" style={c.unlocked ? undefined : { background: "var(--color-surface-2)" }}>
              <div className="flex justify-between items-center gap-2">
                <div className="card-kicker">Nivel {c.level} · {c.levelName}</div>
                <span className={`tag ${tag}`}>{status}</span>
              </div>
              <div className="font-heading text-[24px] leading-[1.1]">{c.title}</div>
              <p className="card-body text-sm [text-wrap:pretty]">{c.description}</p>
              {c.unlocked ? (
                <>
                  <div className="text-xs text-neutral-700 flex flex-col gap-0.5">
                    {c.lessons.map((l) => (
                      <div key={l.id} className="flex gap-2">
                        <span className="w-3.5 text-accent-700">
                          {l.done ? <><span aria-hidden="true">✓</span><span className="sr-only">superada: </span></> : l.isNext ? <><span aria-hidden="true">→</span><span className="sr-only">siguiente: </span></> : null}
                        </span>
                        <span>{l.title}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bar mt-1" role="progressbar" aria-label={`Progreso de ${c.title}`} aria-valuemin={0} aria-valuemax={c.lessons.length} aria-valuenow={c.doneCount} aria-valuetext={`${c.doneCount} de ${c.lessons.length} lecciones`}>
                    <span style={{ width: `${c.lessons.length ? (c.doneCount / c.lessons.length) * 100 : 0}%` }} />
                  </div>
                  <div className="flex justify-between items-center gap-2 flex-wrap">
                    <span className="card-meta">{c.doneCount} de {c.lessons.length} lecciones</span>
                    <Link href={href} className={c.current ? "btn-primary" : "btn-secondary"}>{c.completed ? "Repasar" : c.doneCount === 0 ? "Empezar" : "Continuar"}</Link>
                  </div>
                </>
              ) : (
                <p className="m-0 text-sm text-neutral-700 flex items-center gap-2">
                  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="10" height="7" rx="2" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" /></svg>
                  Se abre al completar el Nivel {c.level - 1}.
                </p>
              )}
            </div>
          );
        })}
      </section>

      <section className="flex flex-col gap-2.5 max-w-[760px]">
        <h3 className="m-0">Progreso de la familia</h3>
        <div className="overflow-x-auto"><table className="table">
          <thead><tr><th>Miembro</th><th>Nivel</th><th className="text-right">Lecciones</th><th className="text-right">Acierto en quiz</th><th className="text-right">Entradas de diario</th></tr></thead>
          <tbody>
            {members.map((m) => {
              const l = learning.get(m.id);
              const lv = levelFromPoints(m.badgeCount * POINTS_PER_BADGE + (l?.points ?? 0));
              return (
                <tr key={m.id}>
                  <td>{firstName(m.name)}{m.id === user.id ? " (tú)" : ""}</td>
                  <td>{lv.level} · {lv.name}</td>
                  <td className="text-right tabular-nums">{l?.lessonsPassed ?? 0} / {total}</td>
                  <td className="text-right tabular-nums">{l?.quizAccuracy === null || l?.quizAccuracy === undefined ? "—" : `${Math.round(l.quizAccuracy * 100)} %`}</td>
                  <td className="text-right tabular-nums">{l?.journalEntries ?? 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      </section>
    </div>
  );
}
