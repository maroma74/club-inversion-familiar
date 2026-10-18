import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getCoursesWithProgress } from "@/lib/academy";
import { getCurrentPortfolio, isDeadlinePassed, monthLabelLong } from "@/lib/monthly";
import { eur, fmtDate } from "@/lib/format";
import { firstName } from "@/lib/names";
import { formatPhone } from "@/lib/communications";
import { finishWelcomeAction } from "@/app/actions/welcome";
import { AvatarForm } from "../perfil/AvatarForm";
import { PhoneForm } from "../perfil/PhoneForm";
import { QuickCheck } from "./QuickCheck";

export const metadata: Metadata = { title: "Bienvenida · Club de Inversión Familiar" };

const STEPS = [
  { id: "hola", label: "El club" },
  { id: "mes", label: "Cómo es un mes" },
  { id: "perfil", label: "Tu perfil" },
  { id: "mision", label: "Tu primera misión" },
] as const;

/** Botón que termina la bienvenida (la marca como vista) y lleva a un destino concreto. */
function Finish({ to, label, primary = true }: { to: string; label: string; primary?: boolean }) {
  return (
    <form action={finishWelcomeAction}>
      <input type="hidden" name="to" value={to} />
      <button className={primary ? "btn-primary lp-btn-lg" : "btn-secondary"}>{label}</button>
    </form>
  );
}

/**
 * Bienvenida para quien entra en un club por primera vez (normalmente un hijo o una hija): qué es el club, cómo es
 * un mes, su perfil y su primera misión. Cuatro pantallas cortas, en «tú», que se pueden saltar en cualquier momento.
 */
