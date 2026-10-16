import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { firstName } from "@/lib/names";
import { getPortfolioFull, isDeadlinePassed, monthLabelLong, STATUS_LABEL } from "@/lib/monthly";
import { eur, fmtDate } from "@/lib/format";
import { closeAction, deletePortfolioAction, removeOptionAction, reopenAction } from "@/app/actions/monthly";
import { ConfirmButton } from "@/components/ConfirmButton";
import { ShareProposalForm } from "../../repositorio/forms";
import { AddOptionForm, AllocationsForm, PortfolioDetailsForm, PublishForm } from "../forms";

export default async function GestionDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const p = await getPortfolioFull(id, admin.familyId);
  if (!p) notFound();
  const members = await prisma.user.findMany({ where: { familyId: admin.familyId, status: "ACTIVE" }, orderBy: { createdAt: "asc" }, select: { id: true, name: true } });
  const decidedIds = p.decisions.map((d) => d.userId);
  const locked = p.status === "CLOSED";
  const total = p.allocations.reduce((a, x) => a + x.amount, 0);
  const shared = await prisma.proposal.findUnique({ where: { sourcePortfolioId: p.id }, select: { signed: true, theme: true, risk: true } });
  const publishBlock = p.options.length === 0 ? "Añade al menos una opción de inversión." : total <= 0 ? "Asigna un importe a algún miembro." : p.options.length < p.minChoices ? "Hay menos opciones que el mínimo a elegir." : null;

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="card-kicker text-[11px] capitalize">Cartera de {monthLabelLong(p.month)} · {STATUS_LABEL[p.status]}{p.publishedAt ? ` · publicada el ${fmtDate(p.publishedAt)}` : ""}</div>
          <h1 className="mt-1 mb-1">{p.title}</h1>
          <p className="m-0 text-neutral-700">{p.options.length} opciones · {p.decisions.length} de {p.allocations.filter((a) => a.amount > 0).length} decisiones · {eur(total)} repartidos{isDeadlinePassed(p) ? " · plazo terminado" : ""}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/cartera/gestion" className="btn-ghost">← Carteras</Link>
          <Link href="/cartera" className="btn-secondary">Ver como miembro</Link>
          {p.status === "DRAFT" && <PublishForm portfolioId={p.id} disabledReason={publishBlock} />}
          {p.status === "PUBLISHED" && (
            <form action={closeAction}><input type="hidden" name="id" value={p.id} /><ConfirmButton className="btn-secondary" message="¿Cerrar la cartera? Los miembros ya no podrán decidir.">Cerrar cartera</ConfirmButton></form>
          )}
          {p.status === "CLOSED" && (
            <form action={reopenAction}><input type="hidden" name="id" value={p.id} /><button className="btn-secondary">Reabrir</button></form>
          )}
          {p.status === "DRAFT" && (
            <form action={deletePortfolioAction}><input type="hidden" name="id" value={p.id} /><ConfirmButton className="btn-danger" message="¿Borrar este borrador?">Borrar</ConfirmButton></form>
          )}
        </div>
      </header>

      <section className="card blueprint gap-3" style={{ padding: 24 }}>
        <div className="card-kicker">Propuesta y lección</div>
        <PortfolioDetailsForm initial={{ id: p.id, month: p.month, title: p.title, lesson: p.lesson, minChoices: p.minChoices, maxChoices: p.maxChoices, deadline: p.deadline ? p.deadline.toISOString().slice(0, 10) : "" }} locked={locked} />
      </section>

      <section className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))" }}>
        <div className="card blueprint gap-3" style={{ padding: 24 }}>
          <div className="card-kicker">Opciones de inversión</div>
          {p.options.length === 0 ? <p className="m-0 text-sm text-neutral-700">Todavía no hay opciones.</p> : (
            <div className="overflow-x-auto"><table className="table">
              <thead><tr><th>Valor</th><th>Tipo</th><th>Qué investigar</th><th /></tr></thead>
              <tbody>
                {p.options.map((o) => {
                  const chosen = p.decisions.some((d) => d.choices.some((c) => c.optionId === o.id));
                  return (
                    <tr key={o.id}>
                      <td><b>{o.symbol}</b><div className="text-xs text-neutral-600">{o.name}</div></td>
                      <td><span className="tag tag-neutral">{o.kind === "ETF" ? "ETF" : o.kind === "CRYPTO" ? "cripto" : o.kind === "COMMODITY" ? "materia prima" : "acción"}</span></td>
                      <td className="text-[13px]">{o.note ?? ""}</td>
                      <td className="text-right">
                        {!locked && !chosen && (
                          <form action={removeOptionAction}><input type="hidden" name="optionId" value={o.id} /><button className="text-xs text-neutral-600 hover:text-ink">Quitar</button></form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
          )}
          {!locked && <AddOptionForm portfolioId={p.id} />}
        </div>

        <div className="card blueprint gap-3" style={{ padding: 24 }}>
          <div className="card-kicker">Importe por miembro</div>
          <p className="m-0 text-[13px] text-neutral-700">{p.status === "DRAFT" ? "Se registrará como paga al publicar." : "Ya repartido como paga; puedes ajustarlo mientras el miembro no haya decidido."}</p>
          {locked ? (
            <div className="overflow-x-auto"><table className="table"><tbody>{p.allocations.map((a) => <tr key={a.id}><td>{firstName(a.user.name)}</td><td className="text-right tabular-nums">{eur(a.amount)}</td></tr>)}</tbody></table></div>
          ) : (
            <AllocationsForm portfolioId={p.id} decidedIds={decidedIds} members={members.map((m) => ({ id: m.id, name: firstName(m.name), amount: p.allocations.find((a) => a.userId === m.id)?.amount ?? 0 }))} />
          )}
        </div>
      </section>

      <section className="card blueprint gap-3" style={{ padding: 24 }}>
        <div className="card-kicker">Repositorio de propuestas</div>
        <p className="m-0 text-[13px] text-neutral-700 max-w-[68ch]">Si esta propuesta puede ayudar a otros presidentes sin ideas, compártela. La copia del repositorio no se actualiza sola: si cambias el título, la lección o las opciones, vuelve a pulsar «Guardar y compartir».{shared ? " Ahora mismo está compartida." : ""}</p>
        <ShareProposalForm
          portfolioId={p.id}
          familyName={admin.family.name}
          initial={{ shared: Boolean(shared), signed: shared?.signed ?? true, theme: shared?.theme ?? "", risk: shared?.risk ?? 0 }}
          snapshot={{ title: p.title, lesson: p.lesson, minChoices: p.minChoices, maxChoices: p.maxChoices, options: p.options.map((o) => ({ symbol: o.symbol, name: o.name, kind: o.kind, note: o.note })) }}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="m-0">Decisiones de los miembros</h3>
        {p.decisions.length === 0 ? <p className="m-0 text-sm text-neutral-700">Nadie ha decidido todavía.</p> : (
          p.decisions.map((d) => (
            <div key={d.id} className="card blueprint gap-2" style={{ padding: 18 }}>
              <div className="flex justify-between items-baseline flex-wrap gap-2"><b>{firstName(d.user.name)}</b><span className="text-xs text-neutral-700">{fmtDate(d.submittedAt)}</span></div>
              <div className="overflow-x-auto"><table className="table">
                <thead><tr><th>Valor</th><th className="text-right">Importe</th><th className="text-right">Precio</th><th>Por qué</th></tr></thead>
                <tbody>
                  {d.choices.map((c) => (
                    <tr key={c.id}>
                      <td><b>{c.option.symbol}</b></td>
                      <td className="text-right tabular-nums">{eur(c.amount)}</td>
                      <td className="text-right tabular-nums">{c.price !== null ? eur(c.price) : "—"}</td>
                      <td className="text-[13px]">{c.why}{c.exitCondition ? <span className="block text-xs text-neutral-700">Vendería si: {c.exitCondition}</span> : null}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
              <div className="text-[14px] [text-wrap:pretty]">“{d.argument}”</div>
            </div>
          ))
        )}
        {p.allocations.filter((a) => a.amount > 0 && !decidedIds.includes(a.userId)).length > 0 && (
          <p className="m-0 text-xs text-neutral-700">Pendientes: {p.allocations.filter((a) => a.amount > 0 && !decidedIds.includes(a.userId)).map((a) => firstName(a.user.name)).join(", ")}</p>
        )}
      </section>
    </div>
  );
}
