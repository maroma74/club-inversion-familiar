import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { loadSetup } from "@/lib/setupData";
import { pickStep, type SetupStep } from "@/lib/setup";
import { appUrl } from "@/lib/appUrl";
import { eur, fmtDate } from "@/lib/format";
import { firstName, uniqueFirstNames } from "@/lib/names";
import { monthLabelLong } from "@/lib/monthly";
import { RISK_LABEL } from "@/lib/proposals";
import { DEFAULT_PORTFOLIO_TEMPLATE, formatPhone, renderMessage } from "@/lib/communications";
import { invitationWhatsAppText } from "@/lib/invitationMessages";
import { todayYmd } from "@/lib/validation";
import { closeForReviewAction, discardDraftAction, dismissSetupAction } from "@/app/actions/setup";
import { CopyButton } from "@/components/CopyButton";
import { ConfirmButton } from "@/components/ConfirmButton";
import { InviteWhatsApp } from "@/components/InviteWhatsApp";
import { FamilyReviewGuide } from "@/components/FamilyReviewGuide";
import { CopyText, WhatsAppSendButton } from "../comunicaciones/forms";
import { ChooseProposalButton, ClubForm, InviteChildForm, PrepareNoticesButton, PublishSetupForm } from "./forms";

export const metadata: Metadata = { title: "Pon en marcha tu club · Club de Inversión Familiar" };

/** Texto plano de una lección en Markdown, recortado: para la vista previa de las propuestas. */
function excerpt(md: string, max = 200) {
  const text = md.replace(/^#+\s.*$/gm, "").replace(/[*_`>#]/g, "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max).replace(/\s\S*$/, "")}…` : text;
}

const Check = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 8.5l3 3 6-7" /></svg>
);

/** «Por qué importa»: la idea educativa de cada paso, en un recuadro tranquilo. */
function Why({ children }: { children: React.ReactNode }) {
  return (
    <aside className="setup-why" aria-label="Por qué importa">
      <div className="font-heading font-bold text-[15px]">Por qué importa</div>
      <p className="m-0 mt-1 text-sm text-neutral-800 [text-wrap:pretty]">{children}</p>
    </aside>
  );
}

/**
 * Asistente de puesta en marcha para el presidente: siete pasos desde «acabo de crear el club» hasta el primer
 * repaso en familia. Usa las acciones reales (no un modo tutorial) y cada paso se marca solo con datos.
 */
