import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { currentMonth, listPortfolios, monthLabelLong } from "@/lib/monthly";
import { KIND_LABEL, PROPOSAL_THEMES, proposalSignature, RISK_LABEL } from "@/lib/proposals";
import { retireProposalAction } from "@/app/actions/proposals";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Markdown } from "@/components/Markdown";
import { UseProposalForm } from "./forms";

const analysisHref = (kind: string, symbol: string) =>
  kind === "COMMODITY" ? `/materias-primas/${encodeURIComponent(symbol)}` : kind === "CRYPTO" ? `/cripto/${encodeURIComponent(symbol)}` : kind === "ETF" ? `/etf/${encodeURIComponent(symbol)}` : `/acciones/${encodeURIComponent(symbol)}`;

/** Cinco barras: las rellenas marcan el nivel de riesgo (1 a 5). */
function RiskBar({ risk }: { risk: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-neutral-700" role="img" aria-label={`Riesgo ${risk} de 5: ${RISK_LABEL[risk]}`}>
      <span aria-hidden="true" className="inline-flex items-end gap-[2px]">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} style={{ width: 5, height: 5 + n * 2.4, borderRadius: 2, background: n <= risk ? "var(--color-ink, #0e2138)" : "var(--color-divider, #cbd5e1)" }} />
        ))}
      </span>
      Riesgo {RISK_LABEL[risk].toLowerCase()}
    </span>
  );
}

type Search = { tema?: string; riesgo?: string; origen?: string; q?: string };

