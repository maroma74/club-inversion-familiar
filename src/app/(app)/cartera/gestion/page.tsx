import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { currentMonth, listPortfolios, monthLabelLong, STATUS_LABEL } from "@/lib/monthly";
import { fmtDate } from "@/lib/format";
import { PortfolioDetailsForm } from "./forms";

export default async function GestionPage() {
  const admin = await requireAdmin();
  const portfolios = await listPortfolios(admin.familyId);
  const taken = new Set(portfolios.map((p) => p.month));
  let month = currentMonth();
  while (taken.has(month)) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m, 1);
    month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="card-kicker text-[11px]">Presidente del club</div>
          <h1 className="mt-1 mb-1">Carteras mensuales</h1>
          <p className="m-0 text-neutral-700 max-w-[64ch] [text-wrap:pretty]">Cada mes decides cuánto recibe cada miembro, entre qué valores pueden elegir y cuántos, y escribes la lección que acompaña a la propuesta. Al publicar, se reparte la paga y los miembros pueden investigar, argumentar y decidir.</p>
        </div>
        <Link href="/cartera" className="btn-secondary">Ver como miembro</Link>
      </header>

      <section className="flex flex-col gap-2.5">
        <h3 className="m-0">Carteras</h3>
        {portfolios.length === 0 ? (
          <p className="m-0 text-sm text-neutral-700">Todavía no hay ninguna. Crea el borrador del primer mes abajo.</p>
        ) : (
          <div className="overflow-x-auto"><table className="table">
            <thead><tr><th>Mes</th><th>Título</th><th>Estado</th><th className="text-right">Opciones</th><th className="text-right">Decisiones</th><th>Plazo</th><th /></tr></thead>
            <tbody>
              {portfolios.map((p) => (
                <tr key={p.id}>
                  <td className="capitalize">{monthLabelLong(p.month)}</td>
                  <td className="font-medium">{p.title}</td>
                  <td><span className={`tag ${p.status === "PUBLISHED" ? "tag-outline" : p.status === "CLOSED" ? "tag-neutral" : "tag-accent"}`}>{STATUS_LABEL[p.status]}</span></td>
                  <td className="text-right tabular-nums">{p._count.options}</td>
                  <td className="text-right tabular-nums">{p._count.decisions} / {p._count.allocations}</td>
                  <td className="text-neutral-700">{p.deadline ? fmtDate(p.deadline) : "—"}</td>
                  <td className="text-right"><Link href={`/cartera/gestion/${p.id}`} className="btn-ghost text-xs">Gestionar</Link></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </section>

      <section className="card blueprint gap-3" style={{ padding: 24 }}>
        <div className="card-kicker">Nueva cartera</div>
        <p className="m-0 text-[13px] text-neutral-700">Se crea como borrador con el importe por defecto ({admin.family.monthlyAllowance.toFixed(2)} €) para cada miembro; después añades las opciones y ajustas los importes antes de publicar.</p>
        <PortfolioDetailsForm initial={{ month, title: "", lesson: "", minChoices: 1, maxChoices: 1, deadline: "" }} />
      </section>
    </div>
  );
}