export default async function EmpezarPage({ searchParams }: { searchParams: Promise<{ paso?: string }> }) {
  const admin = await requireAdmin();
  const { paso } = await searchParams;
  const s = await loadSetup(admin.familyId, admin.id);
  const step = pickStep(s.steps, paso);
  const idx = step.n - 1;
  const prev = s.steps[idx - 1];
  const next = s.steps[idx + 1];
  const p = s.portfolio;
  const today = todayYmd();
  const people = s.members.length + 1;
  const names = uniqueFirstNames(s.members);
  const nameOf = (id: string, fallback: string) => names.get(id) ?? firstName(fallback);
  const linkFor = (code: string) => `${appUrl()}/registro?codigo=${code}`;

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[64ch]">
          <h1 className="m-0">{s.complete ? "Tu club está en marcha" : "Pon en marcha tu club"}</h1>
          <p className="m-0 mt-2 text-neutral-700 [text-wrap:pretty]">
            {s.complete
              ? "Habéis hecho el primer ciclo completo: paga, cartera, decisiones con su porqué y repaso. A partir de aquí, cada mes es una pregunta nueva."
              : "Siete pasos: unos quince minutos hoy y un repaso en familia cuando termine el plazo. Cada paso se marca solo cuando lo haces, y puedes dejarlo y volver cuando quieras."}
          </p>
        </div>
        {!s.complete && (
          <form action={dismissSetupAction}>
            <button className="btn-ghost text-sm">Seguir por mi cuenta</button>
          </form>
        )}
      </header>

      <div className="setup-layout">
        <nav aria-label="Pasos de la puesta en marcha" className="setup-rail">
          <div className="flex items-center gap-3 mb-3">
            <div className="bar flex-1" role="progressbar" aria-valuemin={0} aria-valuemax={s.total} aria-valuenow={s.done} aria-label="Pasos completados"><span style={{ width: `${Math.round((s.done / s.total) * 100)}%` }} /></div>
            <span className="text-sm text-neutral-700 tabular-nums whitespace-nowrap">{s.done} de {s.total}</span>
          </div>
          <ol className="m-0 p-0 list-none flex flex-col">
            {s.steps.map((st: SetupStep) => {
              const current = st.id === step.id;
              return (
                <li key={st.id}>
                  <Link href={`/empezar?paso=${st.id}`} className="setup-rail-link" data-state={st.done ? "done" : "todo"} aria-current={current ? "step" : undefined}>
                    <span className="setup-dot" aria-hidden="true">{st.done ? <Check /> : st.n}</span>
                    <span className="min-w-0">
                      <span className="block text-[14px] font-medium leading-tight">{st.title}</span>
                      <span className="sr-only">{st.done ? " (hecho)" : " (pendiente)"}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </nav>

        <section className="card card-roomy setup-panel gap-5" aria-labelledby="paso-titulo">
          <div>
            <p className="m-0 text-sm text-neutral-700">Paso {step.n} de {s.total}{step.done ? " · hecho" : ""}</p>
            <h2 id="paso-titulo" className="m-0 mt-1 text-[26px] [text-wrap:balance]">{step.title}</h2>
          </div>

          {step.id === "club" && (
            <>
              <p className="m-0 max-w-[64ch] [text-wrap:pretty]">Confirma el nombre del club y decide cuánto invierte cada persona al mes. Podrás cambiarlo cuando quieras desde Familia.</p>
              <ClubForm name={s.family.name} amount={s.family.monthlyAllowance} people={people} confirmed={step.done} />
              <Why>Poco dinero, pero real: lo bastante pequeño para equivocarse sin drama y lo bastante real para que importe. Entre 10 y 50 € al mes es lo habitual. La compra la hace siempre un adulto en el bróker de la familia; el Club solo la anota con su porqué.</Why>
            </>
          )}

          {step.id === "hijos" && (
            <>
              <p className="m-0 max-w-[64ch] [text-wrap:pretty]">Crea una invitación para cada hijo o hija y mándasela por WhatsApp: le llega un enlace con el que crea su cuenta en un minuto. Con su móvil, después le llegarán también los avisos de cada cartera.</p>
              {(s.members.length > 0 || s.invites.length > 0) && (
                <ul className="m-0 p-0 list-none flex flex-col">
                  {s.members.map((m) => (
                    <li key={m.id} className="setup-row">
                      <span className="setup-dot is-done" aria-hidden="true"><Check /></span>
                      <span className="min-w-0 flex-1"><b>{nameOf(m.id, m.name)}</b> <span className="text-sm text-neutral-700">ya está en el club{m.phone ? ` · ${formatPhone(m.phone)}` : " · sin móvil"}</span></span>
                    </li>
                  ))}
                  {s.invites.map((i) => (
                    <li key={i.id} className="setup-row flex-wrap">
                      <span className="setup-dot" aria-hidden="true" />
                      <span className="min-w-0 flex-1"><b>{i.name ?? "Sin nombre"}</b> <span className="text-sm text-neutral-700">invitación pendiente{i.phone ? ` · ${formatPhone(i.phone)}` : ""}{i.sentAt ? " · correo enviado" : ""}</span></span>
                      <span className="inline-flex flex-wrap items-center gap-2">
                        <InviteWhatsApp id={i.id} phone={i.phone} sharedAt={i.sharedAt?.toISOString() ?? null} text={invitationWhatsAppText({ inviteeName: i.name ? firstName(i.name) : null, inviterName: firstName(admin.name), familyName: s.family.name, newFamily: false, link: linkFor(i.code), code: i.code, expiresAt: i.expiresAt })} />
                        <CopyButton text={linkFor(i.code)} label="Copiar enlace" />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <InviteChildForm />
              {s.members.length === 0 && s.invites.length > 0 && <p className="m-0 text-sm text-neutral-700">No hace falta esperar a que entren: puedes seguir con el paso siguiente. Quien entre antes de publicar la cartera recibirá su paga igualmente.</p>}
              <Why>Cada uno con su cuenta: su decisión, su porqué y su avance en la Academia son suyos. Eso es lo que luego permite comparar en el repaso, y lo que hace que se sientan dueños de su dinero.</Why>
            </>
          )}

          {step.id === "cartera" && (
            <>
              {!p ? (
                <>
                  <p className="m-0 max-w-[64ch] [text-wrap:pretty]">Elige una propuesta para <b>{monthLabelLong(s.targetMonth)}</b>. Cada una trae su lección escrita y las opciones entre las que decidiréis. Después podrás retocarla.</p>
                  <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))" }}>
                    {s.suggestions.map((sg, i) => (
                      <article key={sg.id} className="setup-proposal">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="tag tag-outline">{sg.theme}</span>
                          <span className="text-xs text-neutral-700">Riesgo {RISK_LABEL[sg.risk].toLowerCase()}</span>
                          {i === 0 && <span className="tag tag-accent">Buena para empezar</span>}
                        </div>
                        <h3 className="m-0 text-[18px] leading-snug [text-wrap:balance]">{sg.title}</h3>
                        <p className="m-0 text-sm text-neutral-700 [text-wrap:pretty]">{excerpt(sg.lesson)}</p>
                        <ul className="m-0 p-0 list-none flex flex-col gap-0.5 text-sm">
                          {sg.options.map((o) => <li key={o.symbol}><span className="font-mono text-xs text-accent-700">{o.symbol}</span> {o.name}</li>)}
                        </ul>
                        <p className="m-0 text-xs text-neutral-700">Cada uno elige {sg.minChoices === sg.maxChoices ? sg.minChoices : `de ${sg.minChoices} a ${sg.maxChoices}`} {sg.maxChoices === 1 ? "opción" : "opciones"}.</p>
                        <div className="mt-auto pt-1"><ChooseProposalButton proposalId={sg.id} month={s.targetMonth} primary={i === 0} /></div>
                      </article>
                    ))}
                  </div>
                  {s.suggestions.length === 0 && <p className="m-0 text-sm text-neutral-700">No quedan propuestas nuevas en el repositorio. Crea la tuya desde <Link href="/cartera/gestion">Gestión de carteras</Link>.</p>}
                  <p className="m-0 text-sm"><Link href="/cartera/repositorio" className="text-accent-700">Ver todas las propuestas del repositorio →</Link></p>
                </>
              ) : (
                <>
                  <p className="m-0 max-w-[64ch] [text-wrap:pretty]">La cartera de <b>{monthLabelLong(p.month)}</b> es <b>«{p.title}»</b>. {p.status === "DRAFT" ? "Está en borrador: solo tú la ves." : "Ya está publicada."}</p>
                  <div className="setup-proposal">
                    <p className="m-0 text-sm text-neutral-700 [text-wrap:pretty]">{excerpt(p.lesson, 320)}</p>
                    <ul className="m-0 p-0 list-none flex flex-col gap-0.5 text-sm">
                      {p.options.map((o) => <li key={o.id}><span className="font-mono text-xs text-accent-700">{o.symbol}</span> {o.name}</li>)}
                    </ul>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/cartera/gestion/${p.id}`} className="btn-secondary">Revisar la lección y las opciones</Link>
                    {p.status === "DRAFT" && (
                      <form action={discardDraftAction}>
                        <input type="hidden" name="id" value={p.id} />
                        <ConfirmButton className="btn-ghost" message="¿Descartar este borrador y elegir otra propuesta?">Elegir otra propuesta</ConfirmButton>
                      </form>
                    )}
                  </div>
                </>
              )}
              <Why>La cartera del mes es una pregunta para la familia, no un consejo: compara dos o tres formas de invertir (una empresa concreta frente al mundo entero, crecer frente a repartir dividendo). No hay respuesta correcta; hay porqués mejor o peor pensados.</Why>
            </>
          )}

          {step.id === "publicar" && (
            <>
              {!p ? (
                <p className="m-0">Primero elige la cartera del mes. <Link href="/empezar?paso=cartera" className="text-accent-700">Ir al paso 3</Link></p>
              ) : p.status === "DRAFT" ? (
                <>
                  <p className="m-0 max-w-[64ch] [text-wrap:pretty]">Al publicar «{p.title}», cada persona del club recibe su paga y puede empezar a decidir hasta la fecha que elijas.</p>
                  <ul className="m-0 p-0 list-none flex flex-col" aria-label="Quién recibe paga">
                    <li className="setup-row"><span className="flex-1"><b>{firstName(admin.name)}</b> <span className="text-sm text-neutral-700">(tú)</span></span><span className="tabular-nums">{eur(p.allocations.find((a) => a.userId === admin.id)?.amount ?? s.family.monthlyAllowance)}</span></li>
                    {s.members.map((m) => <li key={m.id} className="setup-row"><span className="flex-1"><b>{nameOf(m.id, m.name)}</b></span><span className="tabular-nums">{eur(p.allocations.find((a) => a.userId === m.id)?.amount ?? s.family.monthlyAllowance)}</span></li>)}
                  </ul>
                  {s.invites.length > 0 && <p className="m-0 text-sm text-neutral-700">{s.invites.map((i) => i.name ?? "Una invitación").join(", ")} {s.invites.length === 1 ? "aún no ha entrado" : "aún no han entrado"}. Si entran después, podrás darles su importe desde la gestión de la cartera.</p>}
                  <PublishSetupForm portfolioId={p.id} today={today} />
                </>
              ) : (
                <p className="m-0 max-w-[64ch]">«{p.title}» está {p.status === "CLOSED" ? "cerrada" : "publicada"}{p.publishedAt ? ` desde el ${fmtDate(p.publishedAt)}` : ""}{p.deadline ? `, con plazo hasta el ${fmtDate(p.deadline)}` : ""}. Si necesitas cambiar el plazo, hazlo en <Link href={`/cartera/gestion/${p.id}#plazo`} className="text-accent-700">Plazo y estado</Link>.</p>
              )}
              <Why>Al publicar, cada uno recibe su paga como aportación: ese dinero es suyo para decidir. Una semana basta para leer la lección, mirar las fichas y pensar sin prisa; más tiempo suele significar dejarlo para el último día.</Why>
            </>
          )}

          {step.id === "avisar" && (
            <>
              {!p || p.status === "DRAFT" ? (
                <p className="m-0">Primero publica la cartera. <Link href="/empezar?paso=publicar" className="text-accent-700">Ir al paso 4</Link></p>
              ) : !s.communication ? (
                <>
                  <p className="m-0 max-w-[64ch] [text-wrap:pretty]">Prepara un WhatsApp para cada uno con su nombre, su importe, el plazo y el enlace directo a la cartera. Después lo envías tú con un botón.</p>
                  {s.members[0] && (
                    <figure className="m-0 flex flex-col gap-1.5">
                      <figcaption className="text-sm text-neutral-700 m-0">Así lo recibirá {nameOf(s.members[0].id, s.members[0].name)}:</figcaption>
                      <pre className="setup-message">{renderMessage(DEFAULT_PORTFOLIO_TEMPLATE, { nombre: nameOf(s.members[0].id, s.members[0].name), presidente: firstName(admin.name), familia: s.family.name, mes: monthLabelLong(p.month), titulo: p.title, importe: eur(p.allocations.find((a) => a.userId === s.members[0].id)?.amount ?? s.family.monthlyAllowance), opciones: p.options.length, minimo: p.minChoices, maximo: p.maxChoices, plazo: p.deadline ? `hasta el ${fmtDate(p.deadline)}` : "", enlace: `${appUrl()}/cartera` })}</pre>
                    </figure>
                  )}
                  {s.members.length > 0 ? <PrepareNoticesButton portfolioId={p.id} /> : <p className="m-0 text-sm text-neutral-700">Todavía no ha entrado nadie más en el club. Cuando entren, vuelve a este paso. <Link href="/empezar?paso=hijos" className="text-accent-700">Ver invitaciones</Link></p>}
                </>
              ) : (
                <>
                  <p className="m-0 max-w-[64ch] [text-wrap:pretty]">Los mensajes están listos. Pulsa «Enviar por WhatsApp» en cada uno: se abre WhatsApp con el texto escrito y tú solo das a enviar.</p>
                  <ul className="m-0 p-0 list-none flex flex-col">
                    {s.communication.recipients.map((r) => (
                      <li key={r.userId} className="setup-row flex-wrap">
                        <span className={`setup-dot ${r.openedAt ? "is-done" : ""}`} aria-hidden="true">{r.openedAt ? <Check /> : null}</span>
                        <span className="min-w-0 flex-1"><b>{r.name}</b> <span className="text-sm text-neutral-700">{r.phone ? formatPhone(r.phone) : "sin móvil: copia el texto"}</span></span>
                        <span className="inline-flex flex-wrap items-center gap-2">
                          {r.phone && <WhatsAppSendButton communicationId={s.communication!.id} userId={r.userId} phone={r.phone} text={r.text} openedAt={r.openedAt} />}
                          <CopyText text={r.text} label="Copiar texto" />
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="m-0 text-sm"><Link href={`/comunicaciones?c=${s.communication.id}`} className="text-accent-700">Mensaje para el grupo de la familia y avisos guardados →</Link></p>
                </>
              )}
              <Why>Pídeles una sola cosa: que escriban su porqué. No hace falta que acierten. Lo que cada uno explique hoy es lo que leeréis juntos en el repaso, y lo que de verdad les hace mejores inversores.</Why>
            </>
          )}

          {step.id === "deciden" && (
            <>
              {!p || p.status === "DRAFT" ? (
                <p className="m-0">Primero publica la cartera. <Link href="/empezar?paso=publicar" className="text-accent-700">Ir al paso 4</Link></p>
              ) : (
                <>
                  <p className="m-0 max-w-[64ch] [text-wrap:pretty]">{p.deadline ? `Pueden decidir hasta el ${fmtDate(p.deadline)}.` : "La cartera está abierta sin fecha límite."} Así va la familia:</p>
                  <ul className="m-0 p-0 list-none flex flex-col">
                    {p.allocations.filter((a) => a.amount > 0).map((a) => {
                      const d = p.decisions.find((x) => x.userId === a.userId);
                      const me = a.userId === admin.id;
                      return (
                        <li key={a.userId} className="setup-row flex-wrap">
                          <span className={`setup-dot ${d ? "is-done" : ""}`} aria-hidden="true">{d ? <Check /> : null}</span>
                          <span className="min-w-0 flex-1"><b>{me ? `${firstName(admin.name)} (tú)` : nameOf(a.userId, a.user.name)}</b> <span className="text-sm text-neutral-700">{d ? `decidió el ${fmtDate(d.submittedAt)}: ${d.choices.map((c) => c.option.symbol).join(", ")}` : "aún no ha decidido"}</span></span>
                          {me && !d && p.status === "PUBLISHED" && <Link href="/cartera" className="btn-secondary py-1 text-xs">Decidir lo mío</Link>}
                        </li>
                      );
                    })}
                  </ul>
                  <div className="setup-tips">
                    <div className="font-heading font-bold text-[15px]">Cómo acompañar sin decidir por ellos</div>
                    <ul className="m-0 mt-2 pl-5 list-disc flex flex-col gap-1.5 text-sm text-neutral-800">
                      <li>No les digas qué elegir. Pregunta: «¿qué has mirado?» y «¿qué te haría vender?».</li>
                      <li>Si dudan, que abran la ficha de cada opción y pulsen «¿Qué mide?» en la lectura del Club.</li>
                      <li>Decide tú también, pero sin enseñar tu elección: los demás la verán al enviar la suya.</li>
                    </ul>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href="/cartera" className="btn-secondary">Ver la cartera como la ven ellos</Link>
                    {p.status === "PUBLISHED" && <Link href={`/cartera/gestion/${p.id}#plazo`} className="btn-ghost">Ampliar el plazo</Link>}
                  </div>
                </>
              )}
              <Why>Este es el momento en el que aprenden: investigar, dudar y poner por escrito una decisión con su dinero. Cuanto menos les guíes hacia una respuesta, más suyo será el porqué.</Why>
            </>
          )}

          {step.id === "repaso" && (
            <>
              {!p || p.status === "DRAFT" ? (
                <p className="m-0">El repaso llega cuando la cartera se ha publicado y la familia ha decidido. <Link href="/empezar" className="text-accent-700">Volver al paso pendiente</Link></p>
              ) : p.status === "PUBLISHED" ? (
                <>
                  <p className="m-0 max-w-[64ch] [text-wrap:pretty]">Cuando termine el plazo, o cuando hayan decidido todos, cierra la cartera: se archiva y se abre su repaso, con lo que eligió cada uno, cómo le ha ido y su porqué.</p>
                  {(() => {
                    const pending = p.allocations.filter((a) => a.amount > 0 && !p.decisions.some((d) => d.userId === a.userId));
                    return pending.length > 0 && !(p.deadline && p.deadline.getTime() < Date.now()) ? <p className="m-0 text-sm" style={{ color: "var(--color-amber-700)" }}>{pending.map((a) => a.userId === admin.id ? "tú" : nameOf(a.userId, a.user.name)).join(", ")} {pending.length === 1 ? "no ha decidido" : "no han decidido"} todavía. Mejor espera al final del plazo.</p> : null;
                  })()}
                  <form action={closeForReviewAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <ConfirmButton className="btn-primary" message="¿Cerrar la cartera y abrir el repaso? Quien no haya decidido ya no podrá hacerlo (podrás reabrirla si hace falta).">Cerrar la cartera y abrir el repaso</ConfirmButton>
                  </form>
                </>
              ) : (
                <>
                  <p className="m-0 max-w-[64ch] [text-wrap:pretty]">«{p.title}» está cerrada y su repaso está listo. Reuníos un rato, abridlo en una pantalla grande y seguid estos cuatro pasos.</p>
                  <div><Link href={`/cartera/historial/${p.id}#repaso-familia`} className="btn-primary">Abrir el repaso</Link></div>
                </>
              )}
              <div className="flex flex-col gap-2">
                <h3 className="m-0 text-[18px]">Cómo hacer el repaso en familia</h3>
                <FamilyReviewGuide />
              </div>
              <Why>Acertar es suerte; explicar es aprender. El repaso separa las dos cosas: quién ganó más este mes importa poco, quién lo pensó mejor importa mucho. Es la conversación que convierte una paga en criterio.</Why>
            </>
          )}

          <footer className="setup-footer">
            {prev ? <Link href={`/empezar?paso=${prev.id}`} className="btn-ghost">← {prev.title}</Link> : <span />}
            {next ? (
              <Link href={`/empezar?paso=${next.id}`} className={step.done ? "btn-primary" : "btn-secondary"}>{step.done ? `Siguiente: ${next.title}` : "Saltar por ahora"} →</Link>
            ) : s.complete ? (
              <Link href="/cartera/gestion" className="btn-primary">Preparar la cartera del mes que viene →</Link>
            ) : (
              <Link href="/inicio" className="btn-secondary">Ir a Inicio</Link>
            )}
          </footer>
        </section>
      </div>
    </div>
  );
}
