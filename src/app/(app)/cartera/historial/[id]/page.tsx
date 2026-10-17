import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getPortfolioReview } from "@/lib/monthlyHistory";
import { isDeadlinePassed, monthLabelLong, STATUS_LABEL } from "@/lib/monthly";
import { eur, fmtDate, signed } from "@/lib/format";
import { Markdown } from "@/components/Markdown";
import type { DecisionReview, OptionReview } from "@/lib/monthlyReview";

const analysisHref = (kind: string, symbol: string) => (kind === "COMMODITY" ? `/materias-primas/${encodeURIComponent(symbol)}` : kind === "CRYPTO" ? `/cripto/${encodeURIComponent(symbol)}` : kind === "ETF" ? `/etf/${encodeURIComponent(symbol)}` : `/acciones/${encodeURIComponent(symbol)}`);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const pctText = (v: number | null) => (v === null ? "—" : `${signed(v * 100, 1)} %`);
const tone = (v: number | null) => (v === null ? "var(--color-text)" : v >= 0 ? "var(--color-accent-700)" : "var(--color-text)");

export default async function RepasoPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const data = await getPortfolioReview(id, user.familyId);
  if (!data) notFound();
  const { portfolio: p, review, since } = data;
  const myDecision = review.decisions.find((d) => d.userId === user.id) ?? null;
  const myPicks = new Set(myDecision?.picks.map((pk) => pk.optionId) ?? []);
  // Las decisiones ajenas se ven cuando la cartera ya no admite decidir, o cuando uno ya ha decidido (misma regla que en la cartera del mes).
  const settled = p.status === "CLOSED" || isDeadlinePassed(p);
  const showOthers = settled || !!myDecision || user.role === "ADMIN";
  const visible = showOthers ? review.decisions : review.decisions.filter((d) => d.userId === user.id);
  const withResult = review.options.filter((o) => o.changePct !== null);
  const sortedOptions = [...review.options].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
  const worst = sortedOptions.filter((o) => o.rank !== null).slice(-1)[0] ?? null;

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="card-kicker">Repaso · {cap(monthLabelLong(p.month))} · {p.status === "CLOSED" ? "archivada" : STATUS_LABEL[p.status].toLowerCase()}</div>
          <h1 className="mt-1 mb-1">{p.title}</h1>
          <p className="m-0 text-neutral-700 max-w-[66ch] [text-wrap:pretty]">
            Publicada el {fmtDate(since)}. Los rendimientos son desde entonces hasta hoy: para lo que eligió cada miembro, desde el precio al que compró; para lo que nadie eligió, desde el cierre del día de la publicación.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/cartera/historial" className="btn-ghost">← Historial</Link>
          {user.role === "ADMIN" && <Link href={`/cartera/gestion/${p.id}`} className="btn-secondary">Gestionar</Link>}
        </div>
      </header>

      {review.best && withResult.length > 1 && (
        <section className="card card-snug gap-1" style={{ borderColor: "var(--color-accent)" }}>
          <div className="card-kicker">Con la perspectiva de hoy</div>
          <div className="text-[15px] [text-wrap:pretty]">
            La opción que más ha subido desde la publicación es <b>{review.best.symbol}</b> ({pctText(review.best.changePct)}); la que menos, <b>{worst?.symbol ?? "—"}</b> ({pctText(worst?.changePct ?? null)}).
            {review.best.pickedBy.length ? ` La eligieron ${review.best.pickedBy.join(", ")}.` : " No la eligió nadie."} Mirar atrás no es para lamentarse, sino para comprobar si el porqué de cada elección sigue teniendo sentido.
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h3 className="m-0">Las opciones, de mejor a peor desde entonces</h3>
        <div className="hidden md:block overflow-x-auto"><table className="table">
          <thead><tr><th>#</th><th>Valor</th><th className="text-right">Precio entonces</th><th className="text-right">Precio ahora</th><th className="text-right">Desde entonces</th><th>Quién la eligió</th><th /></tr></thead>
          <tbody>
            {sortedOptions.map((o) => <OptionRow key={o.id} o={o} showOthers={showOthers} pickedByMe={myPicks.has(o.id)} />)}
          </tbody>
        </table></div>
        <div className="md:hidden flex flex-col gap-2">
          {sortedOptions.map((o) => (
            <div key={o.id} className="card card-snug gap-1">
              <div className="flex items-baseline justify-between gap-2"><span><b>{o.rank ? `${o.rank}. ` : ""}{o.symbol}</b> <span className="text-xs text-neutral-700">{o.name}</span></span><b className="tabular-nums" style={{ color: tone(o.changePct) }}>{pctText(o.changePct)}</b></div>
              <div className="text-xs text-neutral-700 tabular-nums">{o.priceThen !== null ? eur(o.priceThen) : "—"} → {o.priceNow !== null ? eur(o.priceNow) : "—"}</div>
              <div className="text-xs text-neutral-700">{o.pickedBy.length ? (showOthers ? `Elegida por ${o.pickedBy.join(", ")}` : myPicks.has(o.id) ? "La elegiste tú" : "Elegida por otros miembros") : "Nadie la eligió"}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap justify-between items-baseline gap-2">
          <h3 className="m-0">Cómo le ha ido a cada miembro</h3>
          <span className="text-sm text-neutral-700">{review.decisions.length} {review.decisions.length === 1 ? "decisión" : "decisiones"}</span>
        </div>
        {review.decisions.length === 0 && <p className="m-0 text-sm text-neutral-700">Nadie llegó a decidir en esta cartera.</p>}
        {!showOthers && review.decisions.length > (myDecision ? 1 : 0) && <p className="m-0 text-sm text-neutral-700">Verás las decisiones de los demás cuando envíes la tuya o cuando termine el plazo.</p>}
        {[...visible].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99)).map((d) => <DecisionCard key={d.id} d={d} isMe={d.userId === user.id} />)}
      </section>

      <details className="card card-roomy gap-3">
        <summary className="card-kicker cursor-pointer">Lección de aquel mes (plegada)</summary>
        <div className="mt-3"><Markdown text={p.lesson} symbols={p.options.map((o) => ({ symbol: o.symbol, href: analysisHref(o.kind, o.symbol) }))} /></div>
      </details>

      <p className="m-0 text-xs text-neutral-700 [text-wrap:pretty]">Precios de hoy de Yahoo Finance y CoinGecko; los de la publicación, el cierre de ese día convertido a euros al cambio actual. Es material educativo: el pasado no garantiza nada, pero enseña mucho.</p>
    </div>
  );
}

function OptionRow({ o, showOthers, pickedByMe }: { o: OptionReview; showOthers: boolean; pickedByMe: boolean }) {
  const who = o.pickedBy.length === 0 ? <span className="text-neutral-700">nadie</span> : showOthers ? o.pickedBy.join(", ") : pickedByMe ? "tú" : <span className="text-neutral-700">otros miembros</span>;
  return (
    <tr>
      <td className="font-heading text-base">{o.rank ?? "—"}</td>
      <td><div className="font-medium">{o.symbol}</div><div className="text-xs text-neutral-700">{o.name}</div></td>
      <td className="text-right tabular-nums whitespace-nowrap">{o.priceThen !== null ? eur(o.priceThen) : "—"}</td>
      <td className="text-right tabular-nums whitespace-nowrap">{o.priceNow !== null ? eur(o.priceNow) : "—"}</td>
      <td className="text-right tabular-nums whitespace-nowrap font-medium" style={{ color: tone(o.changePct) }}>{pctText(o.changePct)}</td>
      <td className="text-sm">{who}</td>
      <td className="text-right whitespace-nowrap"><Link href={analysisHref(o.kind, o.symbol)} className="btn-ghost text-xs">Analizar</Link></td>
    </tr>
  );
}

function DecisionCard({ d, isMe }: { d: DecisionReview; isMe: boolean }) {
  return (
    <article className="card card-snug gap-2" style={isMe ? { borderColor: "var(--color-accent)" } : undefined}>
      <div className="flex flex-wrap justify-between items-baseline gap-2">
        <div><b>{d.rank ? `${d.rank}.º · ` : ""}{d.userName}{isMe ? " (tú)" : ""}</b> <span className="text-xs text-neutral-700">· decidió el {fmtDate(d.submittedAt)}</span></div>
        <div className="text-sm tabular-nums">
          {eur(d.invested)} → <b style={{ color: tone(d.changePct) }}>{d.valueNow !== null ? eur(d.valueNow) : "—"}</b> <span style={{ color: tone(d.changePct) }}>({pctText(d.changePct)})</span>
        </div>
      </div>
      <div className="overflow-x-auto"><table className="table">
        <thead><tr><th>Valor</th><th className="text-right">Invirtió</th><th className="text-right">Precio entonces</th><th className="text-right">Ahora</th><th className="text-right">Vale hoy</th><th className="text-right">Desde entonces</th></tr></thead>
        <tbody>
          {d.picks.map((pk) => (
            <tr key={pk.id}>
              <td><b>{pk.symbol}</b> <span className="text-xs text-neutral-700">{pk.name}</span></td>
              <td className="text-right tabular-nums whitespace-nowrap">{eur(pk.amount)}</td>
              <td className="text-right tabular-nums whitespace-nowrap">{pk.priceThen !== null ? eur(pk.priceThen) : "—"}</td>
              <td className="text-right tabular-nums whitespace-nowrap">{pk.priceNow !== null ? eur(pk.priceNow) : "—"}</td>
              <td className="text-right tabular-nums whitespace-nowrap">{pk.valueNow !== null ? eur(pk.valueNow) : "—"}</td>
              <td className="text-right tabular-nums whitespace-nowrap font-medium" style={{ color: tone(pk.changePct) }}>{pctText(pk.changePct)}</td>
            </tr>
          ))}
        </tbody>
      </table></div>
      {d.bestAlternative && d.valueNow !== null && d.bestAlternative.symbol !== (d.picks.length === 1 ? d.picks[0].symbol : "") && (
        <div className="text-sm text-neutral-700 [text-wrap:pretty]">Con la perspectiva de hoy, todo en <b className="text-ink">{d.bestAlternative.symbol}</b> ({pctText(d.bestAlternative.changePct)}) habría dado {eur(d.bestAlternative.valueIfBest)} en vez de {eur(d.valueNow)}. Nadie lo sabía entonces: lo que cuenta es si el porqué era bueno.</div>
      )}
      <div className="text-base [text-wrap:pretty]">“{d.argument}”</div>
      <details className="text-sm">
        <summary className="cursor-pointer text-accent-700 font-medium">Ver el porqué de cada elección</summary>
        <ul className="m-0 mt-2 p-0 list-none flex flex-col gap-2">
          {d.picks.map((pk) => (
            <li key={pk.id} className="border-t border-divider pt-2 first:border-t-0 first:pt-0"><b>{pk.symbol}</b>: “{pk.why}”{pk.exitCondition ? <span className="block text-xs text-neutral-700">Vendería si: {pk.exitCondition}</span> : null}</li>
          ))}
        </ul>
      </details>
    </article>
  );
}
