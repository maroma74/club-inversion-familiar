"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { submitDecisionAction } from "@/app/actions/monthly";
import { eur } from "@/lib/format";

type Opt = { id: string; symbol: string; name: string; kind: string; note: string | null; price: number | null; href: string; signal: string | null };
type Step = 1 | 2 | 3;
type Draft = { step: Step; allocation: number; picked: string[]; amounts: Record<string, string>; whys: Record<string, string>; exits: Record<string, string>; argument: string; manual: boolean };

const MIN_WHY = 10;
const MIN_ARGUMENT = 20;
// Mismos límites que aplica el servidor: así nada se recorta sin que el usuario lo sepa.
const MAX_WHY = 2000;
const MAX_EXIT = 1000;
const MAX_ARGUMENT = 4000;
const STEPS = ["Elige y reparte", "Explica", "Revisa y envía"];

const kindLabel = (k: string) => (k === "ETF" ? "ETF" : k === "CRYPTO" ? "cripto" : k === "COMMODITY" ? "materia prima" : "acción");
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Interpreta «1.000,50», «1.000», «12,5» o «12.5». Devuelve null si no es un número claro. */
function parseAmount(s: string | undefined): number | null {
  const t = (s ?? "").trim().replace(/\s/g, "");
  if (!t) return 0;
  let norm: string;
  if (t.includes(",")) {
    // Con coma decimal, los puntos solo pueden ser separadores de miles y van antes de la coma.
    if (t.lastIndexOf(".") > t.lastIndexOf(",") || t.split(",").length > 2) return null;
    norm = t.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
    norm = t.replace(/\./g, ""); // «1.000» son mil
  } else {
    norm = t;
  }
  if (!/^\d+(\.\d+)?$/.test(norm)) return null;
  const n = Number(norm);
  return Number.isFinite(n) ? n : null;
}
const num = (s: string | undefined) => parseAmount(s) ?? 0;
/** Los importes se muestran con coma decimal, como se escriben en España. */
const show = (n: number) => String(n).replace(".", ",");

type Values = { allocation: number; minChoices: number; opts: Opt[]; picked: string[]; amounts: Record<string, string>; whys: Record<string, string>; argument: string };

/** Qué falta en el paso 1 (null si está completo). */
function problemStep1({ allocation, minChoices, opts, picked, amounts }: Values, single: boolean): string | null {
  const pk = opts.filter((o) => picked.includes(o.id));
  if (picked.length < minChoices) return single ? "Elige una opción para continuar." : `Elige al menos ${minChoices} ${minChoices === 1 ? "opción" : "opciones"} para continuar.`;
  const bad = pk.find((o) => parseAmount(amounts[o.id]) === null);
  if (bad) return `Escribe el importe de ${bad.symbol} solo con cifras y una coma, por ejemplo 12,50.`;
  const empty = pk.find((o) => num(amounts[o.id]) < 0.01);
  if (empty) return `Indica cuánto pones en ${empty.symbol} (al menos 0,01 €).`;
  const rest = round2(allocation - pk.reduce((s, o) => s + num(amounts[o.id]), 0));
  if (rest < -0.01) return `Te pasas ${eur(-rest)} de tu importe: baja algún importe.`;
  return null;
}

/** Qué falta en el paso 2 (null si está completo). */
function problemStep2({ opts, picked, whys, argument }: Values): string | null {
  const short = opts.filter((o) => picked.includes(o.id)).find((o) => (whys[o.id] ?? "").trim().length < MIN_WHY);
  if (short) return `Cuenta por qué eliges ${short.symbol}: faltan ${MIN_WHY - (whys[short.id] ?? "").trim().length} letras.`;
  if (argument.trim().length < MIN_ARGUMENT) return `Falta tu idea general: faltan ${MIN_ARGUMENT - argument.trim().length} letras.`;
  return null;
}

