import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getCurrentPortfolio, isDeadlinePassed, monthLabelLong, STATUS_LABEL } from "@/lib/monthly";
import { Markdown } from "@/components/Markdown";
import { getPrices } from "@/lib/prices";
import { getClubRecommendations } from "@/lib/club";
import { eur, fmtDate } from "@/lib/format";
import { ActionBadge } from "@/components/ClubRecommendationCard";
import { DecisionForm } from "./DecisionForm";

const analysisHref = (kind: string, symbol: string) => (kind === "CRYPTO" ? "/cripto" : kind === "ETF" ? `/etf/${encodeURIComponent(symbol)}` : `/acciones/${encodeURIComponent(symbol)}`);

export default async function CarteraPage() {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";
  const p = await getCurrentPortfolio(user.familyId);

  if (!p) {
    return (
      <div className="flex flex-col gap-5 max-w-[720px]">
        <header>
          <div className="card-kicker text-[11px]">Invertir</div>
          <h1 className="mt-1 mb-1">Cartera del mes</h1>
          <p className="m-0 text-neutral-700">Cada mes, el presidente del club reparte la paga, propone los valores entre los que elegir y explica por qué. Todavía no hay ninguna cartera publicada.</p>
        </header>
        {isAdmin && <div><Link href="/cartera/gestion" className="btn-primary blueprint">Preparar la cartera del mes</Link></div>}
      </div>
    );
  }

  const [prices, recs, history] = await Promise.all([
    getPrices(p.options.map((o) => o.symbol)),
    getClubRecommendations(p.options.filter((o) => o.kind !== "CRYPTO").map((o) => o.symbol)),
    prisma.monthlyPortfolio.findMany({ where: { familyId: user.familyId, status: "CLOSED", id: { not: p.id } }, orderBy: { month: "desc" }, take: 6, include: { decisions: { where: { userId: user.id }, include: { choices: { include: { option: true } } } } } }),
  ]);
  const myAllocation = p.allocations.find((a) => a.userId === user.id)?.amount ?? 0;
  const myDecision = p.decisions.find((d) => d.userId === user.id) ?? null;
  const open = p.status === "PUBLISHED" && !isDeadlinePassed(p);
  const canDecide = open && !myDecision && myAllocation > 0;
  const others = p.decisions.filter((d) => d.userId !== user.id);
  const memberNames = new Map(p.allocations.map((a) => [a.userId, a.user.name]));
  const pendingMembers = p.allocations.filter((a) => a.amount > 0 && !p.decisions.some((d) => d.userId === a.userId)).map((a) => a.user.name);

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="card-kicker text-[11px] capitalize">Cartera de {monthLabelLong(p.month)} · {STATUS_LABEL[p.status]}{p.deadline ? ` · hasta el ${fmtDate(p.deadline)}` : ""}</div>
          <h1 className="mt-1 mb-1">{p.title}</h1>
          <p className="m-0 text-neutral-700 max-w-[62ch]">
            {p.maxChoices === 1 ? "Elige una de las opciones" : `Elige entre ${p.minChoices} y ${p.maxChoices} opciones`} y argumenta tu decisión. Tu importe este mes: <b className="text-ink">{eur(myAllocation)}</b>.
          </p>
        </div>
        {isAdmin && <Link href={`/cartera/gestion/${p.id}`} className="btn-secondary">Gestionar esta cartera</Link>}
      </header>

      <section className="card blueprint gap-3" style={{ padding: 28, borderColor: "var(--color-accent)" }}>
        <div className="card-kicker">Lección del mes · por el presidente del club</div>
        <Markdown text={p.lesson} symbols={p.options.map((o) => ({ symbol: o.symbol, href: analysisHref(o.kind, o.symbol) }))} />
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="m-0">Opciones de este mes</h3>
        <div className="overflow-x-auto">
          <table className="table">
            <thead><tr><th>Valor</th><th>Tipo</th><th className="text-right">Precio</th><th>Club de inversión</th><th>Qué investigar</th><th /></tr></thead>
            <tbody>
              {p.options.map((o) => {
                const q = prices.get(o.symbol.toUpperCase());
                const r = recs.get(o.symbol.toUpperCase());
                return (
                  <tr key={o.id}>
                    <td><div className="font-medium">{o.symbol}</div><div className="text-xs text-neutral-600">{o.name}</div></td>
                    <td><span className="tag tag-neutral">{o.kind === "ETF" ? "ETF" : o.kind === "CRYPTO" ? "cripto" : "acción"}</span></td>
                    <td className="text-right tabular-nums whitespace-nowrap">{q ? eur(q.priceEur) : "—"}</td>
                    <td className="whitespace-nowrap">{r ? <><ActionBadge action={r.action} small /> <span className="text-xs text-neutral-700">{r.total > 0 ? "+" : ""}{r.total.toFixed(2)}</span></> : <span className="text-xs text-neutral-600">—</span>}</td>
                    <td className="text-[13px] text-neutral-800 max-w-[360px]">{o.note ?? ""}</td>
                    <td className="text-right whitespace-nowrap"><Link href={analysisHref(o.kind, o.symbol)} className="btn-ghost text-xs">Analizar</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {canDecide && (
        <section className="card blueprint" style={{ padding: 24 }}>
          <DecisionForm
            portfolioId={p.id}
            allocation={myAllocation}
            minChoices={p.minChoices}
            maxChoices={p.maxChoices}
            options={p.options.map((o) => ({ id: o.id, symbol: o.symbol, name: o.name, kind: o.kind, note: o.note, price: prices.get(o.symbol.toUpperCase())?.priceEur ?? null }))}
          />
        </section>
      )}
      {!canDecide && !myDecision && p.status === "PUBLISHED" && (
        <p className="m-0 text-sm text-neutral-700">{myAllocation <= 0 ? "No tienes importe asignado este mes." : "El plazo para decidir ha terminado."}</p>
      )}

      {myDecision && (
        <section className="card blueprint gap-3" style={{ padding: 20 }}>
          <div className="flex justify-between items-baseline flex-wrap gap-2">
            <h3 className="m-0">Tu decisión</h3>
            <span className="text-xs text-neutral-700">enviada el {fmtDate(myDecision.submittedAt)}</span>
          </div>
          <ChoicesTable choices={myDecision.choices} />
          <div className="text-[15px] [text-wrap:pretty]">“{myDecision.argument}”</div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex justify-between items-baseline flex-wrap gap-2">
          <h3 className="m-0">Decisiones del club</h3>
          <span className="text-xs text-neutral-700">{p.decisions.length} de {p.allocations.filter((a) => a.amount > 0).length} han decidido{pendingMembers.length ? ` · faltan ${pendingMembers.join(", ")}` : ""}</span>
        </div>
        {!myDecision && !isAdmin && others.length > 0 && <p className="m-0 text-sm text-neutral-700">Verás las decisiones de los demás cuando envíes la tuya.</p>}
        {(myDecision || isAdmin || p.status === "CLOSED") && others.length === 0 && <p className="m-0 text-sm text-neutral-700">Nadie más ha decidido todavía.</p>}
        {(myDecision || isAdmin || p.status === "CLOSED") &&
          others.map((d) => (
            <div key={d.id} className="card blueprint gap-2" style={{ padding: 18 }}>
              <div className="flex justify-between items-baseline flex-wrap gap-2"><b>{memberNames.get(d.userId) ?? d.user.name}</b><span className="text-xs text-neutral-700">{fmtDate(d.submittedAt)}</span></div>
              <ChoicesTable choices={d.choices} />
              <div className="text-[14px] [text-wrap:pretty]">“{d.argument}”</div>
            </div>
          ))}
      </section>

      {history.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="m-0">Meses anteriores</h3>
          <table className="table">
            <thead><tr><th>Mes</th><th>Cartera</th><th>Tu elección</th></tr></thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td className="capitalize">{monthLabelLong(h.month)}</td>
                  <td>{h.title}</td>
                  <td>{h.decisions[0]?.choices.map((c) => `${c.option.symbol} ${eur(c.amount)}`).join(", ") || "sin decisión"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function ChoicesTable({ choices }: { choices: { id: string; amount: number; why: string; exitCondition: string | null; price: number | null; quantity: number | null; option: { symbol: string; name: string } }[] }) {
  return (
    <table className="table">
      <thead><tr><th>Valor</th><th className="text-right">Importe</th><th className="text-right">Precio</th><th className="text-right">Uds.</th><th>Por qué</th></tr></thead>
      <tbody>
        {choices.map((c) => (
          <tr key={c.id}>
            <td><b>{c.option.symbol}</b> <span className="text-xs text-neutral-600">{c.option.name}</span></td>
            <td className="text-right tabular-nums">{eur(c.amount)}</td>
            <td className="text-right tabular-nums">{c.price !== null ? eur(c.price) : "—"}</td>
            <td className="text-right tabular-nums">{c.quantity !== null ? c.quantity.toLocaleString("es-ES", { maximumFractionDigits: 6 }) : "—"}</td>
            <td className="text-[13px]">{c.why}{c.exitCondition ? <span className="block text-xs text-neutral-700">Vendería si: {c.exitCondition}</span> : null}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
