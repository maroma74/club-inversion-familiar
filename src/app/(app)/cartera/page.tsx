import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { firstName } from "@/lib/names";
import { getCurrentPortfolio, isDeadlinePassed, monthLabelLong, STATUS_LABEL } from "@/lib/monthly";
import { Markdown } from "@/components/Markdown";
import { getPrices } from "@/lib/prices";
import { getClubRecommendations } from "@/lib/club";
import { eur, fmtDate, signed } from "@/lib/format";
import { DecisionForm } from "./DecisionForm";

const analysisHref = (kind: string, symbol: string) => (kind === "COMMODITY" ? `/materias-primas/${encodeURIComponent(symbol)}` : kind === "CRYPTO" ? `/cripto/${encodeURIComponent(symbol)}` : kind === "ETF" ? `/etf/${encodeURIComponent(symbol)}` : `/acciones/${encodeURIComponent(symbol)}`);
const kindLabel = (k: string) => (k === "ETF" ? "ETF" : k === "CRYPTO" ? "cripto" : k === "COMMODITY" ? "materia prima" : "acción");
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** La recomendación del Club, dicha en lenguaje llano; la puntuación queda como detalle al pasar el ratón. */
const signalText = (action: string) => (action === "COMPRAR" ? "El club ve buena señal" : action === "VENDER" ? "El club ve señales de precaución" : "El club ve una señal neutra: mejor seguir observando");

type Choice = { id: string; amount: number; why: string; exitCondition: string | null; price: number | null; quantity: number | null; option: { symbol: string; name: string } };

