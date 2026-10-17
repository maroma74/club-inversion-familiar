import Link from "next/link";
import { safeHref } from "@/lib/validation";
import { requireUser } from "@/lib/auth";
import { familyOverview } from "@/lib/league";
import { fetchNews } from "@/lib/news";
import { eur, pct } from "@/lib/format";
import { LeagueChart } from "@/components/charts";
import { Avatar } from "@/components/Avatar";
import { AutoRefresh } from "./AutoRefresh";
import { analysisPath, symbolKind } from "@/lib/kinds";

const timeAgo = (d: Date) => {
  const h = Math.floor((Date.now() - d.getTime()) / 3600000);
  if (h < 1) return "hace minutos";
  if (h < 24) return `hace ${h} h`;
  const days = Math.floor(h / 24);
  return days === 1 ? "ayer" : `hace ${days} días`;
};
const tone = (v: number) => (v >= 0 ? "var(--color-accent-700)" : "var(--color-text)");

export default async function InversionesPage() {
  const user = await requireUser();
  const { ranking, history, progress, learning, stats } = await familyOverview(user.familyId);
  const members = ranking.map((r) => r.userName);
  const heldSymbols = [...new Set(ranking.flatMap((r) => r.holdings.map((h) => h.symbol)))];
  const news = await fetchNews(heldSymbols, 8);
  const me = progress.get(user.id);
  const monthLabel = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(new Date());
  const stale = ranking.some((r) => r.holdings.some((h) => h.stale));

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="card-kicker flex flex-wrap items-center gap-2"><span>{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</span>{stale && <span className="tag tag-gold">Algunas cotizaciones sin actualizar</span>}</div>
          <h1 className="mt-1 mb-1">Liga de inversión familiar</h1>
          <p className="m-0 text-neutral-700 max-w-[62ch] [text-wrap:pretty]">Paga mensual: {eur(user.family.monthlyAllowance)} por persona. La liga compara la rentabilidad sobre lo aportado: sirve para aprender, así que lo importante es poder explicar tus decisiones.</p>
        </div>
        <div className="flex items-center gap-3">
          <AutoRefresh renderedAt={new Date().getTime()} />
          <Link href="/operaciones#operar" className="btn-primary">+ Operar</Link>
        </div>
      </header>

      <section className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 230px), 1fr))" }}>
        {ranking.map((r, i) => {
          const p = progress.get(r.userId);
          return (
            <div key={r.userId} className="card card-snug gap-1.5" style={{ borderColor: r.userId === user.id ? "var(--color-accent)" : "var(--color-divider)" }}>
              <div className="flex justify-between items-baseline gap-2">
                <div className="font-heading text-xl flex items-center gap-2 min-w-0"><span className="tag tag-neutral shrink-0">{i + 1}.º</span><Avatar id={r.userId} name={r.userName} updatedAt={r.avatarUpdatedAt} size={32} /><span className="truncate">{r.userName}</span></div>
                {i === 0 && r.contributed > 0 && <span className="tag tag-gold shrink-0">Líder</span>}
              </div>
              <div className="figure text-[40px]" style={{ color: tone(r.pnl) }}>{pct(r.returnPct, 2)}</div>
              <div className="text-xs text-neutral-700 leading-[1.5]">
                Valor {eur(r.totalValue)} · aportado {eur(r.contributed)}
                <br />
                {r.pnl >= 0 ? "Ganancia" : "Pérdida"} {eur(Math.abs(r.pnl))} · efectivo {eur(r.cash)}
              </div>
              {r.userId === user.id && r.pnl < 0 && (
                <div className="text-sm text-neutral-700 [text-wrap:pretty]">Ahora vale menos de lo que aportaste. Es normal mientras se aprende: lo que cuenta es entender por qué.</div>
              )}
              {p && (
                <div className="border-t border-divider mt-1.5 pt-2 text-xs">
                  <div className="flex justify-between"><span className="font-medium">Nivel {p.level} · {p.levelName}</span><span className="text-neutral-700">{p.points} pts</span></div>
                  <div className="bar mt-1.5"><span style={{ width: `${p.levelProgress * 100}%` }} /></div>
                  <div className="mt-1.5 text-neutral-700">{p.badgesEarned} logros · {p.lessonsPassed} lecciones</div>
                </div>
              )}
            </div>
          );
        })}
      </section>

      {stats.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="m-0">Estadísticas de la liga</h3>
          <div className="cellgrid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))" }}>
            {stats.map((s) => (
              <div key={s.id}>
                <div className="text-[11px] tracking-[0.08em] uppercase text-neutral-700">{s.label}</div>
                <div className="figure text-[26px] mt-0.5" style={{ color: s.tone === "good" ? "var(--color-accent-700)" : "var(--color-text)" }}>{s.value}</div>
                <div className="text-sm font-medium">{s.who}</div>
                {s.detail && <div className="text-xs text-neutral-700">{s.detail}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))" }}>
        <div className="card gap-2 min-w-0 md:[grid-column:span_2]">
          <h4 className="m-0">Evolución de la rentabilidad</h4>
          {history.length < 2 ? (
            <p className="m-0 text-sm text-neutral-700">Se guarda una foto de cada cartera cada vez que alguien abre la liga. Vuelve en unos días para ver la evolución.</p>
          ) : (
            <LeagueChart data={history} members={members} />
          )}
        </div>
        <div className="card gap-2.5 min-w-0">
          <h4 className="m-0">Noticias de vuestros valores</h4>
          {news.length === 0 ? (
            <p className="m-0 text-sm text-neutral-700">No hay noticias disponibles ahora mismo.</p>
          ) : (
            news.map((n) => (
              <div key={n.id} className="pt-2 border-t border-divider">
                <a href={safeHref(n.link)} target="_blank" rel="noopener noreferrer" className="text-ink no-underline font-medium text-sm leading-[1.35] block hover:text-accent-700">{n.title}<span className="sr-only"> (se abre en otra pestaña)</span></a>
                <div className="text-xs text-neutral-700 mt-0.5">{n.publisher} · {timeAgo(n.publishedAt)} · {n.symbols.join(", ")}</div>
              </div>
            ))
          )}
        </div>
      </section>

      {me && (
        <section className="flex flex-col gap-3">
          <div className="flex justify-between items-baseline gap-3 flex-wrap">
            <h3 className="m-0">Tus logros</h3>
            <span className="text-sm text-neutral-700">{me.badgesEarned} de {me.badges.length} · Nivel {me.level} {me.levelName} · {me.nextLevelAt ? `siguiente nivel a ${me.nextLevelAt} pts` : "nivel máximo"}</span>
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 180px), 1fr))" }}>
            {me.badges.map((b) => (
              <div key={b.id} className="card card-snug gap-1" style={{ borderColor: b.earned ? "var(--color-accent-400)" : "var(--color-divider)" }}>
                <div className="text-[11px] tracking-[0.1em] uppercase" style={{ color: b.earned ? "var(--color-accent-700)" : "var(--color-neutral-700)" }}>{b.earned ? "Conseguido" : "Pendiente"}</div>
                <div className="font-heading text-lg">{b.label}</div>
                <div className="text-xs text-neutral-700 leading-[1.35]">{b.detail}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))" }}>
        {ranking.map((r) => (
          <div key={r.userId} className="card gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <h4 className="m-0">Cartera de {r.userName}</h4>
              <span className="text-xs text-neutral-700">{r.trades} operaciones · realizado {eur(r.realized)}</span>
            </div>
            {r.holdings.length === 0 ? (
              <p className="m-0 text-sm text-neutral-700">Sin posiciones abiertas. Efectivo disponible: {eur(r.cash)}.</p>
            ) : (
              <>
              {/* Una lista de dos columnas (activo | valor y rentabilidad) cabe en la tarjeta a cualquier ancho; el detalle va en línea pequeña */}
              <ul className="m-0 p-0 list-none flex flex-col">
                {r.holdings.map((h) => (
                  <li key={h.symbol} className="flex items-start justify-between gap-3 py-2 border-t border-divider first:border-t-0">
                    <div className="min-w-0">
                      <div className="font-medium"><Link href={analysisPath(h.symbol)} className="text-ink">{h.symbol}</Link>{symbolKind(h.symbol) === "CRYPTO" && <span className="tag tag-neutral ml-1">cripto</span>}{symbolKind(h.symbol) === "COMMODITY" && <span className="tag tag-neutral ml-1">materia prima</span>}</div>
                      <div className="text-xs text-neutral-700 truncate">{h.name}</div>
                      <div className="text-xs text-neutral-600 tabular-nums">{h.quantity.toLocaleString("es-ES", { maximumFractionDigits: 4 })} uds. · medio {eur(h.avgCost)}{h.price !== null ? ` · ahora ${eur(h.price)}` : ""}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="tabular-nums font-medium" style={{ color: tone(h.pnl) }}>{pct(h.pnlPct)}</div>
                      <div className="text-xs text-neutral-700 tabular-nums">{eur(h.value)}</div>
                    </div>
                  </li>
                ))}
                <li className="flex justify-between py-2 border-t border-divider text-sm text-neutral-700"><span>Efectivo</span><span className="tabular-nums">{eur(r.cash)}</span></li>
              </ul>
              </>
            )}
          </div>
        ))}
      </section>
      {learning.size > 0 && ranking.every((r) => r.contributed === 0) && <p className="text-xs text-neutral-600 m-0">Nadie tiene aportaciones todavía: el presidente puede preparar la cartera del mes.</p>}
    </div>
  );
}
