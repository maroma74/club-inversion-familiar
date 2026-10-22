import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { currentMonth, listPortfolios, monthLabelLong, STATUS_LABEL } from "@/lib/monthly";
import { fmtDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { proposalSignature, RISK_LABEL } from "@/lib/proposals";
import { aiConfigured } from "@/lib/ai";
import { PortfolioDetailsForm, TutorToggle, UseSuggestionForm } from "./forms";

const nextMonth = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export default async function GestionPage() {
  const admin = await requireAdmin();
  const portfolios = await listPortfolios(admin.familyId);
  const taken = new Set(portfolios.map((p) => p.month));
  // Próximos tres meses sin cartera, empezando por el actual
  const freeMonths: string[] = [];
  for (let ym = currentMonth(); freeMonths.length < 3; ym = nextMonth(ym)) if (!taken.has(ym)) freeMonths.push(ym);
  const month = freeMonths[0];
  // Una sugerencia del repositorio por mes libre: las más usadas primero, sin repetir títulos que la familia ya tenga
  const usedTitles = new Set(portfolios.map((p) => p.title.trim().toLowerCase()));
  const usedIds = new Set(portfolios.map((p) => p.sourceProposalId).filter((x): x is string => !!x));
  const suggestions = (await prisma.proposal.findMany({
    orderBy: [{ uses: "desc" }, { createdAt: "asc" }],
    take: 12,
    select: { id: true, title: true, theme: true, risk: true, source: true, signed: true, minChoices: true, maxChoices: true, family: { select: { name: true } }, options: { orderBy: { order: "asc" }, select: { symbol: true } } },
  })).filter((p) => !usedIds.has(p.id) && !usedTitles.has(p.title.trim().toLowerCase())).slice(0, freeMonths.length);

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="card-kicker text-[11px]">Presidente del club</div>
          <h1 className="mt-1 mb-1">Carteras mensuales</h1>
          <p className="m-0 text-neutral-700 max-w-[64ch] [text-wrap:pretty]">Cada mes decides cuánto recibe cada miembro, entre qué valores pueden elegir y cuántos, y escribes la lección que acompaña a la propuesta. Al publicar, se reparte la paga y los miembros pueden investigar, argumentar y decidir.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/cartera/repositorio" className="btn-primary">Repositorio de propuestas</Link>
          <Link href="/cartera/historial" className="btn-secondary">Historial y repaso</Link>
          <Link href="/cartera" className="btn-secondary">Ver como miembro</Link>
        </div>
      </header>

      <TutorToggle enabled={admin.family.tutorEnabled} available={aiConfigured()} />

      {suggestions.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="m-0">Propuestas para los próximos meses</h3>
            <Link href="/cartera/repositorio" className="text-sm text-accent-700">Ver todo el repositorio →</Link>
          </div>
          <p className="m-0 text-sm text-neutral-700 max-w-[68ch] [text-wrap:pretty]">Una idea del repositorio para cada mes que aún no tiene cartera. Al usarla se crea el borrador con su lección y sus opciones; después lo adaptas y lo publicas cuando quieras.</p>
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))" }}>
            {suggestions.map((p, i) => (
              <article key={p.id} className="card blueprint gap-2" style={{ padding: 20 }}>
                <div className="card-kicker text-[11px] capitalize">Borrador para {monthLabelLong(freeMonths[i])}</div>
                <h4 className="m-0">{p.title}</h4>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-neutral-700">
                  <span className="tag tag-outline">{p.theme}</span>
                  <span>Riesgo {RISK_LABEL[p.risk].toLowerCase()}</span>
                  <span>· {proposalSignature({ source: p.source, signed: p.signed, familyName: p.family?.name })}</span>
                </div>
                <p className="m-0 text-xs text-neutral-700">{p.options.map((o) => o.symbol).join(" · ")} · eligen de {p.minChoices} a {p.maxChoices}</p>
                <UseSuggestionForm proposalId={p.id} month={freeMonths[i]} label={monthLabelLong(freeMonths[i])} />
              </article>
            ))}
          </div>
        </section>
      )}

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
        <div className="card-kicker">Nueva cartera (de este mes o de cualquier mes futuro)</div>
        <p className="m-0 text-[13px] text-neutral-700">Elige el mes que quieras, aunque sea dentro de varios: queda como borrador hasta que la publiques.</p>
        <p className="m-0 text-[13px] text-neutral-700">¿Sin ideas? <Link href="/cartera/repositorio" className="text-accent-700 underline">Elige una propuesta del repositorio</Link>: ya trae lección y opciones, y puedes adaptarla.</p>
        <p className="m-0 text-[13px] text-neutral-700">Se crea como borrador con el importe por defecto ({admin.family.monthlyAllowance.toFixed(2)} €) para cada miembro; después añades las opciones y ajustas los importes antes de publicar.</p>
        <PortfolioDetailsForm initial={{ month, title: "", lesson: "", minChoices: 1, maxChoices: 1, deadline: "" }} />
      </section>
    </div>
  );
}
