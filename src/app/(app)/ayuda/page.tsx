import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { loadOnboarding } from "@/lib/onboardingData";
import { audienceLabel, FAQ, GLOSSARY, HELP, HOW_IT_WORKS } from "@/lib/helpContent";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { HelpSearch } from "./HelpSearch";
import { loadSetupSummary } from "@/lib/setupData";
import { resumeSetupAction } from "@/app/actions/setup";

export const metadata: Metadata = { title: "Ayuda · Club de Inversión Familiar" };

/** Ayuda: primeros pasos personales, cómo funciona un mes, qué hace cada parte de la web, glosario y preguntas. */
export default async function AyudaPage() {
  const user = await requireUser();
  const onboarding = await loadOnboarding(user);
  const groups = HELP;
  const isAdmin = user.role === "ADMIN";
  const setup = isAdmin ? await loadSetupSummary(user.familyId, user.id) : null;

  return (
    <div className="flex flex-col gap-8">
      <header>
        <div className="card-kicker text-[11px]">Ayuda</div>
        <h1 className="mt-1 mb-1">Cómo funciona el Club</h1>
        <p className="m-0 text-neutral-700 max-w-[70ch] [text-wrap:pretty]">Primeros pasos, el ciclo de cada mes y qué hace cada parte de la web. Si algo no está aquí, pregunta al presidente de tu club.</p>
      </header>

      {isAdmin && (
        <section className="card card-roomy gap-3" style={{ borderColor: "var(--color-accent)" }} aria-labelledby="asistente-title">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-[62ch]">
              <h2 id="asistente-title" className="m-0 text-[24px]">Asistente para poner en marcha el club</h2>
              <p className="m-0 mt-2 text-neutral-700 [text-wrap:pretty]">Te acompaña en siete pasos: la paga, invitar a tus hijos, elegir la cartera del mes, publicarla, avisarles por WhatsApp, acompañarles mientras deciden y hacer el primer repaso en familia. Cada paso explica por qué importa.</p>
            </div>
            {setup?.dismissed ? (
              <form action={resumeSetupAction}><button className="btn-primary">Retomar el asistente</button></form>
            ) : (
              <Link href="/empezar" className="btn-primary">{setup?.complete ? "Ver el asistente" : setup && setup.done > 0 ? `Continuar · ${setup.done} de ${setup.total}` : "Empezar"}</Link>
            )}
          </div>
        </section>
      )}

      <section id="primeros-pasos" className="card card-roomy gap-3" style={{ borderColor: onboarding.complete ? "var(--color-divider)" : "var(--color-accent)" }} aria-labelledby="pp-title">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="pp-title" className="m-0 text-[24px]">{onboarding.complete ? "Primeros pasos completados" : "Tus primeros pasos"}</h2>

        </div>
        <p className="m-0 text-sm text-neutral-700 max-w-[70ch]">{onboarding.complete ? "Ya has hecho todo lo básico. A partir de aquí, cada mes es una cartera nueva, una decisión y un porqué." : "Se marcan solos cuando los haces. Empieza por el primero que esté pendiente."}</p>
        <OnboardingChecklist steps={onboarding.steps} done={onboarding.done} total={onboarding.total} />
      </section>

      <section id="como-funciona" className="flex flex-col gap-3" aria-labelledby="cf-title">
        <h2 id="cf-title" className="m-0 text-[24px]">Cómo funciona un mes</h2>
        <ol className="m-0 p-0 list-none grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))" }}>
          {HOW_IT_WORKS.map((s, i) => (
            <li key={s.title} className="card card-snug gap-1.5">
              <span aria-hidden="true" className="w-[32px] h-[32px] rounded-full grid place-items-center font-mono font-bold text-[15px]" style={{ background: "#047857", color: "#ffffff" }}>{i + 1}</span>
              <div className="font-heading text-[16px] leading-tight">{s.title}</div>
              <p className="m-0 text-sm text-neutral-700 [text-wrap:pretty]">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-5" aria-labelledby="guia-title">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="guia-title" className="m-0 text-[24px]">Guía de la web</h2>
          <HelpSearch />
        </div>
        <nav aria-label="Apartados de la ayuda" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {groups.map((g) => (
            <span key={g.id} className="inline-flex flex-wrap gap-x-3 gap-y-1 items-baseline">
              <b className="text-neutral-800">{g.title}:</b>
              {g.sections.map((s) => <a key={s.id} href={`#${s.id}`} className="text-accent-700">{s.title}</a>)}
            </span>
          ))}
        </nav>

        {groups.map((g) => (
          <div key={g.id} data-help-group className="flex flex-col gap-3">
            <div>
              <h3 className="m-0">{g.title}</h3>
              <p className="m-0 text-sm text-neutral-700">{g.intro}</p>
            </div>
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 440px), 1fr))" }}>
              {g.sections.map((s) => (
                <article key={s.id} id={s.id} data-help className="card card-roomy gap-2 scroll-mt-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h4 className="m-0 text-[19px]">{s.title}</h4>
                    {audienceLabel(s.audience) && <span className="tag tag-neutral">{audienceLabel(s.audience)}</span>}
                  </div>
                  <p className="m-0 text-[15px] [text-wrap:pretty]">{s.summary}</p>
                  <ul className="m-0 pl-5 flex flex-col gap-1.5 text-sm text-neutral-700 marker:text-accent-700">
                    {s.points.map((p) => <li key={p} className="[text-wrap:pretty]">{p}</li>)}
                  </ul>
                  {s.href && (s.audience !== "presidente" || isAdmin) && <div className="mt-1"><Link href={s.href} className="btn-ghost text-sm">{s.cta ?? "Ir"} →</Link></div>}
                </article>
              ))}
            </div>
          </div>
        ))}

        <div data-help-group className="flex flex-col gap-3">
          <h3 id="glosario" className="m-0">Glosario</h3>
          <dl className="m-0 grid gap-x-8 gap-y-0" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))" }}>
            {GLOSSARY.map((g) => (
              <div key={g.term} data-help className="py-3 border-t border-divider">
                <dt className="font-heading font-bold">{g.term}</dt>
                <dd className="m-0 mt-0.5 text-sm text-neutral-700 [text-wrap:pretty]">{g.text}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div data-help-group className="flex flex-col gap-3">
          <h3 id="preguntas" className="m-0">Preguntas frecuentes</h3>
          <div className="card card-snug gap-0 p-0">
            {FAQ.map((f) => (
              <details key={f.q} data-help className="border-t border-divider first:border-t-0 px-5 py-3">
                <summary className="cursor-pointer font-heading font-bold">{f.q}</summary>
                <p className="m-0 mt-2 text-sm text-neutral-700 max-w-[75ch] [text-wrap:pretty]">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <p className="m-0 text-xs text-neutral-700 max-w-[80ch]">Material educativo: nada de lo que muestra el Club es asesoramiento financiero ni una recomendación de comprar o vender. Invertir conlleva riesgo de pérdida.</p>
    </div>
  );
}
