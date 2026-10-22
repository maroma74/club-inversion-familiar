import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { firstName } from "@/lib/names";
import { findUnlinkedTrades, getPortfolioFull, isDeadlinePassed, monthLabelLong, STATUS_LABEL } from "@/lib/monthly";
import { eur, fmtDate } from "@/lib/format";
import { adoptTradeAsDecisionAction, closeAction, deletePortfolioAction, removeOptionAction } from "@/app/actions/monthly";
import { ConfirmButton } from "@/components/ConfirmButton";
import { todayYmd } from "@/lib/validation";
import { ShareProposalForm } from "../../repositorio/forms";
import { AddOptionForm, AllocationsForm, PortfolioDetailsForm, PublishForm, ScheduleForm } from "../forms";
import { aiConfigured } from "@/lib/ai";
import { previewAllocation } from "@/lib/decisionCoach";
import { DecisionCoach } from "../../DecisionCoach";

export default async function GestionDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const p = await getPortfolioFull(id, admin.familyId);
  if (!p) notFound();
  const members = await prisma.user.findMany({ where: { familyId: admin.familyId, status: "ACTIVE" }, orderBy: { createdAt: "asc" }, select: { id: true, name: true } });
  const decidedIds = p.decisions.map((d) => d.userId);
  const locked = p.status === "CLOSED";
  const total = p.allocations.reduce((a, x) => a + x.amount, 0);
  const shared = await prisma.proposal.findUnique({ where: { sourcePortfolioId: p.id }, select: { signed: true, theme: true, risk: true, uses: true, _count: { select: { portfolios: { where: { familyId: { not: admin.familyId } } } } } } });
  const publishBlock = p.options.length === 0 ? "Añade al menos una opción de inversión." : total <= 0 ? "Asigna un importe a algún miembro." : p.options.length < p.minChoices ? "Hay menos opciones que el mínimo a elegir." : null;
  // Miembros activos sin importe (entraron después de crear la cartera o no se les asignó): no podrían decidir
  const withoutAllocation = members.filter((m) => !p.allocations.some((a) => a.userId === m.id && a.amount > 0));
  const unlinked = await findUnlinkedTrades(p);

  // Plazo y estado: qué ven los miembros ahora mismo y qué fecha proponer al ampliar o reabrir
  const today = todayYmd();
  const deadlinePassed = isDeadlinePassed(p);
  const deadlineYmd = p.deadline ? todayYmd(p.deadline) : "";
  const plusWeek = new Date(Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10) + 7)).toISOString().slice(0, 10);
  const suggested = deadlineYmd && deadlineYmd >= today ? deadlineYmd : plusWeek;
  const pending = p.allocations.filter((a) => a.amount > 0 && !decidedIds.includes(a.userId)).length;
  const scheduleTone = p.status === "CLOSED" ? "var(--color-divider)" : deadlinePassed ? "#e5a016" : "var(--color-accent)";
  const scheduleText =
    p.status === "CLOSED"
      ? `Cerrada${p.closedAt ? ` el ${fmtDate(p.closedAt)}` : ""}: está archivada en el historial y nadie puede decidir.${pending ? ` Faltan ${pending} por decidir.` : ""} Si la reabres, los que faltan podrán decidir hasta la fecha que elijas; las decisiones enviadas y la paga no cambian.`
      : deadlinePassed
        ? `El plazo terminó el ${fmtDate(p.deadline!)}: aunque sigue abierta, ya nadie puede decidir.${pending ? ` Faltan ${pending} por decidir.` : ""} Amplía el plazo para que puedan hacerlo, o ciérrala para archivarla.`
        : p.deadline
          ? `Abierta hasta el ${fmtDate(p.deadline)} a las 23:59.${pending ? ` Faltan ${pending} por decidir.` : " Ya han decidido todos."} Puedes ampliar el plazo, quitarlo o cerrarla antes.`
          : `Abierta sin fecha límite.${pending ? ` Faltan ${pending} por decidir.` : " Ya han decidido todos."} Puedes ponerle un plazo o cerrarla cuando quieras.`;

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="card-kicker text-[11px] capitalize">Cartera de {monthLabelLong(p.month)} · {STATUS_LABEL[p.status]}{p.publishedAt ? ` · publicada el ${fmtDate(p.publishedAt)}` : ""}</div>
          <h1 className="mt-1 mb-1">{p.title}</h1>
          <p className="m-0 text-neutral-700">{p.options.length} opciones · {p.decisions.length} de {p.allocations.filter((a) => a.amount > 0).length} decisiones · {eur(total)} repartidos{isDeadlinePassed(p) ? " · plazo terminado" : ""}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/cartera/gestion" className="btn-ghost">← Todas las carteras y propuestas</Link>
          <Link href="/cartera" className="btn-secondary">Ver como miembro</Link>
          {p.status === "DRAFT" && <PublishForm portfolioId={p.id} disabledReason={publishBlock} />}
          {p.status === "DRAFT" && (
            <form action={deletePortfolioAction}><input type="hidden" name="id" value={p.id} /><ConfirmButton className="btn-danger" message="¿Borrar este borrador?">Borrar</ConfirmButton></form>
          )}
        </div>
      </header>

      {p.status !== "DRAFT" && (
        <section id="plazo" className="card blueprint gap-3" style={{ padding: 24, borderColor: scheduleTone }} aria-labelledby="plazo-title">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 id="plazo-title" className="m-0">Plazo y estado</h3>
            <span className={`tag ${p.status === "CLOSED" ? "tag-neutral" : deadlinePassed ? "tag-gold" : "tag-accent"}`}>{p.status === "CLOSED" ? "Cerrada" : deadlinePassed ? "Plazo terminado" : "Abierta"}</span>
          </div>
          <p className="m-0 text-sm text-neutral-700 max-w-[75ch] [text-wrap:pretty]">{scheduleText}</p>
          <ScheduleForm portfolioId={p.id} closed={p.status === "CLOSED"} suggested={suggested} today={today} />
          {p.status === "PUBLISHED" && (
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-divider">
              <form action={closeAction}><input type="hidden" name="id" value={p.id} /><ConfirmButton className="btn-secondary" message="¿Cerrar la cartera ya? Quien no haya decidido no podrá hacerlo y la cartera pasa al historial.">Cerrar la cartera ahora</ConfirmButton></form>
              <span className="text-xs text-neutral-700">Cerrarla la archiva en el historial con su repaso. Podrás reabrirla después si hace falta.</span>
            </div>
          )}
        </section>
      )}

      <section className="card blueprint gap-3" style={{ padding: 24 }}>
        <div className="card-kicker">Propuesta y lección</div>
        <PortfolioDetailsForm initial={{ id: p.id, month: p.month, title: p.title, lesson: p.lesson, minChoices: p.minChoices, maxChoices: p.maxChoices, deadline: deadlineYmd }} locked={locked} />
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

      {p.status !== "CLOSED" && aiConfigured() && !admin.impersonator && (
        p.options.length > 0 ? (
          <DecisionCoach
            portfolioId={p.id}
            userId={admin.id}
            name={firstName(admin.name)}
            options={p.options.map((o) => ({ symbol: o.symbol, name: o.name, href: o.kind === "COMMODITY" ? `/materias-primas/${encodeURIComponent(o.symbol)}` : o.kind === "CRYPTO" ? `/cripto/${encodeURIComponent(o.symbol)}` : o.kind === "ETF" ? `/etf/${encodeURIComponent(o.symbol)}` : `/acciones/${encodeURIComponent(o.symbol)}` }))}
            preview={{ amount: eur(previewAllocation(p.allocations, admin.id, admin.family.monthlyAllowance)), disabledForMembers: !admin.family.tutorEnabled }}
          />
        ) : (
          <section className="card card-snug gap-1">
            <div className="card-kicker" style={{ textTransform: "none", letterSpacing: "0.02em" }}>TutorIA</div>
            <p className="m-0 text-sm text-neutral-700">Cuando la cartera tenga al menos una opción, podrás probar aquí cómo la explica TutorIA a los miembros.</p>
          </section>
        )
      )}

      {p.status !== "CLOSED" && withoutAllocation.length > 0 && (
        <section className="card card-snug gap-1" style={{ borderColor: "#e5a016" }}>
          <div className="card-kicker">Miembros sin importe</div>
          <p className="m-0 text-sm [text-wrap:pretty]"><b>{withoutAllocation.map((m) => firstName(m.name)).join(", ")}</b> {withoutAllocation.length === 1 ? "no tiene" : "no tienen"} importe en esta cartera, así que el formulario no {withoutAllocation.length === 1 ? "le" : "les"} dejará decidir. Asígnaselo en «Importe por miembro» (si entraron después de crear la cartera aparecen a 0).</p>
        </section>
      )}

      {unlinked.length > 0 && (
        <section className="card blueprint gap-3" style={{ padding: 24, borderColor: "var(--color-accent)" }}>
          <div className="card-kicker">Compras hechas fuera del formulario</div>
          <p className="m-0 text-sm text-neutral-700 max-w-[70ch] [text-wrap:pretty]">Estos miembros compraron a mano valores de esta cartera desde su publicación (por ejemplo, porque no tenían importe asignado). Si cuentan como su decisión del mes, reconócelas: aparecerán en «cómo decide el club» y en el repaso con el precio real que pagaron. No mueve dinero: la compra ya está hecha y pagada con su efectivo.</p>
          <div className="overflow-x-auto"><table className="table">
            <thead><tr><th>Miembro</th><th>Compra</th><th className="text-right">Coste</th><th>Porqué en el diario</th><th /></tr></thead>
            <tbody>
              {unlinked.map((t) => (
                <tr key={t.id}>
                  <td className="font-medium">{firstName(t.userName)}</td>
                  <td><b>{t.symbol}</b> <span className="text-xs text-neutral-700">{t.quantity.toLocaleString("es-ES", { maximumFractionDigits: 6 })} uds. a {eur(t.priceEur)} · {fmtDate(t.date)} · {t.broker ?? "sin entidad"}</span></td>
                  <td className="text-right tabular-nums whitespace-nowrap">{eur(t.costEur)}</td>
                  <td className="text-sm max-w-[320px] [text-wrap:pretty]">{t.why ? `“${t.why}”` : <span className="text-neutral-700">sin porqué todavía</span>}</td>
                  <td className="text-right whitespace-nowrap">
                    <form action={adoptTradeAsDecisionAction}>
                      <input type="hidden" name="portfolioId" value={p.id} />
                      <input type="hidden" name="tradeId" value={t.id} />
                      <ConfirmButton className="btn-primary py-1 text-xs" message={`¿Contar esta compra de ${t.symbol} como la decisión de ${firstName(t.userName)} en la cartera de ${monthLabelLong(p.month)}?`}>Contar como su decisión</ConfirmButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </section>
      )}

      <section className="card blueprint gap-3" style={{ padding: 24 }}>
        <div className="card-kicker">Repositorio de propuestas</div>
        <p className="m-0 text-[13px] text-neutral-700 max-w-[68ch]">Si esta propuesta puede ayudar a otros presidentes sin ideas, compártela. La copia del repositorio no se actualiza sola: si cambias el título, la lección o las opciones, vuelve a pulsar «Guardar y compartir».</p>
        {shared && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="tag tag-accent">Compartida</span>
            <span className="tabular-nums">{shared.uses === 0 ? "Nadie la ha usado todavía." : `Usada ${shared.uses} ${shared.uses === 1 ? "vez" : "veces"}${shared._count.portfolios ? `, ${shared._count.portfolios} por otras familias` : ""}.`}</span>
            <span className="text-neutral-700">Cada uso es una familia aprendiendo con tu lección.</span>
          </div>
        )}
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
