import { getMacroSnapshot } from "@/lib/macro";
import { macroAsOfLabel } from "@/lib/macroData";

const pct = (v: number) => `${v.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} %`;

/** Tipos de interés e inflación con una frase de lectura: contexto para entender por qué suben o bajan los mercados. */
export async function MacroCard() {
  const items = await getMacroSnapshot();
  if (items.length === 0) return null;
  const sources = [...new Set(items.map((i) => i.source))].join(", ");
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="m-0">Contexto del mercado</h3>
        <span className="text-xs text-neutral-700">Fuentes: {sources}</span>
      </div>
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))" }}>
        {items.map((i) => (
          <div key={i.id} className="card blueprint gap-1" style={{ padding: "14px 18px" }} title={i.note}>
            <div className="text-[11px] tracking-[0.08em] uppercase text-neutral-700">{i.label}</div>
            <div className="font-heading text-[26px] tabular-nums leading-none">{pct(i.value)}</div>
            <div className="text-xs text-neutral-700">{macroAsOfLabel(i.asOf)}</div>
            <p className="m-0 mt-1 text-xs text-neutral-700 [text-wrap:pretty]">{i.note}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
