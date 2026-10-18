import Link from "next/link";
import type { SetupStep } from "@/lib/setup";

/** Tarjeta de Inicio para el presidente mientras pone en marcha el club: el paso siguiente y el camino completo. */
export function SetupCard({ steps, done, total, current }: { steps: SetupStep[]; done: number; total: number; current: SetupStep | null }) {
  const first = done === 0;
  return (
    <section aria-labelledby="puesta-en-marcha" className="card card-roomy gap-4" style={{ borderColor: "var(--color-accent)" }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-[60ch]">
          <h2 id="puesta-en-marcha" className="m-0 [text-wrap:balance]">{first ? "Pon en marcha tu club" : `Sigue: ${current?.title ?? "el repaso"}`}</h2>
          <p className="m-0 mt-2 text-[15px] text-neutral-700 [text-wrap:pretty]">
            {first
              ? "Siete pasos, de la paga al primer repaso en familia. Unos quince minutos hoy; el asistente te explica en cada paso por qué importa."
              : `Llevas ${done} de ${total} pasos. Cada uno se marca solo cuando lo haces.`}
          </p>
        </div>
        <Link href="/empezar" className="btn-primary">{first ? "Empezar" : "Continuar"}</Link>
      </div>
      <ol className="m-0 p-0 list-none flex flex-wrap gap-2" aria-label="Pasos">
        {steps.map((s) => (
          <li key={s.id}>
            <Link href={`/empezar?paso=${s.id}`} className={`tag ${s.done ? "tag-accent" : s.id === current?.id ? "tag-outline" : "tag-neutral"}`} aria-current={s.id === current?.id ? "step" : undefined}>
              {s.n}. {s.short}<span className="sr-only">{s.done ? " (hecho)" : " (pendiente)"}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