export default async function CarteraPage() {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";
  const p = await getCurrentPortfolio(user.familyId);

  if (!p) {
    return (
      <div className="flex flex-col gap-5 max-w-[720px]">
        <header>
          <div className="card-kicker">Invertir</div>
          <h1 className="mt-1 mb-1">Cartera del mes</h1>
          <p className="m-0 text-neutral-700">Cada mes, el presidente del club reparte la paga, propone los valores entre los que elegir y explica por qué. Todavía no hay ninguna cartera publicada.</p>
        </header>
        <div className="card card-snug gap-2">
          <div className="font-heading text-lg">Mientras llega la próxima cartera</div>
          <p className="m-0 text-sm text-neutral-700">Puedes practicar en la Academia: cada lección te ayuda a decidir mejor cuando llegue el mes.</p>
          <div><Link href="/academia" className="btn-secondary">Ir a la Academia</Link></div>
        </div>
        {isAdmin && <div><Link href="/cartera/gestion" className="btn-primary">Preparar la cartera del mes</Link></div>}
      </div>
    );
  }

  const [prices, recs, history] = await Promise.all([
    getPrices(p.options.map((o) => o.symbol), p.familyId),
    getClubRecommendations(p.options.filter((o) => o.kind !== "CRYPTO").map((o) => o.symbol)),
    prisma.monthlyPortfolio.findMany({ where: { familyId: user.familyId, status: "CLOSED", id: { not: p.id } }, orderBy: { month: "desc" }, take: 6, include: { decisions: { where: { userId: user.id }, include: { choices: { include: { option: true } } } } } }),
  ]);
  const myAllocation = p.allocations.find((a) => a.userId === user.id)?.amount ?? 0;
  const myDecision = p.decisions.find((d) => d.userId === user.id) ?? null;
  const open = p.status === "PUBLISHED" && !isDeadlinePassed(p);
  const canDecide = open && !myDecision && myAllocation > 0;
  const others = p.decisions.filter((d) => d.userId !== user.id);
  const memberNames = new Map(p.allocations.map((a) => [a.userId, firstName(a.user.name)]));
  const deciders = p.allocations.filter((a) => a.amount > 0);
  const pendingMembers = deciders.filter((a) => !p.decisions.some((d) => d.userId === a.userId)).map((a) => firstName(a.user.name));
  const showOthers = !!myDecision || isAdmin || p.status === "CLOSED";
  const daysLeft = p.deadline ? Math.ceil((p.deadline.getTime() - new Date().getTime()) / 86_400_000) : null;
  const daysText = daysLeft === null ? "" : daysLeft <= 0 ? " · el plazo termina hoy" : daysLeft === 1 ? " · te queda 1 día" : ` · te quedan ${daysLeft} días`;

  const optionView = p.options.map((o) => {
    const q = prices.get(o.symbol.toUpperCase());
    const r = recs.get(o.symbol.toUpperCase());
    return { o, price: q ? q.priceEur : null, signal: r ? signalText(r.action) : null, score: r ? signed(r.total, 2) : null, href: analysisHref(o.kind, o.symbol) };
  });

  // Cuántas personas eligieron cada opción (para comparar, no para copiar)
  const picksBySymbol = new Map<string, number>();
  for (const d of p.decisions) for (const c of d.choices) picksBySymbol.set(c.option.symbol, (picksBySymbol.get(c.option.symbol) ?? 0) + 1);

  const status = canDecide
    ? { title: "Tu decisión está pendiente", text: `Tienes ${eur(myAllocation)} para repartir${daysText}. Verás las decisiones de los demás cuando envíes la tuya.`, accent: true }
    : myDecision
      ? { title: "Has enviado tu decisión", text: `Ya está en tu cartera y en tu diario. ${others.length ? "Mira abajo cómo han decidido los demás." : "Cuando decidan los demás, verás aquí sus elecciones."}`, accent: false }
      : p.status === "CLOSED"
        ? { title: "Cartera cerrada", text: "El presidente ha cerrado esta cartera. Abajo puedes ver cómo quedó la familia.", accent: false }
        : myAllocation <= 0
          ? { title: "No tienes importe este mes", text: "Esta cartera no te ha asignado importe, así que no hay nada que decidir. Puedes leer la lección y ver las opciones.", accent: false }
          : { title: "El plazo ha terminado", text: "Ya no se puede decidir en esta cartera. Aun así puedes leer la lección y ver las opciones.", accent: false };

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="card-kicker">Cartera de {monthLabelLong(p.month)} · {STATUS_LABEL[p.status]}{p.deadline ? ` · hasta el ${fmtDate(p.deadline)}` : ""}</div>
          <h1 className="mt-1 mb-1">{p.title}</h1>
          <p className="m-0 text-neutral-700 max-w-[62ch]">
            {canDecide
              ? `${p.maxChoices === 1 ? "Elige una de las opciones" : `Elige entre ${p.minChoices} y ${p.maxChoices} opciones`}, reparte tu importe y cuenta por qué.`
              : "Esta es la propuesta del mes: una lección y las opciones entre las que se podía elegir."}{" "}
            Tu importe este mes: <b className="text-ink">{eur(myAllocation)}</b>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/cartera/historial" className="btn-ghost">Historial</Link>
          {isAdmin && <Link href="/cartera/gestion" className="btn-ghost">Gestión de carteras</Link>}
          {isAdmin && <Link href={`/cartera/gestion/${p.id}`} className="btn-secondary">Gestionar esta cartera</Link>}
        </div>
      </header>

      <section aria-labelledby="estado-decision" className="card card-snug gap-2" style={{ borderColor: status.accent ? "var(--color-accent)" : "var(--color-divider)" }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="estado-decision" className="m-0 text-xl">{status.title}</h2>
            <p className="m-0 mt-1 text-sm text-neutral-700 max-w-[62ch] [text-wrap:pretty]">{status.text}</p>
          </div>
          {canDecide && <a href="#decidir" className="btn-primary">Ir a decidir</a>}
          {myDecision && <Link href="/inicio" className="btn-secondary">Ver mi diario</Link>}
        </div>
        {isAdmin && !open && pendingMembers.length > 0 && (
          <p className="m-0 text-sm text-neutral-700">
            {pendingMembers.join(", ")} {pendingMembers.length === 1 ? "no ha" : "no han"} decidido. <Link href={`/cartera/gestion/${p.id}#plazo`} className="text-accent-700 font-medium">{p.status === "CLOSED" ? "Reabrir la cartera" : "Ampliar el plazo"}</Link>
          </p>
        )}
      </section>

      <details open className="card card-roomy gap-3" style={{ borderColor: "var(--color-divider)" }}>
        <summary className="card-kicker cursor-pointer">Lección del mes · por el presidente del club (puedes plegarla)</summary>
        <div className="mt-3"><Markdown text={p.lesson} symbols={p.options.map((o) => ({ symbol: o.symbol, href: analysisHref(o.kind, o.symbol) }))} /></div>
      </details>

      <section className="flex flex-col gap-3">
        <h3 className="m-0">Opciones de este mes</h3>
        <div className="hidden md:block overflow-x-auto">
          <table className="table">
            <thead><tr><th>Valor</th><th>Tipo</th><th className="text-right">Precio</th><th>Señal del club</th><th>Qué investigar</th><th><span className="sr-only">Análisis</span></th></tr></thead>
            <tbody>
              {optionView.map(({ o, price, signal, score, href }) => (
                <tr key={o.id}>
                  <td><div className="font-medium">{o.symbol}</div><div className="text-xs text-neutral-700">{o.name}</div></td>
                  <td><span className="tag tag-neutral">{kindLabel(o.kind)}</span></td>
                  <td className="text-right tabular-nums whitespace-nowrap">{price !== null ? eur(price) : "—"}</td>
                  <td className="text-sm max-w-[220px]" title={score ? `Puntuación del club: ${score}` : undefined}>{signal ?? <span className="text-neutral-700">—</span>}</td>
                  <td className="text-sm max-w-[360px] [text-wrap:pretty]">{o.note ?? ""}</td>
                  <td className="text-right whitespace-nowrap"><Link href={href} className="btn-ghost">Analizar</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="md:hidden flex flex-col gap-3">
          {optionView.map(({ o, price, signal, score, href }) => (
            <div key={o.id} className="card card-snug gap-1.5">
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <div><span className="font-heading text-lg">{o.symbol}</span> <span className="tag tag-neutral ml-1">{kindLabel(o.kind)}</span></div>
                <span className="tabular-nums text-sm">{price !== null ? eur(price) : "—"}</span>
              </div>
              <div className="text-sm text-neutral-700">{o.name}</div>
              {signal && <div className="text-sm" title={score ? `Puntuación del club: ${score}` : undefined}>{signal}</div>}
              {o.note && <div className="text-sm [text-wrap:pretty]"><b>Qué investigar:</b> {o.note}</div>}
              <div><Link href={href} className="btn-ghost">Analizar {o.symbol}</Link></div>
            </div>
          ))}
        </div>
      </section>

      {canDecide && (
        <section id="decidir" aria-label="Tu decisión" className="card card-roomy scroll-mt-20">
          <DecisionForm
            portfolioId={p.id}
            userId={user.id}
            allocation={myAllocation}
            minChoices={p.minChoices}
            maxChoices={p.maxChoices}
            options={optionView.map(({ o, price, signal, href }) => ({ id: o.id, symbol: o.symbol, name: o.name, kind: o.kind, note: o.note, price, href, signal }))}
          />
        </section>
      )}

      {myDecision && (
        <section aria-labelledby="mi-decision" className="card card-roomy gap-3" style={{ borderColor: "var(--color-accent)" }}>
          <div>
            <h3 id="mi-decision" className="m-0">Tu cartera de {monthLabelLong(p.month)} está en tu diario</h3>
            <div className="text-sm text-neutral-700 mt-1">Enviada el {fmtDate(myDecision.submittedAt)}</div>
          </div>
          <ChoicesTable choices={myDecision.choices} />
          <div className="text-base [text-wrap:pretty]">“{myDecision.argument}”</div>
        </section>
      )}

      <section aria-labelledby="club-decide" className="flex flex-col gap-3">
        <div className="flex justify-between items-baseline flex-wrap gap-2">
          <h3 id="club-decide" className="m-0">Cómo decide el club</h3>
          <span className="text-sm text-neutral-700">{p.decisions.length} de {deciders.length} han decidido{pendingMembers.length ? ` · faltan ${pendingMembers.join(", ")}` : ""}</span>
        </div>
        {!showOthers && others.length > 0 && <p className="m-0 text-sm text-neutral-700">Verás las decisiones de los demás cuando envíes la tuya.</p>}
        {showOthers && others.length === 0 && <p className="m-0 text-sm text-neutral-700">Nadie más ha decidido todavía.</p>}
        {showOthers && p.decisions.length > 0 && (
          <div className="card card-snug gap-2">
            <div className="card-kicker">Qué han elegido</div>
            {p.options.map((o) => {
              const n = picksBySymbol.get(o.symbol) ?? 0;
              return (
                <div key={o.id} className="flex items-center gap-3 text-sm">
                  <span className="w-[72px] font-medium">{o.symbol}</span>
                  <div className="bar flex-1" role="img" aria-label={`${o.symbol}: ${n} de ${p.decisions.length}`}><span style={{ width: `${(n / p.decisions.length) * 100}%` }} /></div>
                  <span className="w-[84px] text-right text-neutral-700">{n} de {p.decisions.length}</span>
                </div>
              );
            })}
          </div>
        )}
        {showOthers &&
          others.map((d) => (
            <div key={d.id} className="card card-snug gap-2">
              <div className="flex justify-between items-baseline flex-wrap gap-2"><b>{memberNames.get(d.userId) ?? firstName(d.user.name)}</b><span className="text-xs text-neutral-700">{fmtDate(d.submittedAt)}</span></div>
              <div className="flex flex-wrap gap-1.5">
                {d.choices.map((c) => <span key={c.id} className="tag tag-accent">{c.option.symbol} {eur(c.amount)}</span>)}
              </div>
              <div className="text-base [text-wrap:pretty]">“{d.argument}”</div>
              <details className="text-sm">
                <summary className="cursor-pointer text-accent-700 font-medium">Ver el porqué de cada elección</summary>
                <div className="mt-2"><ChoicesTable choices={d.choices} /></div>
              </details>
            </div>
          ))}
      </section>

      {history.length > 0 && (
        <section className="flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="m-0">Meses anteriores</h3>
            <Link href="/cartera/historial" className="text-sm text-accent-700">Ver el repaso de cada mes →</Link>
          </div>
          <div className="overflow-x-auto"><table className="table">
            <thead><tr><th>Mes</th><th>Cartera</th><th>Tu elección</th></tr></thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td>{cap(monthLabelLong(h.month))}</td>
                  <td><Link href={`/cartera/historial/${h.id}`} className="text-accent-700">{h.title}</Link></td>
                  <td>
                    {h.decisions[0]?.choices.length ? (
                      <div className="flex flex-wrap gap-1.5">{h.decisions[0].choices.map((c) => <span key={c.id} className="tag tag-neutral">{c.option.symbol} {eur(c.amount)}</span>)}</div>
                    ) : (
                      "sin decisión"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </section>
      )}
    </div>
  );
}

function ChoicesTable({ choices }: { choices: Choice[] }) {
  return (
    <>
    <ul className="md:hidden m-0 p-0 list-none flex flex-col gap-3">
      {choices.map((c) => (
        <li key={c.id} className="flex flex-col gap-1 border-t border-divider pt-2 first:border-t-0 first:pt-0">
          <div className="flex justify-between items-baseline gap-2"><span><b>{c.option.symbol}</b> <span className="text-xs text-neutral-700">{c.option.name}</span></span><b className="tabular-nums">{eur(c.amount)}</b></div>
          <div className="text-xs text-neutral-700 tabular-nums">{c.quantity !== null ? `${c.quantity.toLocaleString("es-ES", { maximumFractionDigits: 6 })} uds.` : ""}{c.price !== null ? ` a ${eur(c.price)}` : ""}</div>
          <div className="text-sm [text-wrap:pretty]">“{c.why}”</div>
          {c.exitCondition && <div className="text-xs text-neutral-700">Vendería si: {c.exitCondition}</div>}
        </li>
      ))}
    </ul>
    <div className="hidden md:block overflow-x-auto"><table className="table">
      <thead><tr><th>Valor</th><th className="text-right">Importe</th><th className="text-right">Precio</th><th className="text-right">Uds.</th><th>Por qué</th></tr></thead>
      <tbody>
        {choices.map((c) => (
          <tr key={c.id}>
            <td><b>{c.option.symbol}</b> <span className="text-xs text-neutral-700">{c.option.name}</span></td>
            <td className="text-right tabular-nums whitespace-nowrap">{eur(c.amount)}</td>
            <td className="text-right tabular-nums whitespace-nowrap">{c.price !== null ? eur(c.price) : "—"}</td>
            <td className="text-right tabular-nums">{c.quantity !== null ? c.quantity.toLocaleString("es-ES", { maximumFractionDigits: 6 }) : "—"}</td>
            <td className="text-sm min-w-[200px]">{c.why}{c.exitCondition ? <span className="block text-xs text-neutral-700">Vendería si: {c.exitCondition}</span> : null}</td>
          </tr>
        ))}
      </tbody>
    </table></div>
    </>
  );
}