export default async function RepositorioPage({ searchParams }: { searchParams: Promise<Search> }) {
  const admin = await requireAdmin();
  const { tema, riesgo, origen, q } = await searchParams;
  const query = (q ?? "").trim().slice(0, 60);

  const where: Prisma.ProposalWhereInput = {};
  if (tema && (PROPOSAL_THEMES as readonly string[]).includes(tema)) where.theme = tema;
  if (riesgo && /^[1-5]$/.test(riesgo)) where.risk = Number(riesgo);
  if (origen === "club") where.source = "CLUB";
  if (origen === "familias") where.source = "FAMILY";
  if (query) where.OR = [{ title: { contains: query, mode: "insensitive" } }, { options: { some: { OR: [{ symbol: { contains: query, mode: "insensitive" } }, { name: { contains: query, mode: "insensitive" } }] } } }];

  const [proposals, totals, portfolios, usedRows] = await Promise.all([
    prisma.proposal.findMany({
      where,
      orderBy: [{ uses: "desc" }, { createdAt: "desc" }],
      take: 60,
      select: {
        id: true, source: true, signed: true, familyId: true, title: true, theme: true, risk: true, lesson: true, minChoices: true, maxChoices: true, uses: true,
        family: { select: { name: true } },
        options: { orderBy: { order: "asc" }, select: { symbol: true, name: true, kind: true } },
      },
    }),
    prisma.proposal.groupBy({ by: ["source"], _count: { _all: true } }),
    listPortfolios(admin.familyId),
    prisma.monthlyPortfolio.findMany({ where: { familyId: admin.familyId, sourceProposalId: { not: null } }, select: { sourceProposalId: true, month: true }, orderBy: { month: "asc" } }),
  ]);
  // Propuestas que esta familia ya convirtió en cartera (y en qué meses)
  const usedBy = new Map<string, string[]>();
  for (const r of usedRows) usedBy.set(r.sourceProposalId!, [...(usedBy.get(r.sourceProposalId!) ?? []), r.month]);
  const club = totals.find((t) => t.source === "CLUB")?._count._all ?? 0;
  const families = totals.find((t) => t.source === "FAMILY")?._count._all ?? 0;

  // Primer mes libre de esta familia, para proponerlo al crear la cartera
  const taken = new Set(portfolios.map((p) => p.month));
  let month = currentMonth();
  while (taken.has(month)) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m, 1);
    month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  const filtered = Boolean(tema || riesgo || origen || query);

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="card-kicker text-[11px]">Presidente del club</div>
          <h1 className="mt-1 mb-1">Repositorio de propuestas</h1>
          <p className="m-0 text-neutral-700 max-w-[68ch] [text-wrap:pretty]">¿Sin ideas para la cartera de este mes? Elige una propuesta ya preparada: trae la lección, las opciones y cuántas pueden elegir los miembros, en un texto neutro que puedes adaptar. Hay {club} del club y {families} compartidas por otras familias.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/cartera/repositorio/nueva" className="btn-primary">Nueva propuesta</Link>
          <Link href="/cartera/gestion" className="btn-ghost">← Carteras</Link>
        </div>
      </header>

      <form method="get" className="card gap-3" style={{ padding: 18 }} role="search" aria-label="Filtrar propuestas">
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 170px), 1fr))" }}>
          <div className="field"><label htmlFor="f-q">Buscar</label><input id="f-q" name="q" defaultValue={query} className="input" placeholder="Título, valor o nombre" maxLength={60} /></div>
          <div className="field">
            <label htmlFor="f-tema">Tema</label>
            <select id="f-tema" name="tema" defaultValue={tema ?? ""} className="input"><option value="">Todos</option>{PROPOSAL_THEMES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
          </div>
          <div className="field">
            <label htmlFor="f-riesgo">Riesgo</label>
            <select id="f-riesgo" name="riesgo" defaultValue={riesgo ?? ""} className="input"><option value="">Cualquiera</option>{[1, 2, 3, 4, 5].map((r) => <option key={r} value={r}>{r} · {RISK_LABEL[r]}</option>)}</select>
          </div>
          <div className="field">
            <label htmlFor="f-origen">Autoría</label>
            <select id="f-origen" name="origen" defaultValue={origen ?? ""} className="input"><option value="">Todas</option><option value="club">Del club</option><option value="familias">De familias</option></select>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-secondary">Filtrar</button>
          {filtered && <Link href="/cartera/repositorio" className="btn-ghost text-xs">Quitar filtros</Link>}
          <span className="text-xs text-neutral-700">{proposals.length} {proposals.length === 1 ? "propuesta" : "propuestas"}</span>
        </div>
      </form>

      {proposals.length === 0 ? (
        <p className="m-0 text-sm text-neutral-700">No hay propuestas con esos filtros.</p>
      ) : (
        <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))" }}>
          {proposals.map((p) => {
            const own = p.familyId === admin.familyId && p.source === "FAMILY";
            return (
              <article key={p.id} className="card blueprint gap-3" style={{ padding: 24 }} aria-labelledby={`t-${p.id}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="tag tag-outline">{p.theme}</span>
                  <RiskBar risk={p.risk} />
                  <span className="tag tag-neutral" title="Quién ha preparado la propuesta">{proposalSignature({ source: p.source, signed: p.signed, familyName: p.family?.name })}</span>
                  {own && <span className="tag tag-accent">Tuya</span>}
                  {usedBy.has(p.id) && <span className="tag tag-gold" title={`Tu familia la usó en ${usedBy.get(p.id)!.map(monthLabelLong).join(", ")}`}>Usada · {usedBy.get(p.id)!.map(monthLabelLong).join(", ")}</span>}
                  <span className="ml-auto text-xs text-neutral-700">{p.uses === 0 ? "Sin usar todavía" : `Usada ${p.uses} ${p.uses === 1 ? "vez" : "veces"}`}</span>
                </div>
                <h3 id={`t-${p.id}`} className="m-0">{p.title}</h3>
                <p className="m-0 text-[13px] text-neutral-700">Los miembros eligen de {p.minChoices} a {p.maxChoices} de {p.options.length} opciones.</p>
                <ul className="m-0 p-0 list-none flex flex-wrap gap-1.5">
                  {p.options.map((o) => (
                    <li key={o.symbol}>
                      <Link href={analysisHref(o.kind, o.symbol)} className="no-underline text-inherit inline-flex items-center gap-1.5 rounded-full border border-divider px-2.5 py-1 text-xs hover:border-accent" title={`${o.name} · ${KIND_LABEL[o.kind] ?? o.kind}`}>
                        <b>{o.symbol}</b><span className="text-neutral-700">{o.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <details className="group">
                  <summary className="cursor-pointer text-sm font-medium text-accent-700">Leer la lección completa</summary>
                  <div className="mt-3"><Markdown text={p.lesson} symbols={p.options.map((o) => ({ symbol: o.symbol, href: analysisHref(o.kind, o.symbol) }))} /></div>
                </details>
                <div className="border-t border-divider pt-3 flex flex-col gap-2">
                  <UseProposalForm proposalId={p.id} defaultMonth={month} />
                  {own && (
                    <form action={retireProposalAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <ConfirmButton className="btn-ghost text-xs" message="¿Retirar esta propuesta del repositorio? Las carteras que ya la usaron no cambian.">Retirar del repositorio</ConfirmButton>
                    </form>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <p className="m-0 text-xs text-neutral-700">Las propuestas son material educativo y no constituyen asesoramiento financiero. Al usar una, se crea el borrador de la cartera con el importe por defecto para cada miembro; puedes cambiar el texto, las opciones y los importes antes de publicarla.</p>
    </div>
  );
}