export function DecisionForm({ portfolioId, userId, options, allocation, minChoices, maxChoices }: { portfolioId: string; userId: string; options: Opt[]; allocation: number; minChoices: number; maxChoices: number }) {
  const [state, action, pending] = useActionState(submitDecisionAction, undefined);
  const [step, setStep] = useState<Step>(1);
  const [picked, setPicked] = useState<string[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [whys, setWhys] = useState<Record<string, string>>({});
  const [exits, setExits] = useState<Record<string, string>>({});
  const [argument, setArgument] = useState("");
  const [manual, setManual] = useState(false);
  const [ready, setReady] = useState(false);
  const restored = useRef(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [dismissed, setDismissed] = useState<unknown>(null);
  const single = maxChoices === 1;
  const draftKey = `cartera-borrador:${portfolioId}:${userId}`;

  // Recupera el borrador de este dispositivo una sola vez, y solo lo que sigue siendo válido:
  // si el importe asignado cambió se descarta, y el paso se limita a lo que de verdad está completo.
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const raw = window.localStorage.getItem(draftKey);
      if (raw) {
        const d = JSON.parse(raw) as Partial<Draft>;
        if (d.allocation === allocation) {
          const valid = (d.picked ?? []).filter((id) => options.some((o) => o.id === id)).slice(0, maxChoices);
          const v: Values = { allocation, minChoices, opts: options, picked: valid, amounts: d.amounts ?? {}, whys: d.whys ?? {}, argument: d.argument ?? "" };
          const target: Step = d.step === 2 || d.step === 3 ? d.step : 1;
          setPicked(valid);
          setAmounts(v.amounts);
          setWhys(v.whys);
          setExits(d.exits ?? {});
          setArgument(v.argument);
          setManual(!!d.manual);
          setStep(problemStep1(v, maxChoices === 1) ? 1 : target === 3 && problemStep2(v) ? 2 : target);
        } else {
          window.localStorage.removeItem(draftKey);
        }
      }
    } catch {
      /* sin almacenamiento: el formulario funciona igual, sin borrador */
    }
    setReady(true);
  }, [draftKey, allocation, options, maxChoices, minChoices]);

  // Guarda el borrador en cada cambio, para que un fallo, una recarga o cerrar la pestaña no pierdan lo escrito.
  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(draftKey, JSON.stringify({ step, allocation, picked, amounts, whys, exits, argument, manual } satisfies Draft));
    } catch {
      /* ignorar */
    }
  }, [ready, draftKey, step, allocation, picked, amounts, whys, exits, argument, manual]);

  useEffect(() => {
    if (state?.ok) {
      try {
        window.localStorage.removeItem(draftKey);
      } catch {
        /* ignorar */
      }
    }
  }, [state, draftKey]);

  // Al fallar el envío, el aviso recibe el foco para que se anuncie y se vea.
  useEffect(() => {
    if (state?.error) errorRef.current?.focus();
  }, [state]);

  function equalSplit(ids: string[]) {
    const share = ids.length ? Math.floor((allocation / ids.length) * 100) / 100 : 0;
    const a: Record<string, string> = {};
    ids.forEach((x, i) => (a[x] = show(i === ids.length - 1 ? round2(allocation - share * (ids.length - 1)) : share)));
    return a;
  }

  function toggle(id: string) {
    if (single) {
      // Con una sola opción posible, el importe es siempre todo lo asignado.
      setPicked([id]);
      setAmounts({ [id]: show(allocation) });
      return;
    }
    let next: string[];
    if (picked.includes(id)) next = picked.filter((x) => x !== id);
    else if (picked.length >= maxChoices) return;
    else next = [...picked, id];
    setPicked(next);
    // Reparto a partes iguales mientras no hayas tocado ningún importe; después se respeta lo que escribiste.
    setAmounts(manual ? Object.fromEntries(next.map((x) => [x, amounts[x] ?? ""])) : equalSplit(next));
  }

  function resetDraft() {
    if (!window.confirm("¿Borrar lo que has escrito y empezar de nuevo?")) return;
    setStep(1);
    setPicked([]);
    setAmounts({});
    setWhys({});
    setExits({});
    setArgument("");
    setManual(false);
    try {
      window.localStorage.removeItem(draftKey);
    } catch {
      /* ignorar */
    }
  }

  const values: Values = { allocation, minChoices, opts: options, picked, amounts, whys, argument };
  const total = round2(picked.reduce((s, id) => s + num(amounts[id]), 0));
  const remaining = round2(allocation - total);
  const over = remaining < -0.01;
  const pickedOpts = options.filter((o) => picked.includes(o.id));
  const step1Problem = problemStep1(values, single);
  const step2Problem = problemStep2(values);
  const problem = step === 1 ? step1Problem : step === 2 ? step2Problem : step1Problem ?? step2Problem;
  const problemStepTarget: Step = step1Problem ? 1 : 2;

  function go(to: Step) {
    setStep(to);
    if (state?.error) setDismissed(state); // un error viejo no debe seguir visible en otro paso
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    topRef.current?.scrollIntoView({ block: "start", behavior: calm ? "auto" : "smooth" });
    // El botón pulsado desaparece al cambiar de paso: el foco pasa al título para no perder el sitio.
    window.requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
  }

  if (!ready) return <p className="m-0 text-sm text-neutral-700" aria-busy="true">Preparando tu decisión…</p>;

  return (
    <form
      action={action}
      className="flex flex-col gap-5"
      onKeyDown={(e) => {
        // Enter dentro de un campo no debe enviar la cartera antes de la revisión.
        if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") e.preventDefault();
      }}
    >
      <input type="hidden" name="portfolioId" value={portfolioId} />
      <input type="hidden" name="argument" value={argument} />
      {pickedOpts.map((o) => (
        <span key={o.id} hidden>
          <input type="hidden" name={`pick_${o.id}`} value="on" />
          <input type="hidden" name={`amount_${o.id}`} value={String(round2(num(amounts[o.id])))} />
          <input type="hidden" name={`why_${o.id}`} value={whys[o.id] ?? ""} />
          <input type="hidden" name={`exit_${o.id}`} value={exits[o.id] ?? ""} />
        </span>
      ))}

      <div ref={topRef} className="scroll-mt-20 flex flex-col gap-2">
        <h3 ref={headingRef} tabIndex={-1} className="m-0 outline-none">Tu decisión <span className="text-base font-normal text-neutral-700">· paso {step} de 3</span></h3>
        <ol aria-label="Pasos de tu decisión" className="m-0 p-0 list-none flex flex-wrap gap-2 text-sm">
          {STEPS.map((label, i) => {
            const n = (i + 1) as Step;
            return (
              <li key={label} aria-current={step === n ? "step" : undefined} className={`tag ${step === n ? "tag-ink" : n < step ? "tag-accent" : "tag-neutral"}`} style={{ fontSize: 14, padding: "4px 12px" }}>
                {n}. {label}
              </li>
            );
          })}
        </ol>
        <p className="m-0 text-sm text-neutral-700">
          Tu borrador se guarda solo en este dispositivo: puedes salir a investigar y volver.{" "}
          {(picked.length > 0 || argument.trim()) && <button type="button" className="btn-ghost" onClick={resetDraft}>Empezar de nuevo</button>}
        </p>
      </div>

      {step === 1 && (
        <fieldset className="m-0 p-0 border-0 min-w-0 flex flex-col gap-3">
          <legend className="p-0 mb-1 text-base">
            {single ? "Elige una opción" : `Elige entre ${minChoices} y ${maxChoices} opciones`} y decide cuánto pones en cada una. Tienes <b>{eur(allocation)}</b>.
          </legend>
          {!single && (
            <div className="bar" role="progressbar" aria-label="Importe repartido" aria-valuemin={0} aria-valuemax={allocation} aria-valuenow={Math.min(Math.max(total, 0), allocation)} aria-valuetext={`${eur(total)} de ${eur(allocation)}`}>
              <span style={{ width: `${allocation > 0 ? Math.min(100, Math.max(0, (total / allocation) * 100)) : 0}%` }} />
            </div>
          )}
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))" }}>
            {options.map((o) => {
              const on = picked.includes(o.id);
              const full = !single && !on && picked.length >= maxChoices;
              return (
                <div key={o.id} className="card card-snug gap-2" style={{ borderColor: on ? "var(--color-accent)" : "var(--color-divider)", opacity: full ? 0.6 : 1 }}>
                  <label className={`flex items-start gap-3 min-h-[44px] ${full ? "cursor-not-allowed" : "cursor-pointer"}`}>
                    <input type={single ? "radio" : "checkbox"} name={single ? "eleccion" : undefined} checked={on} disabled={full} onChange={() => toggle(o.id)} className="mt-1 w-5 h-5 shrink-0 accent-[#047857]" />
                    <span className="min-w-0">
                      <span className="font-heading text-lg">{o.symbol}</span> <span className="tag tag-neutral ml-1">{kindLabel(o.kind)}</span>
                      {on && <span className="tag tag-accent ml-1">Elegida</span>}
                      <span className="block text-sm text-neutral-700">{o.name}{o.price !== null ? ` · ${eur(o.price)}` : ""}</span>
                    </span>
                  </label>
                  {o.signal && <div className="text-sm text-neutral-700">{o.signal}</div>}
                  {o.note && <div className="text-sm [text-wrap:pretty]">{o.note}</div>}
                  <div>
                    <a href={o.href} target="_blank" rel="noreferrer" className="btn-ghost" style={{ minHeight: 44 }}>Analizar {o.symbol}<span className="sr-only"> (se abre en otra pestaña)</span></a>
                  </div>
                  {on && !single && (
                    <div className="field border-t border-divider pt-2">
                      <label htmlFor={`importe-${o.id}`} className="text-sm text-[var(--color-text)]">Importe en € para {o.symbol}</label>
                      <input
                        id={`importe-${o.id}`}
                        inputMode="decimal"
                        autoComplete="off"
                        className="input"
                        value={amounts[o.id] ?? ""}
                        onChange={(e) => {
                          setManual(true);
                          setAmounts((a) => ({ ...a, [o.id]: e.target.value }));
                        }}
                      />
                    </div>
                  )}
                  {on && single && <div className="text-sm border-t border-divider pt-2">Pondrás todo tu importe: <b>{eur(allocation)}</b>.</div>}
                </div>
              );
            })}
          </div>
          {picked.length > 1 && (
            <div>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setManual(false);
                  setAmounts(equalSplit(picked));
                }}
              >
                Repartir a partes iguales
              </button>
            </div>
          )}
          {!single && picked.length >= maxChoices && <p className="m-0 text-sm text-neutral-700">Ya has elegido el máximo ({maxChoices}). Quita una para elegir otra.</p>}
        </fieldset>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <p className="m-0 text-base text-neutral-700">No hay respuestas buenas ni malas: lo que importa es que expliques lo que has pensado. Después podrás revisarlo.</p>
          {pickedOpts.map((o) => {
            const len = (whys[o.id] ?? "").trim().length;
            return (
              <div key={o.id} className="card card-snug gap-3">
                <div className="font-heading text-lg">{o.symbol} · <span className="text-base font-medium">{eur(num(amounts[o.id]))}</span></div>
                {o.note && <div className="text-sm text-neutral-700">Para investigar: {o.note}</div>}
                <div className="field">
                  <label htmlFor={`why-${o.id}`} className="text-sm text-[var(--color-text)]">¿Por qué eliges {o.symbol}?</label>
                  <textarea
                    id={`why-${o.id}`}
                    className="input"
                    style={{ minHeight: 90 }}
                    maxLength={MAX_WHY}
                    aria-describedby={`why-ayuda-${o.id}`}
                    value={whys[o.id] ?? ""}
                    onChange={(e) => setWhys((w) => ({ ...w, [o.id]: e.target.value }))}
                  />
                  <div id={`why-ayuda-${o.id}`} className="text-sm text-neutral-700 mt-1">Ejemplo: «Me gusta porque vende cosas que todo el mundo usa y paga dividendo cada año.» {len < MIN_WHY ? `Mínimo ${MIN_WHY} letras (llevas ${len}).` : len > MAX_WHY * 0.9 ? `${len} de ${MAX_WHY} letras como máximo.` : "Listo."}</div>
                </div>
                <div className="field">
                  <label htmlFor={`exit-${o.id}`} className="text-sm text-[var(--color-text)]">¿Qué te haría vender? (opcional)</label>
                  <input id={`exit-${o.id}`} className="input" maxLength={MAX_EXIT} value={exits[o.id] ?? ""} onChange={(e) => setExits((x) => ({ ...x, [o.id]: e.target.value }))} />
                  <div className="text-sm text-neutral-700 mt-1">Un precio, un dato o un plazo. Ejemplo: «Si baja un 20 %» o «dentro de un año».</div>
                </div>
              </div>
            );
          })}
          <div className="field">
            <label htmlFor="argumento" className="text-sm text-[var(--color-text)]">Tu idea general: ¿qué has aprendido de la lección y cómo la aplicas?</label>
            <textarea id="argumento" className="input" style={{ minHeight: 100 }} maxLength={MAX_ARGUMENT} aria-describedby="argumento-ayuda" value={argument} onChange={(e) => setArgument(e.target.value)} />
            <div id="argumento-ayuda" className="text-sm text-neutral-700 mt-1">{argument.trim().length < MIN_ARGUMENT ? `Mínimo ${MIN_ARGUMENT} letras (llevas ${argument.trim().length}).` : argument.length > MAX_ARGUMENT * 0.9 ? `${argument.length} de ${MAX_ARGUMENT} letras como máximo.` : "Listo."}</div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-4">
          <p className="m-0 text-base text-neutral-700">Revisa tu cartera antes de enviarla. Puedes volver atrás para cambiar lo que quieras.</p>
          <div className="flex flex-col gap-3">
            {pickedOpts.map((o) => (
              <div key={o.id} className="card card-snug gap-1.5">
                <div className="flex justify-between items-baseline gap-2 flex-wrap">
                  <div className="font-heading text-lg">{o.symbol} <span className="text-base font-medium text-neutral-700">{o.name}</span></div>
                  <b className="tabular-nums">{eur(num(amounts[o.id]))}</b>
                </div>
                <div className="text-base [text-wrap:pretty]">“{(whys[o.id] ?? "").trim()}”</div>
                {(exits[o.id] ?? "").trim() && <div className="text-sm text-neutral-700">Vendería si: {exits[o.id].trim()}</div>}
              </div>
            ))}
            <div className="card card-snug gap-1.5">
              <div className="card-kicker">Tu idea general</div>
              <div className="text-base [text-wrap:pretty]">“{argument.trim()}”</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={() => go(1)}>Cambiar importes</button>
            <button type="button" className="btn-secondary" onClick={() => go(2)}>Cambiar mis explicaciones</button>
          </div>
          <p className="m-0 text-base [text-wrap:pretty]">
            Repartido <b>{eur(total)}</b> de <b>{eur(allocation)}</b>.{" "}
            {remaining > 0.01 ? `Los ${eur(remaining)} que no repartas se quedan como efectivo.` : "Has repartido todo tu importe."}
          </p>
          <p className="m-0 text-base [text-wrap:pretty]">
            Cuando la envíes <b>no podrás cambiarla</b>. Se anotará en tu cartera y en tu diario con el precio de ese momento.
          </p>
        </div>
      )}

      {state?.error && dismissed !== state && (
        <p ref={errorRef} tabIndex={-1} role="alert" className="m-0 text-base font-medium p-3 border border-divider rounded-[10px]" style={{ background: "var(--color-amber-100)", color: "var(--color-amber-700)" }}>
          {state.error} <span className="font-normal">Tus respuestas siguen aquí: puedes volver a intentarlo.</span>
        </p>
      )}
      {state?.ok && <p role="status" className="m-0 text-base text-accent-700">{state.ok}</p>}

      <div className="sticky bottom-3 z-10 card card-snug gap-2" style={{ boxShadow: "var(--shadow-md)" }}>
        {step === 1 && !single && (
          <div className="text-sm flex flex-wrap items-center gap-x-2 gap-y-1">
            {/* Aviso hablado solo cuando cambia el estado (te pasas / todo repartido), no en cada tecla */}
            <span className="sr-only" role="status">{over ? "Te pasas de tu importe" : picked.length > 0 && remaining <= 0.01 ? "Todo repartido" : ""}</span>
            <span>Repartido <b className="tabular-nums">{eur(total)}</b> de <b className="tabular-nums">{eur(allocation)}</b></span>
            {over ? (
              <span className="tag tag-gold">Te pasas {eur(-remaining)}</span>
            ) : remaining > 0.01 ? (
              <span>· Faltan <b className="tabular-nums">{eur(remaining)}</b></span>
            ) : picked.length > 0 ? (
              <span className="tag tag-accent">Todo repartido</span>
            ) : null}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {step > 1 && (
            <button type="button" className="btn-secondary" onClick={() => go((step - 1) as Step)}>Atrás</button>
          )}
          {step === 1 && (
            <button type="button" className="btn-primary" disabled={!!step1Problem} aria-describedby={problem ? "problema-paso" : undefined} onClick={() => go(2)}>Siguiente: explica tus elecciones</button>
          )}
          {step === 2 && (
            <button type="button" className="btn-primary" disabled={!!step2Problem} aria-describedby={problem ? "problema-paso" : undefined} onClick={() => go(3)}>Siguiente: revisar</button>
          )}
          {step === 3 && (
            <button type="submit" className="btn-primary" disabled={pending || !!problem} aria-describedby={problem ? "problema-paso" : undefined}>{pending ? "Registrando tu cartera…" : "Enviar mi cartera"}</button>
          )}
          {problem && (
            <span id="problema-paso" className="text-sm text-neutral-700">
              {problem}
              {step === 3 && <> <button type="button" className="btn-ghost" onClick={() => go(problemStepTarget)}>Ir al paso {problemStepTarget}</button></>}
            </span>
          )}
        </div>
      </div>
    </form>
  );
}
