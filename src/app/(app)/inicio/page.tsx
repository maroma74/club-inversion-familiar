import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { firstName } from "@/lib/names";
import { getCoursesWithProgress, LEVELS } from "@/lib/academy";
import { familyOverview } from "@/lib/league";
import { eur, fmtDate, fmtRelative, pct } from "@/lib/format";
import { DiaryDialog } from "@/components/DiaryDialog";
import { Avatar } from "@/components/Avatar";
import { getCurrentPortfolio, isDeadlinePassed, monthLabelLong, STATUS_LABEL } from "@/lib/monthly";

const SIDE: Record<string, string> = { BUY: "Compra", SELL: "Venta", NOTE: "Nota" };

export default async function InicioPage() {
  const user = await requireUser();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const [courses, overview, diary, pendingTrades, monthly, weekEntries, myEntries] = await Promise.all([
    getCoursesWithProgress(user.id),
    familyOverview(user.familyId),
    prisma.journalEntry.findMany({ where: { user: { familyId: user.familyId } }, orderBy: { createdAt: "desc" }, take: 6, include: { user: { select: { id: true, name: true, avatarUpdatedAt: true } } } }),
    prisma.trade.findMany({ where: { userId: user.id, journal: null, side: "BUY" }, orderBy: { date: "desc" }, take: 3 }),
    getCurrentPortfolio(user.familyId),
    prisma.journalEntry.count({ where: { user: { familyId: user.familyId }, createdAt: { gte: weekAgo } } }),
    prisma.journalEntry.count({ where: { userId: user.id } }),
  ]);
  const monthlyAllocation = monthly?.allocations.find((a) => a.userId === user.id)?.amount ?? 0;
  const monthlyDecided = !!monthly?.decisions.some((d) => d.userId === user.id);
  const monthlyPending = !!monthly && monthly.status === "PUBLISHED" && !monthlyDecided && monthlyAllocation > 0 && !isDeadlinePassed(monthly);
  const me = overview.ranking.find((r) => r.userId === user.id);
  const myProgress = overview.progress.get(user.id);
  const myRank = overview.ranking.findIndex((r) => r.userId === user.id) + 1;
  const myLessons = overview.learning.get(user.id)?.lessonsPassed ?? 0;
  const current = courses.find((c) => c.current) ?? courses.find((c) => c.unlocked && !c.completed) ?? courses[courses.length - 1];
  const nextLesson = current?.nextLesson;
  const nextHref = current && nextLesson ? `/academia/${current.slug}/${nextLesson.slug}` : "/academia";
  const lessonTitle = nextLesson ? `Lección ${current!.lessons.find((l) => l.slug === nextLesson.slug)?.order ?? ""} · ${nextLesson.title}` : "Has completado todos los cursos";
  const todayRaw = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
  const today = todayRaw.charAt(0).toUpperCase() + todayRaw.slice(1);
  const monthName = new Intl.DateTimeFormat("es-ES", { month: "long" }).format(new Date());
  const level = myProgress?.level ?? 1;
  const firstPending = pendingTrades[0];
  const isNewMember = myLessons === 0 && myEntries === 0;

  // Una sola acción principal, por prioridad: decisión del mes > compra sin explicar > lección.
  const step = monthlyPending
    ? { kind: "monthly" as const, kicker: `Cartera de ${monthLabelLong(monthly!.month)}`, title: monthly!.title, text: `Tienes ${eur(monthlyAllocation)} por decidir${monthly!.deadline ? ` hasta el ${fmtDate(monthly!.deadline)}` : ""}. Lee la lección, analiza cada opción y explica tu elección.` }
    : firstPending
      ? { kind: "trade" as const, kicker: "Explica tu decisión", title: `¿Por qué compraste ${firstPending.symbol}?`, text: `Compraste ${firstPending.quantity.toLocaleString("es-ES", { maximumFractionDigits: 6 })} uds. el ${fmtDate(firstPending.date)} y aún no has escrito tu porqué. Es lo que más te hace aprender.` }
      : { kind: "lesson" as const, kicker: `Sigue aprendiendo${current ? ` · Nivel ${current.level}` : ""}`, title: lessonTitle, text: current?.description ?? "Repasa cualquier lección cuando quieras." };

  const weekLine = weekEntries > 0
    ? `Esta semana tu familia ha escrito ${weekEntries} ${weekEntries === 1 ? "porqué" : "porqués"}. Aquí se aprende invirtiendo, y explicando cada decisión.`
    : "Esta semana nadie ha escrito aún su porqué. ¿Empiezas tú? Aquí se aprende explicando cada decisión.";

  const returnNote = !me
    ? "Cuando hagas tu primera compra verás aquí cómo evoluciona tu cartera."
    : me.returnPct > 0
      ? "Tu cartera ha crecido desde que empezaste. Lo importante es saber explicar por qué."
      : me.returnPct < 0
        ? "Ahora vale menos de lo que aportaste. Es normal mientras se aprende: repasa tu diario y pregúntate qué cambió."
        : "Todavía sin cambios sobre lo que aportaste.";

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="card-kicker">{today}</div>
          <h1 className="mt-1 mb-1">Hola, {firstName(user.name)}</h1>
          <p className="m-0 text-neutral-700 max-w-[60ch] [text-wrap:pretty]">{weekLine}</p>
        </div>
        <DiaryDialog label="Escribir en el diario" side="NOTE" />
      </header>

      <section aria-labelledby="siguiente-paso" className="card card-roomy gap-3" style={{ borderColor: "var(--color-accent)" }}>
        <div id="siguiente-paso" className="card-kicker">Tu siguiente paso · {step.kicker}</div>
        <h2 className="m-0 [text-wrap:balance]">{step.title}</h2>
        <p className="card-body max-w-[60ch] [text-wrap:pretty]" style={{ flex: "none", fontSize: 15 }}>{step.text}</p>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          {step.kind === "monthly" && <Link href="/cartera" className="btn-primary">Investigar y decidir</Link>}
          {step.kind === "trade" && firstPending && <DiaryDialog label="Explicar la compra" symbol={firstPending.symbol} side="BUY" tradeId={firstPending.id} className="btn-primary" />}
          {step.kind === "lesson" && <Link href={nextHref} className="btn-primary">{nextLesson ? "Continuar lección" : "Repasar la Academia"}</Link>}
          {step.kind !== "lesson" && nextLesson && <Link href={nextHref} className="btn-ghost">Seguir la lección</Link>}
          {step.kind === "monthly" && firstPending && <DiaryDialog label="Explicar una compra pendiente" symbol={firstPending.symbol} side="BUY" tradeId={firstPending.id} className="btn-ghost" />}
        </div>
      </section>

      {isNewMember && (
        <section aria-labelledby="primeros-pasos" className="card card-roomy gap-2">
          <h3 id="primeros-pasos" className="m-0">Tus primeros pasos</h3>
          <ol className="m-0 pl-6 flex flex-col gap-1.5 text-base list-decimal marker:font-bold marker:text-accent-700">
            <li>Haz tu primera lección en la <Link href="/academia">Academia</Link>.</li>
            <li>Mira una acción o un ETF en <Link href="/acciones">Acciones</Link> y decide si comprarías.</li>
            <li>Escribe en el diario <b>por qué</b> lo harías. Ese porqué es lo que aprenderás a mejorar.</li>
          </ol>
        </section>
      )}

      <section className="grid gap-5 xl:grid-cols-3">
        <div className="card card-roomy gap-3.5 min-w-0 xl:col-span-2">
          <div className="card-kicker">Tu aprendizaje{current ? ` · Nivel ${current.level} · ${current.title}` : ""}</div>
          <div className="flex flex-wrap gap-6 items-end justify-between">
            <div className="min-w-0 flex-[1_1_280px]">
              {step.kind === "lesson" ? (
                <h3 className="m-0">Tu camino en la Academia</h3>
              ) : (
                <>
                  <h3 className="m-0 mb-1.5">{lessonTitle}</h3>
                  <p className="card-body max-w-[52ch] [text-wrap:pretty]" style={{ flex: "none" }}>{current?.description ?? "Repasa cualquier lección cuando quieras."}</p>
                </>
              )}
            </div>
            {current && (
              <div className="flex-[0_0_200px]">
                <div className="flex justify-between text-xs text-neutral-700"><span>Curso</span><span>{current.doneCount} de {current.lessons.length} lecciones</span></div>
                <div
                  className="bar mt-1.5"
                  style={{ height: 4 }}
                  role="progressbar"
                  aria-label="Progreso del curso"
                  aria-valuemin={0}
                  aria-valuemax={current.lessons.length}
                  aria-valuenow={current.doneCount}
                  aria-valuetext={`${current.doneCount} de ${current.lessons.length} lecciones`}
                >
                  <span style={{ width: `${current.lessons.length ? (current.doneCount / current.lessons.length) * 100 : 0}%` }} />
                </div>
              </div>
            )}
          </div>
          <div role="list" aria-label="Niveles del club" className="grid grid-cols-3 sm:grid-cols-6 border border-divider mt-1.5">
            {LEVELS.map((name, i) => {
              const n = i + 1;
              const bg = n === level ? "#047857" : n < level ? "var(--color-accent-100)" : "transparent";
              const color = n === level ? "#ffffff" : n < level ? "var(--color-accent-800)" : "var(--color-neutral-700)";
              return (
                <div key={name} role="listitem" aria-current={n === level ? "step" : undefined} className="border-l border-divider first:border-l-0" style={{ padding: "10px 12px", background: bg, color }}>
                  <div className="font-heading text-xs">0{n}</div>
                  <div className="font-heading text-base">{name}</div>
                </div>
              );
            })}
          </div>
          <div><Link href="/academia" className="btn-ghost">Ir a la Academia</Link></div>
        </div>

        <div className="card card-roomy gap-2.5">
          <div className="card-kicker">Tu cartera</div>
          {me ? (
            <div className="figure text-[32px] text-accent-700">{pct(me.returnPct, 2)}</div>
          ) : (
            <div className="font-heading text-xl">Aún sin datos</div>
          )}
          <div className="text-sm text-neutral-700">Rentabilidad sobre lo aportado</div>
          <p className="m-0 text-sm [text-wrap:pretty]">{returnNote}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-2 text-sm">
            <div><div className="text-xs text-neutral-700">Valor</div><div className="tabular-nums">{eur(me?.totalValue ?? 0)}</div></div>
            <div><div className="text-xs text-neutral-700">Aportado</div><div className="tabular-nums">{eur(me?.contributed ?? 0)}</div></div>
            <div><div className="text-xs text-neutral-700">Efectivo</div><div className="tabular-nums">{eur(me?.cash ?? 0)}</div></div>
            <div><div className="text-xs text-neutral-700">Puesto en la liga</div><div>{myRank ? `${myRank}.º de ${overview.ranking.length}` : "—"}</div></div>
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer text-accent-700 font-medium">¿Qué significa cada dato?</summary>
            <dl className="m-0 mt-2 flex flex-col gap-1.5 text-neutral-700">
              <div><dt className="inline font-medium text-[var(--color-text)]">Valor: </dt><dd className="inline m-0">lo que vale hoy todo lo que tienes, inversiones y dinero.</dd></div>
              <div><dt className="inline font-medium text-[var(--color-text)]">Aportado: </dt><dd className="inline m-0">el dinero que has recibido en total (tu paga mensual).</dd></div>
              <div><dt className="inline font-medium text-[var(--color-text)]">Efectivo: </dt><dd className="inline m-0">el dinero que aún no has invertido.</dd></div>
              <div><dt className="inline font-medium text-[var(--color-text)]">Rentabilidad: </dt><dd className="inline m-0">cuánto ha crecido o bajado lo aportado, en porcentaje.</dd></div>
            </dl>
          </details>
          <div className="mt-1"><Link href="/operaciones" className="btn-ghost">Ver operaciones</Link></div>
        </div>
      </section>

      {monthly && !monthlyPending && (
        <section className="card card-snug gap-2" style={{ borderColor: "var(--color-divider)" }}>
          <div className="flex flex-wrap justify-between items-start gap-3">
            <div>
              <div className="card-kicker">Cartera de {monthLabelLong(monthly.month)} · {STATUS_LABEL[monthly.status]}</div>
              <div className="font-heading text-2xl leading-[1.1] mt-1">{monthly.title}</div>
              <div className="text-sm text-neutral-700 mt-1">
                {monthly.options.length} opciones · tu importe {eur(monthlyAllocation)}
                {monthlyDecided ? " · decisión enviada" : ""}
                {monthly.deadline ? ` · hasta el ${fmtDate(monthly.deadline)}` : ""}
              </div>
            </div>
            <Link href="/cartera" className="btn-secondary">Ver la cartera del mes</Link>
          </div>
        </section>
      )}
      {!monthly && user.role === "ADMIN" && (
        <section className="card card-snug gap-2">
          <div className="card-kicker">Cartera del mes</div>
          <div className="text-sm">Como presidente del club, prepara la cartera de este mes: importe por miembro, opciones de inversión y la lección que las acompaña.</div>
          <div><Link href="/cartera/gestion" className="btn-primary">Preparar la cartera</Link></div>
        </section>
      )}

      <section className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))" }}>
        <div className="flex flex-col gap-3 min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="m-0">Diario de la familia</h3>
            <DiaryDialog label="+ Nueva entrada" className="btn-ghost" side="NOTE" />
          </div>
          {pendingTrades.map((t) => (
            <div key={t.id} className="card card-snug gap-1.5" style={{ borderColor: "var(--color-accent)" }}>
              <div className="card-kicker">Pendiente</div>
              <div className="text-[15px]">Compraste <b>{t.quantity.toLocaleString("es-ES", { maximumFractionDigits: 6 })} uds. de {t.symbol}</b> el {fmtDate(t.date)} y aún no has explicado por qué.</div>
              <div><DiaryDialog label="Explicar la compra" symbol={t.symbol} side="BUY" tradeId={t.id} className="btn-secondary mt-1" /></div>
            </div>
          ))}
          {diary.length === 0 && pendingTrades.length === 0 && (
            <div className="card card-snug gap-2">
              <div className="font-heading text-lg">El diario está vacío</div>
              <p className="m-0 text-sm text-neutral-700 [text-wrap:pretty]">Aquí cada uno cuenta por qué toma sus decisiones. Por ejemplo: «Compré este ETF porque reparte mi riesgo entre muchas empresas y lo vendería si baja un 20 %».</p>
              <div><DiaryDialog label="Escribir mi primera entrada" side="NOTE" className="btn-primary" /></div>
            </div>
          )}
          {diary.map((d) => (
            <div key={d.id} className="card card-snug gap-1.5">
              <div className="card-meta justify-between">
                <span className="inline-flex items-center gap-2"><Avatar id={d.user.id} name={d.user.name} updatedAt={d.user.avatarUpdatedAt} size={28} />{firstName(d.user.name)} · {fmtRelative(d.createdAt)}</span>
                <span className="tag tag-accent">{SIDE[d.side] ?? d.side} {d.symbol !== "—" ? d.symbol : ""}</span>
              </div>
              <div className="text-[15px] [text-wrap:pretty]">“{d.why}”</div>
              {d.exitCondition && <div className="text-xs text-neutral-700">Vendería si: {d.exitCondition}</div>}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="m-0">Liga de {monthName}</h3>
            <Link href="/inversiones" className="btn-ghost">Ver la liga</Link>
          </div>
          <div className="card card-table">
            <div className="overflow-x-auto"><table className="table">
              <thead><tr><th>#</th><th>Miembro</th><th className="text-right">Rent.</th><th className="text-right">Lecciones</th></tr></thead>
              <tbody>
                {overview.ranking.map((r, i) => {
                  const p = overview.progress.get(r.userId);
                  return (
                    <tr key={r.userId}>
                      <td className="font-heading text-base">{i + 1}.º</td>
                      <td><span className="inline-flex items-center gap-2"><Avatar id={r.userId} name={r.userName} updatedAt={r.avatarUpdatedAt} size={32} />{r.userName}</span> <span className="text-xs text-neutral-700">· {p?.levelName ?? "Novato"}</span></td>
                      <td className="text-right tabular-nums whitespace-nowrap" style={{ color: r.pnl >= 0 ? "var(--color-accent-700)" : "var(--color-text)" }}>{pct(r.returnPct, 2)}</td>
                      <td className="text-right tabular-nums">{overview.learning.get(r.userId)?.lessonsPassed ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
          </div>
          <p className="text-xs text-neutral-700 m-0">La liga mide la rentabilidad sobre lo aportado. Las lecciones suman puntos de nivel, no de ranking.</p>
        </div>
      </section>
    </div>
  );
}
