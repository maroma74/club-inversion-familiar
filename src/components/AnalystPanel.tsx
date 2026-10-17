import { finnhubConfigured, getAnalystView } from "@/lib/finnhub";
import { beatCount, summarizeConsensus } from "@/lib/finnhubData";
import { fmtDate } from "@/lib/format";

const n2 = (v: number) => v.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Qué opinan los analistas (Finnhub): consenso, si la empresa bate sus previsiones y cuándo publica resultados. */
export async function AnalystPanel({ symbol }: { symbol: string }) {
  if (!finnhubConfigured()) return null;
  const v = await getAnalystView(symbol);
  if (!v) return null;
  const c = summarizeConsensus(v.consensus);
  const beats = beatCount(v.surprises);
  return (
    <section className="card mb-4 gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold m-0">Qué dicen los analistas</h2>
        <span className="text-xs text-neutral-700">Fuente: Finnhub</span>
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))" }}>
        {v.consensus && c.total >= 3 && (
          <div className="flex flex-col gap-1.5">
            <div className="text-[11px] tracking-[0.08em] uppercase text-neutral-700">Consenso ({c.total} analistas)</div>
            <div className="font-heading text-[26px] leading-none">{c.label}</div>
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-neutral-200" role="img" aria-label={`${c.buyPct} % comprar, ${c.holdPct} % mantener, ${c.sellPct} % vender`}>
              <span style={{ width: `${c.buyPct}%`, background: "var(--color-accent-700)" }} />
              <span style={{ width: `${c.holdPct}%`, background: "var(--color-divider)" }} />
              <span style={{ width: `${c.sellPct}%`, background: "var(--color-ink)" }} />
            </div>
            <div className="text-xs text-neutral-700 tabular-nums">{c.buyPct} % comprar · {c.holdPct} % mantener · {c.sellPct} % vender</div>
          </div>
        )}
        {v.surprises.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <div className="text-[11px] tracking-[0.08em] uppercase text-neutral-700">Resultados frente a previsiones</div>
            <div className="font-heading text-[26px] leading-none">{beats.beats} de {beats.total}</div>
            <div className="text-xs text-neutral-700">trimestres en los que el beneficio por acción igualó o superó lo que esperaban los analistas</div>
            <ul className="m-0 p-0 list-none text-xs text-neutral-700 tabular-nums">
              {v.surprises.map((s) => (
                <li key={s.period}>{fmtDate(s.period)}: {n2(s.actual)} frente a {n2(s.estimate)} previsto {s.beat ? "· superó" : "· no llegó"}</li>
              ))}
            </ul>
          </div>
        )}
        {v.nextEarnings && (
          <div className="flex flex-col gap-1.5">
            <div className="text-[11px] tracking-[0.08em] uppercase text-neutral-700">Próximos resultados</div>
            <div className="font-heading text-[26px] leading-none">{fmtDate(v.nextEarnings)}</div>
            <div className="text-xs text-neutral-700">Ese día la acción suele moverse más de lo normal: buen momento para releer tu porqué, no para decidir con prisas.</div>
          </div>
        )}
      </div>
      <p className="m-0 text-xs text-neutral-700 [text-wrap:pretty]">Las opiniones de los analistas son un dato más, no una orden: se equivocan a menudo y suelen ir detrás del precio. Úsalas para contrastar tu propio análisis.</p>
    </section>
  );
}
