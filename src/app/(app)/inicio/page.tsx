import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { firstName } from "@/lib/names";
import { getCoursesWithProgress, LEVELS } from "@/lib/academy";
import { familyOverview } from "@/lib/league";
import { eur, fmtDate, pct } from "@/lib/format";
import { DiaryDialog } from "@/components/DiaryDialog";
import { getCurrentPortfolio, isDeadlinePassed, monthLabelLong, STATUS_LABEL } from "@/lib/monthly";

const SIDE: Record<string, string> = { BUY: "Compra", SELL: "Venta", NOTE: "Nota" };

export default async function InicioPage() {
  const user = await requireUser();
  const [courses, overview, diary, pendingTrades] = await Promise.all([
    getCoursesWithProgress(user.id),
    familyOverview(user.familyId),
    prisma.journalEntry.findMany({ where: { user: { familyId: user.familyId } }, orderBy: { createdAt: "desc" }, take: 6, include: { user: { select: { name: true } } } }),
    prisma.trade.findMany({ where: { userId: user.id, journal: null, side: "BUY" }, orderBy: { date: "desc" }, take: 3 }),
  ]);
  const monthly = await getCurrentPortfolio(user.familyId);
  const monthlyAllocation = monthly?.allocations.find((a) => a.userId === user.id)?.amount ?? 0;
  const monthlyDecided = !!monthly?.decisions.some((d) => d.userId === user.id);
  const monthlyPending = !!monthly && monthly.status === "PUBLISHED" && !monthlyDecided && monthlyAllocation > 0 && !isDeadlinePassed(monthly);
  const me = overview.ranking.find((r) => r.userId === user.id);
  const myProgress = overview.progress.get(user.id);
  const myRank = overview.ranking.findIndex((r) => r.userId === user.id) + 1;
  const current = courses.find((c) => c.current) ?? courses.find((c) => c.unlocked && !c.completed) ?? courses[courses.length - 1];
  const nextLesson = current?.nextLesson;
  const nextHref = current && nextLesson ? `/academia/${current.slug}/${nextLesson.slug}` : "/academia";
  const today = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
  const monthName = new Intl.DateTimeFormat("es-ES", { month: "long" }).format(new Date());
  const level = myProgress?.level ?? 1;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="card-kicker text-[11px] capitalize">{today}</div>
          <h1 className="mt-1 mb-1">Hola, {firstName(user.name)}</h1>
          <p className="m-0 text-neutral-700 max-w-[60ch] [text-wrap:pretty]">Aquí se aprende invirtiendo de verdad: con la paga mensual, una cartera propia y un diario donde explicas cada decisión.</p>
        </div>
        <div className="flex gap-2">
          <DiaryDialog label="Escribir en el diario" side="NOTE" />
          <Link href={nextHref} className="btn-primary blueprint">Continuar lección</Link>
        </div>
      </header>

      <section className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))" }}>
        <div className="card blueprint gap-3.5 min-w-0 md:[grid-column:span_2]" style={{ padding: 24 }}>
          <div className="card-kicker">Continúa donde lo dejaste{current ? ` · Nivel ${current.level} · ${current.title}` : ""}</div>
          <div className="flex flex-wrap gap-6 items-end justify-between">
            <div className="min-w-0 flex-[1_1_280px]">
              <h2 className="m-0 mb-1.5">{nextLesson ? `Lección ${current!.lessons.find((l) => l.slug === nextLesson.slug)?.order ?? ""} · ${nextLesson.title}` : "Has completado todos los cursos"}</h2>
              <p className="card-body text-[15px] max-w-[52ch] [text-wrap:pretty]">{current?.description ?? "Repasa cualquier lección cuando quieras."}</p>
            </div>
            {current && (
              <div className="flex-[0_0_200px]">
                <div className="flex justify-between text-xs text-neutral-700"><span>Curso</span><span>{current.doneCount} de {current.lessons.length} lecciones</span></div>
                <div className="bar mt-1.5" style={{ height: 4 }}><span style={{ width: `${current.lessons.length ? (current.doneCount / current.lessons.length) * 100 : 0}%` }} /></div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 border border-divider mt-1.5">
            {LEVELS.map((name, i) => {
              const n = i + 1;
              const bg = n === level ? "var(--color-accent)" : n < level ? "var(--color-accent-100)" : "transparent";
              const color = n === level ? "var(--color-bg)" : n < level ? "var(--color-accent-800)" : "var(--color-neutral-600)";
              return (
                <div key={name} className="border-l border-divider first:border-l-0" style={{ padding: "10px 12px", background: bg, color }}>
                  <div className="font-heading text-xs opacity-80">0{n}</div>
                  <div className="font-heading text-[16px]">{name}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card blueprint gap-2.5" style={{ padding: 24 }}>
          <div className="card-kicker">Tu cartera</div>
          <div className="figure text-[48px] text-accent-700">{me ? pct(me.returnPct, 2) : "—"}</div>
          <div className="text-[13px] text-neutral-700">Rentabilidad sobre lo aportado</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-2 text-[14px]">
            <div><div className="text-[11px] text-neutral-700">Valor</div><div className="tabular-nums">{eur(me?.totalValue ?? 0)}</div></div>
            <div><div className="text-[11px] text-neutral-700">Aportado</div><div className="tabular-nums">{eur(me?.contributed ?? 0)}</div></div>
            <div><div className="text-[11px] text-neutral-700">Efectivo</div><div className="tabular-nums">{eur(me?.cash ?? 0)}</div></div>
            <div><div className="text-[11px] text-neutral-700">Puesto en la liga</div><div>{myRank ? `${myRank}.º de ${overview.ranking.length}` : "—"}</div></div>
          </div>
          <div className="mt-1"><Link href="/operaciones" className="btn-ghost text-[13px]">Ver operaciones</Link></div>
        </div>
      </section>

      {monthly && (
        <section className="card blueprint gap-2" style={{ padding: 20, borderColor: monthlyPending ? "var(--color-accent)" : "var(--color-divider)" }}>
          <div className="flex flex-wrap justify-between items-start gap-3">
            <div>
              <div className="card-kicker capitalize">Cartera de {monthLabelLong(monthly.month)} · {STATUS_LABEL[monthly.status]}</div>
              <div className="font-heading text-[24px] leading-[1.1] mt-1">{monthly.title}</div>
              <div className="text-[13px] text-neutral-700 mt-1">
                {monthly.options.length} opciones · tu importe {eur(monthlyAllocation)}
                {monthlyPending ? " · pendiente de decidir" : monthlyDecided ? " · decisión enviada" : ""}
                {monthly.deadline ? ` · hasta el ${fmtDate(monthly.deadline)}` : ""}
              </div>
            </div>
            <Link href="/cartera" className={monthlyPending ? "btn-primary blueprint" : "btn-secondary"}>{monthlyPending ? "Investigar y decidir" : "Ver la cartera del mes"}</Link>
          </div>
        </section>
      )}
      {!monthly && user.role === "ADMIN" && (
        <section className="card blueprint gap-2" style={{ padding: 20 }}>
          <div className="card-kicker">Cartera del mes</div>
          <div className="text-[14px]">Como presidente del club, prepara la cartera de este mes: importe por miembro, opciones de inversión y la lección que las acompaña.</div>
          <div><Link href="/cartera/gestion" className="btn-primary blueprint">Preparar la cartera</Link></div>
        </section>
      )}

      <section className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))" }}>
        <div className="flex flex-col gap-3 min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="m-0">Diario de inversión</h3>
            <DiaryDialog label="+ Nueva entrada" className="btn-ghost" side="NOTE" />
          </div>
          {pendingTrades.map((t) => (
            <div key={t.id} className="card blueprint gap-1.5" style={{ padding: "16px 18px", borderColor: "var(--color-accent)" }}>
              <div className="card-kicker">Pendiente</div>
              <div className="text-[15px]">Compraste <b>{t.quantity.toLocaleString("es-ES", { maximumFractionDigits: 6 })} uds. de {t.symbol}</b> el {fmtDate(t.date)} y aún no has explicado por qué.</div>
              <div><DiaryDialog label="Explicar la compra" symbol={t.symbol} side="BUY" tradeId={t.id} className="btn-secondary mt-1" /></div>
            </div>
          ))}
          {diary.length === 0 && pendingTrades.length === 0 && <p className="m-0 text-sm text-neutral-700">Todavía no hay entradas. La primera: por qué compraste lo que tienes.</p>}
          {diary.map((d) => (
            <div key={d.id} className="card blueprint gap-1.5" style={{ padding: "16px 18px" }}>
              <div className="card-meta justify-between"><span>{firstName(d.user.name)} · {fmtDate(d.createdAt)}</span><span className="tag tag-accent">{SIDE[d.side] ?? d.side} {d.symbol !== "—" ? d.symbol : ""}</span></div>
              <div className="text-[15px] [text-wrap:pretty]">“{d.why}”</div>
              {d.exitCondition && <div className="text-xs text-neutral-700">Vendería si: {d.exitCondition}</div>}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="m-0 capitalize">Liga de {monthName}</h3>
            <Link href="/inversiones" className="btn-ghost">Ver la liga</Link>
          </div>
          <div className="card blueprint" style={{ padding: "6px 12px 12px" }}>
            <div className="overflow-x-auto"><table className="table">
              <thead><tr><th>#</th><th>Miembro</th><th className="text-right">Rent.</th><th className="text-right">Lecciones</th></tr></thead>
              <tbody>
                {overview.ranking.map((r, i) => {
                  const p = overview.progress.get(r.userId);
                  return (
                    <tr key={r.userId}>
                      <td className="font-heading text-[16px]">{i + 1}.º</td>
                      <td>{r.userName} <span className="text-xs text-neutral-700">· {p?.levelName ?? "Novato"}</span></td>
                      <td className="text-right tabular-nums" style={{ color: r.pnl >= 0 ? "var(--color-accent-700)" : "var(--color-text)" }}>{pct(r.returnPct, 2)}</td>
                      <td className="text-right tabular-nums">{overview.learning.get(r.userId)?.lessonsPassed ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
          </div>
          <p className="text-xs text-neutral-700 m-0">Gana quien consiga más rentabilidad sobre lo aportado. Las lecciones suman puntos de nivel, no de ranking.</p>
        </div>
      </section>
    </div>
  );
}
