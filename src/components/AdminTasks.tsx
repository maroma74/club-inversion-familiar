import Link from "next/link";
import { getAdminTasks, getSharedProposalUses } from "@/lib/adminTasks";

/** Bloque del presidente en Inicio: tareas pendientes del club y el eco de sus propuestas compartidas. */
export async function AdminTasks({ familyId }: { familyId: string }) {
  const [tasks, shared] = await Promise.all([getAdminTasks(familyId), getSharedProposalUses(familyId)]);
  const warn = tasks.filter((t) => t.tone === "warn").length;
  const totalUses = shared.reduce((a, s) => a + s.uses, 0);
  const byOthers = shared.reduce((a, s) => a + s.byOthers, 0);
  if (tasks.length === 0 && shared.length === 0) return null;
  return (
    <section className="flex flex-col gap-3" aria-labelledby="tareas-presidente">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="tareas-presidente" className="m-0">Tareas del presidente</h3>
        <span className="text-sm text-neutral-700">{tasks.length === 0 ? "Todo al día" : `${tasks.length} ${tasks.length === 1 ? "pendiente" : "pendientes"}${warn ? ` · ${warn} ${warn === 1 ? "urgente" : "urgentes"}` : ""}`}</span>
      </div>
      {tasks.length === 0 ? (
        <div className="card card-snug"><p className="m-0 text-sm text-neutral-700">No hay nada pendiente: paga repartida, cartera del mes en marcha y sin compras por reconocer.</p></div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))" }}>
          {tasks.map((t) => (
            <article key={t.id} className="card card-snug gap-1.5" style={{ borderColor: t.tone === "warn" ? "#e5a016" : "var(--color-divider)" }}>
              <div className="card-kicker text-[11px]" style={t.tone === "warn" ? { color: "var(--color-amber-700)" } : undefined}>{t.tone === "warn" ? "Pendiente" : "Para después"}</div>
              <div className="font-heading text-[17px] leading-tight">{t.title}</div>
              <p className="m-0 text-sm text-neutral-700 [text-wrap:pretty]">{t.text}</p>
              <div><Link href={t.href} className={t.tone === "warn" ? "btn-primary py-1.5 text-xs" : "btn-secondary py-1.5 text-xs"}>{t.cta}</Link></div>
            </article>
          ))}
        </div>
      )}
      {shared.length > 0 && (
        <div className="card card-snug gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="card-kicker">Tus propuestas en el repositorio</div>
            <span className="text-xs text-neutral-700 tabular-nums">{totalUses} {totalUses === 1 ? "uso" : "usos"} en total · {byOthers} por otras familias</span>
          </div>
          <ul className="m-0 p-0 list-none flex flex-col">
            {shared.slice(0, 5).map((s) => (
              <li key={s.id} className="flex flex-wrap items-baseline justify-between gap-2 py-1.5 border-t border-divider first:border-t-0 text-sm">
                <span><b>{s.title}</b> <span className="text-xs text-neutral-700">· {s.signed ? "firmada" : "anónima"}</span></span>
                <span className="tabular-nums text-neutral-700">{s.uses === 0 ? "sin usar todavía" : `${s.uses} ${s.uses === 1 ? "vez" : "veces"}${s.byOthers ? ` · ${s.byOthers} por otras familias` : ""}`}</span>
              </li>
            ))}
          </ul>
          <p className="m-0 text-xs text-neutral-700 [text-wrap:pretty]">Cada vez que otra familia usa una propuesta tuya, aprenden con tu lección. <Link href="/cartera/repositorio/nueva" className="text-accent-700">Comparte otra →</Link></p>
        </div>
      )}
    </section>
  );
}