export default async function BienvenidaPage({ searchParams }: { searchParams: Promise<{ paso?: string }> }) {
  const user = await requireUser();
  const { paso } = await searchParams;
  const idx = Math.max(0, STEPS.findIndex((s) => s.id === paso));
  const step = STEPS[idx];
  const next = STEPS[idx + 1];
  const prev = STEPS[idx - 1];

  const [president, portfolio, courses] = await Promise.all([
    prisma.user.findFirst({ where: { familyId: user.familyId, role: "ADMIN", status: "ACTIVE", id: { not: user.id } }, orderBy: { createdAt: "asc" }, select: { name: true } }),
    getCurrentPortfolio(user.familyId),
    getCoursesWithProgress(user.id),
  ]);
  const name = firstName(user.name);
  const presidentName = president ? firstName(president.name) : "el presidente";
  const myAllocation = portfolio?.allocations.find((a) => a.userId === user.id)?.amount ?? 0;
  const allowance = myAllocation > 0 ? myAllocation : user.family.monthlyAllowance;
  const openForMe = !!portfolio && portfolio.status === "PUBLISHED" && !isDeadlinePassed(portfolio) && myAllocation > 0 && !portfolio.decisions.some((d) => d.userId === user.id);
  const firstCourse = courses.find((c) => c.current) ?? courses[0];
  const lesson = firstCourse?.nextLesson ? { href: `/academia/${firstCourse.slug}/${firstCourse.nextLesson.slug}`, title: firstCourse.nextLesson.title, minutes: firstCourse.lessons.find((l) => l.slug === firstCourse.nextLesson!.slug)?.minutes ?? 5 } : null;

  return (
    <div className="welcome flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ol className="m-0 p-0 list-none flex items-center gap-2" aria-label="Bienvenida">
          {STEPS.map((s, i) => (
            <li key={s.id}>
              <Link href={`/bienvenida?paso=${s.id}`} className="welcome-pip" data-state={i < idx ? "done" : i === idx ? "now" : "todo"} aria-current={i === idx ? "step" : undefined}>
                <span className="sr-only">{i + 1}. {s.label}</span>
              </Link>
            </li>
          ))}
          <li className="text-sm text-neutral-700 ml-1">{idx + 1} de {STEPS.length} · {step.label}</li>
        </ol>
        <form action={finishWelcomeAction}><input type="hidden" name="to" value="/inicio" /><button className="btn-ghost text-sm">Saltar la bienvenida</button></form>
      </div>

      <section className="welcome-card" aria-labelledby="bienvenida-titulo">
        {step.id === "hola" && (
          <>
            <h1 id="bienvenida-titulo" className="m-0 [text-wrap:balance]">Te damos la bienvenida, {name}</h1>
            <p className="welcome-lede">{presidentName === "el presidente" ? "Tu familia" : presidentName} te ha invitado al club de inversión de <b>{user.family.name}</b>. Aquí vas a aprender a invertir con dinero de verdad, en pequeño y en familia. Tres cosas para empezar:</p>
            <ul className="welcome-facts">
              <li>
                <span className="welcome-figure tabular-nums">{eur(allowance)}</span>
                <div><b>al mes son tuyos para invertir.</b> Es tu paga del club: decides tú en qué, entre las opciones que propone {presidentName} cada mes.</div>
              </li>
              <li>
                <span className="welcome-figure" aria-hidden="true">Tú</span>
                <div><b>decides; un adulto compra.</b> Son acciones, fondos y ETF reales. La compra la hace un adulto en el bróker de la familia y aquí queda anotada con tu razón.</div>
              </li>
              <li>
                <span className="welcome-figure" aria-hidden="true">Porqué</span>
                <div><b>Tu porqué es lo que más cuenta.</b> Hay liga, niveles y logros, pero en el repaso gana quien mejor explica su decisión, no quien más acierta.</div>
              </li>
            </ul>
          </>
        )}

        {step.id === "mes" && (
          <>
            <h1 id="bienvenida-titulo" className="m-0 [text-wrap:balance]">Así es un mes en el club</h1>
            <ol className="welcome-timeline">
              <li><b>Te llega un WhatsApp</b> de {presidentName} con la cartera del mes: un tema, una lección corta y dos, tres o cuatro opciones.</li>
              <li><b>Investigas.</b> Lees la lección y abres la ficha de cada opción: qué es, cómo ha ido, si está cara o barata y qué dice la lectura del Club.</li>
              <li><b>Decides y explicas.</b> Eliges, repartes tu paga y escribes por qué. Las decisiones de los demás las ves después de enviar la tuya.</li>
              <li><b>Repaso en familia.</b> Al cerrar la cartera veis juntos qué eligió cada uno, cómo ha ido y qué porqué estaba mejor pensado.</li>
            </ol>
            <div className="welcome-check"><QuickCheck /></div>
          </>
        )}

        {step.id === "perfil" && (
          <>
            <h1 id="bienvenida-titulo" className="m-0 [text-wrap:balance]">Tu perfil</h1>
            <p className="welcome-lede">Dos cosas opcionales que hacen el club más tuyo. Puedes cambiarlas cuando quieras en «Mi perfil».</p>
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <h2 className="m-0 text-[18px]">Tu foto</h2>
                <p className="m-0 text-sm text-neutral-700">Sale junto a tu nombre en la liga y en el diario de la familia.</p>
                <AvatarForm id={user.id} name={user.name} updatedAt={user.avatarUpdatedAt ? user.avatarUpdatedAt.toISOString() : null} />
              </div>
              <div className="flex flex-col gap-2">
                <h2 className="m-0 text-[18px]">Tu móvil</h2>
                <p className="m-0 text-sm text-neutral-700">{user.phone ? `Ya lo tenemos (${formatPhone(user.phone)}): por ahí te llegará el aviso de cada cartera. Si no es el tuyo, cámbialo.` : "Para que te llegue por WhatsApp el aviso de cada cartera, con el enlace directo. Solo lo ve quien preside el club."}</p>
                <PhoneForm initial={user.phone ?? ""} />
              </div>
            </div>
          </>
        )}

        {step.id === "mision" && (
          <>
            <h1 id="bienvenida-titulo" className="m-0 [text-wrap:balance]">Tu primera misión</h1>
            {openForMe && portfolio ? (
              <>
                <p className="welcome-lede">La cartera de {monthLabelLong(portfolio.month)} ya está abierta y tienes <b className="tabular-nums">{eur(myAllocation)}</b> por decidir{portfolio.deadline ? <> hasta el <b>{fmtDate(portfolio.deadline)}</b></> : null}.</p>
                <div className="welcome-mission">
                  <div className="font-heading font-bold text-[20px] leading-snug [text-wrap:balance]">{portfolio.title}</div>
                  <p className="m-0 text-sm text-neutral-700">{portfolio.options.length} opciones: {portfolio.options.map((o) => o.symbol).join(", ")}. Lee la lección, abre cada ficha y explica tu elección. Sin prisa: tienes hasta el plazo.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Finish to="/cartera" label="Ir a la cartera del mes" />
                  {lesson && <Finish to={lesson.href} label={`Antes, una lección de ${lesson.minutes} minutos`} primary={false} />}
                </div>
              </>
            ) : (
              <>
                <p className="welcome-lede">Mientras llega la próxima cartera, empieza por la Academia: seis niveles, del ahorro al análisis técnico, con lecciones cortas y un quiz al final de cada una.</p>
                {lesson && (
                  <div className="welcome-mission">
                    <div className="text-sm text-neutral-700">Lección 1 · unos {lesson.minutes} minutos</div>
                    <div className="font-heading font-bold text-[20px] leading-snug">{lesson.title}</div>
                    <p className="m-0 text-sm text-neutral-700">Cada lección superada suma 10 puntos; con 30 subes de nivel. Tu nivel sale junto a tu nombre.</p>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  <Finish to={lesson?.href ?? "/academia"} label="Hacer mi primera lección" />
                  <Finish to="/inicio" label="Ir a Inicio" primary={false} />
                </div>
                <p className="m-0 text-sm text-neutral-700">Cuando {presidentName} publique la cartera del mes, te llegará el aviso y la verás en Inicio.</p>
              </>
            )}
          </>
        )}

        <footer className="welcome-footer">
          {prev ? <Link href={`/bienvenida?paso=${prev.id}`} className="btn-ghost">← Atrás</Link> : <span />}
          {next && <Link href={`/bienvenida?paso=${next.id}`} className="btn-primary">{idx === 0 ? "¿Cómo funciona?" : "Siguiente"} →</Link>}
        </footer>
      </section>
    </div>
  );
}
