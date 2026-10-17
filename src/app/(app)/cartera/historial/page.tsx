import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listPortfolioHistory } from "@/lib/monthlyHistory";
import { isDeadlinePassed, monthLabelLong, STATUS_LABEL } from "@/lib/monthly";
import { fmtDate } from "@/lib/format";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Historial de carteras del mes de la familia: cada una queda archivada con las decisiones y su rendimiento. */
export default async function HistorialPage() {
  const user = await requireUser();
  const portfolios = await listPortfolioHistory(user.familyId);
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="card-kicker">Invertir</div>
          <h1 className="mt-1 mb-1">Historial de carteras del mes</h1>
          <p className="m-0 text-neutral-700 max-w-[66ch] [text-wrap:pretty]">Todas las carteras que ha propuesto el presidente, con lo que eligió cada miembro y cómo ha rendido cada opción desde entonces. Volver a mirarlas es la mejor forma de aprender: se ve qué habría sido mejor elegir y, sobre todo, por qué.</p>
        </div>
        <Link href="/cartera" className="btn-secondary">Cartera del mes</Link>
      </header>

      {portfolios.length === 0 ? (
        <p className="m-0 text-sm text-neutral-700">Todavía no hay ninguna cartera publicada.</p>
      ) : (
        <div className="card card-table">
          <div className="overflow-x-auto"><table className="table">
            <thead><tr><th>Mes</th><th>Cartera</th><th>Estado</th><th className="text-right">Opciones</th><th className="text-right">Decisiones</th><th className="hidden md:table-cell">Publicada</th><th /></tr></thead>
            <tbody>
              {portfolios.map((p) => {
                const closed = p.status === "CLOSED" || isDeadlinePassed(p);
                return (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap">{cap(monthLabelLong(p.month))}</td>
                    <td className="font-medium">{p.title}</td>
                    <td><span className={`tag ${closed ? "tag-neutral" : "tag-outline"}`}>{p.status === "CLOSED" ? "Archivada" : isDeadlinePassed(p) ? "Plazo cerrado" : STATUS_LABEL[p.status]}</span></td>
                    <td className="text-right tabular-nums">{p._count.options}</td>
                    <td className="text-right tabular-nums">{p._count.decisions} / {p.allocations.length}</td>
                    <td className="text-neutral-700 hidden md:table-cell">{p.publishedAt ? fmtDate(p.publishedAt) : "—"}</td>
                    <td className="text-right"><Link href={`/cartera/historial/${p.id}`} className="btn-ghost text-xs">Ver repaso</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        </div>
      )}
    </div>
  );
}
