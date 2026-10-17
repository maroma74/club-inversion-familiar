import Link from "next/link";
import type { OnboardingStep } from "@/lib/onboarding";

/** Lista de primeros pasos con su progreso. `compact` muestra solo los pendientes (para Inicio). */
export function OnboardingChecklist({ steps, done, total, compact = false }: { steps: OnboardingStep[]; done: number; total: number; compact?: boolean }) {
  const shown = compact ? steps.filter((s) => !s.done).slice(0, 3) : steps;
  const pct = total ? Math.round((done / total) * 100) : 100;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="bar flex-1 min-w-[160px] max-w-[360px]" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label="Primeros pasos completados"><span style={{ width: `${pct}%` }} /></div>
        <span className="text-sm text-neutral-700 tabular-nums">{done} de {total}</span>
      </div>
      <ol className="m-0 p-0 list-none flex flex-col">
        {shown.map((s) => (
          <li key={s.id} className="grid gap-x-3 gap-y-1 py-3 border-t border-divider first:border-t-0" style={{ gridTemplateColumns: "28px minmax(0, 1fr) auto" }}>
            <span aria-hidden="true" className="mt-0.5 w-[24px] h-[24px] rounded-full grid place-items-center text-[13px] font-bold" style={s.done ? { background: "#047857", color: "#ffffff" } : { border: "2px solid var(--color-neutral-400)" }}>{s.done ? "✓" : ""}</span>
            <div className="min-w-0">
              <div className={`font-heading text-[16px] leading-tight ${s.done ? "text-neutral-700 line-through decoration-[var(--color-neutral-500)]" : ""}`}>
                {s.title}
                <span className="sr-only">{s.done ? " (hecho)" : " (pendiente)"}</span>
                {s.who === "presidente" && <span className="tag tag-neutral ml-2 align-middle no-underline" style={{ textDecoration: "none" }}>presidente</span>}
              </div>
              {!s.done && <p className="m-0 mt-1 text-sm text-neutral-700 max-w-[64ch] [text-wrap:pretty]">{s.text}</p>}
            </div>
            <div className="self-center">{!s.done && <Link href={s.href} className="btn-secondary py-1.5 text-xs whitespace-nowrap">{s.cta}</Link>}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}
